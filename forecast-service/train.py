"""
Training script for the LSTM Kp predictor.

Downloads historical NOAA/GFZ Kp data and DSCOVR solar wind data,
builds 24-step input sequences, trains the model, and saves weights.

Usage:
    python train.py --epochs 50 --lr 1e-3 --seq-len 24

Requires:
    pip install torch numpy scikit-learn httpx tqdm
"""
import argparse
import asyncio
import json
import logging
import math
import os
from datetime import datetime, timedelta
from pathlib import Path

import httpx
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split

from model import KpLSTM

logging.basicConfig(level=logging.INFO, format="%(levelname)s — %(message)s")
logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "weights"
WEIGHTS_DIR.mkdir(exist_ok=True)

# NOAA 1-minute Kp — covers recent ~7 days
NOAA_KP_1M = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
# GFZ historical Kp (JSON API, 3-hour resolution, decades of data)
GFZ_TEMPLATE = "https://kp.gfz.de/app/json/?start={start}T00%3A00%3A00Z&end={end}T23%3A59%3A59Z&index=Kp"
# NOAA historical DSCOVR
NOAA_DSCOVR_TEMPLATE = "https://services.swpc.noaa.gov/products/solar-wind/mag-{days}-day.json"
NOAA_PLASMA_TEMPLATE = "https://services.swpc.noaa.gov/products/solar-wind/plasma-{days}-day.json"


async def download_kp_history(years: int = 2) -> dict[str, float]:
    """Download historical Kp from GFZ Potsdam."""
    end = datetime.utcnow()
    start = end - timedelta(days=365 * years)
    url = GFZ_TEMPLATE.format(start=start.strftime("%Y-%m-%d"), end=end.strftime("%Y-%m-%d"))
    logger.info("Fetching historical Kp from GFZ (%d years)…", years)
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        raw = r.json()
    result: dict[str, float] = {}
    for dt, kp in zip(raw["datetime"], raw["Kp"]):
        if kp is not None:
            result[dt] = float(kp)
    logger.info("Got %d Kp readings", len(result))
    return result


async def download_recent_bz_plasma() -> tuple[dict[str, float], dict[str, float]]:
    """Download DSCOVR Bz and solar wind speed (7-day window)."""
    logger.info("Fetching recent DSCOVR Bz and plasma (7 days)…")
    async with httpx.AsyncClient(timeout=20.0) as client:
        bz_r, plasma_r = await asyncio.gather(
            client.get(NOAA_DSCOVR_TEMPLATE.format(days=7)),
            client.get(NOAA_PLASMA_TEMPLATE.format(days=7)),
        )
    bz_map: dict[str, float] = {}
    if bz_r.status_code == 200:
        raw = bz_r.json()
        if isinstance(raw, list) and len(raw) > 1:
            for row in raw[1:]:
                try:
                    if row[0] is None or row[3] is None:
                        continue
                    bz_map[row[0]] = float(row[3])
                except (IndexError, ValueError, TypeError):
                    pass
    plasma_map: dict[str, float] = {}
    if plasma_r.status_code == 200:
        raw = plasma_r.json()
        if isinstance(raw, list) and len(raw) > 1:
            for row in raw[1:]:
                try:
                    if row[0] is None or row[2] is None:
                        continue
                    plasma_map[row[0]] = float(row[2])
                except (IndexError, ValueError, TypeError):
                    pass
    logger.info("Got %d Bz readings, %d plasma readings", len(bz_map), len(plasma_map))
    return bz_map, plasma_map


def build_sequences(
    kp_map: dict[str, float],
    bz_map: dict[str, float],
    plasma_map: dict[str, float],
    seq_len: int,
    horizons: list[int] = [1, 3, 6],
    kp_res_hours: float = 3.0,
):
    """
    Build (X, y) tensors.
    X shape: (N, seq_len, 3)  — [bz_norm, wind_norm, kp_norm]
    y shape: (N, 3)           — [kp_1h, kp_3h, kp_6h] normalised

    Since GFZ gives 3-hour Kp and DSCOVR is 1-minute, we interpolate Bz
    and plasma to Kp timestamps.
    """
    # Sort Kp timestamps
    kp_times = sorted(kp_map.keys())
    if len(kp_times) < seq_len + max(horizons) // int(kp_res_hours) + 1:
        raise ValueError("Not enough Kp data to build sequences")

    # Normalisation constants
    all_kp = np.array(list(kp_map.values()))
    kp_mean, kp_std = float(np.mean(all_kp)), max(float(np.std(all_kp)), 0.5)

    # Use fixed Bz/wind norms (or compute from available data)
    bz_vals = np.array(list(bz_map.values())) if bz_map else np.array([0.0])
    bz_mean = float(np.mean(bz_vals))
    bz_std = max(float(np.std(bz_vals)), 1.0)
    plasma_vals = np.array(list(plasma_map.values())) if plasma_map else np.array([450.0])
    wind_mean = float(np.mean(plasma_vals))
    wind_std = max(float(np.std(plasma_vals)), 10.0)

    logger.info("Normalisation — Kp: μ=%.2f σ=%.2f | Bz: μ=%.2f σ=%.2f | Wind: μ=%.2f σ=%.2f",
                kp_mean, kp_std, bz_mean, bz_std, wind_mean, wind_std)

    # Build feature vectors at each Kp timestamp
    def parse_ts(ts: str) -> datetime:
        """Parse any timestamp string to a timezone-aware UTC datetime."""
        ts = ts.strip().replace(" ", "T")
        # Ensure timezone suffix
        if not ts.endswith("Z") and "+" not in ts[10:] and (len(ts) < 22 or ts[19] != "-"):
            ts += "Z"
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))

    def interp_nearest(tmap: dict[str, float], target_ts: str, default: float) -> float:
        if not tmap:
            return default
        try:
            t0 = parse_ts(target_ts)
        except ValueError:
            return default
        best, best_diff = default, float("inf")
        for ts, val in tmap.items():
            try:
                t1 = parse_ts(ts)
                diff = abs((t1 - t0).total_seconds())
                if diff < best_diff:
                    best, best_diff = val, diff
            except ValueError:
                continue
        return best if best_diff < 7200 else default  # within 2h

    records: list[tuple[str, list[float]]] = []
    for ts in kp_times:
        kp = kp_map[ts]
        bz = interp_nearest(bz_map, ts, bz_mean)
        wind = interp_nearest(plasma_map, ts, wind_mean)
        feat = [
            (bz - bz_mean) / bz_std,
            (wind - wind_mean) / wind_std,
            (kp - kp_mean) / kp_std,
        ]
        records.append((ts, feat))

    horizon_steps = [max(1, h // int(kp_res_hours)) for h in horizons]
    max_horizon = max(horizon_steps)

    X_list, y_list = [], []
    for i in range(seq_len, len(records) - max_horizon):
        seq = [r[1] for r in records[i - seq_len: i]]
        targets = []
        for hs in horizon_steps:
            future_idx = i + hs - 1
            if future_idx < len(records):
                future_ts = records[future_idx][0]
                future_kp = (kp_map[future_ts] - kp_mean) / kp_std
            else:
                future_kp = 0.0
            targets.append(future_kp)
        X_list.append(seq)
        y_list.append(targets)

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)
    return X, y, {"kp_mean": kp_mean, "kp_std": kp_std, "bz_mean": bz_mean, "bz_std": bz_std, "wind_mean": wind_mean, "wind_std": wind_std}


def train(
    epochs: int = 50,
    lr: float = 1e-3,
    batch_size: int = 256,
    seq_len: int = 24,
    hidden_size: int = 64,
    num_layers: int = 2,
    dropout: float = 0.2,
    kp_years: int = 2,
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Training on %s", device)

    # Download data
    kp_map = asyncio.run(download_kp_history(kp_years))
    bz_map, plasma_map = asyncio.run(download_recent_bz_plasma())

    # Build sequences (Bz/plasma only cover last 7 days — for longer training we use defaults)
    X, y, norms = build_sequences(kp_map, bz_map, plasma_map, seq_len=seq_len)
    logger.info("Dataset: X=%s y=%s", X.shape, y.shape)

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.15, shuffle=False)

    train_ds = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    val_ds = TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val))
    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_dl = DataLoader(val_ds, batch_size=batch_size)

    model = KpLSTM(input_size=3, hidden_size=hidden_size, num_layers=num_layers, dropout=dropout).to(device)
    optimiser = torch.optim.Adam(model.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimiser, T_max=epochs)
    criterion = nn.MSELoss()

    best_val_loss = float("inf")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for xb, yb in train_dl:
            xb, yb = xb.to(device), yb.to(device)
            optimiser.zero_grad()
            pred = model(xb)
            loss = criterion(pred, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimiser.step()
            train_loss += loss.item() * len(xb)
        train_loss /= len(train_ds)

        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for xb, yb in val_dl:
                xb, yb = xb.to(device), yb.to(device)
                val_loss += criterion(model(xb), yb).item() * len(xb)
        val_loss /= len(val_ds)
        scheduler.step()

        if epoch % 10 == 0 or epoch == 1:
            logger.info("Epoch %d/%d — train=%.4f val=%.4f", epoch, epochs, train_loss, val_loss)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "version": "1.0",
                    "trained_at": datetime.utcnow().isoformat(),
                    "seq_len": seq_len,
                    "norms": norms,
                    "val_loss": best_val_loss,
                },
                WEIGHTS_DIR / "kp_lstm.pt",
            )
    logger.info("Training complete. Best val loss: %.4f. Saved to %s", best_val_loss, WEIGHTS_DIR / "kp_lstm.pt")

    # Export best model to ONNX (used by the service — no PyTorch needed at runtime)
    checkpoint = torch.load(WEIGHTS_DIR / "kp_lstm.pt", map_location="cpu", weights_only=True)
    best_model = KpLSTM(input_size=3, hidden_size=hidden_size, num_layers=num_layers, dropout=0.0)
    best_model.load_state_dict(checkpoint["model_state_dict"])
    best_model.eval()
    dummy_input = torch.zeros(1, seq_len, 3)
    onnx_path = WEIGHTS_DIR / "kp_lstm.onnx"
    torch.onnx.export(
        best_model,
        dummy_input,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=17,
    )
    # Save norms alongside ONNX for the predictor to load
    import json as _json
    with open(WEIGHTS_DIR / "norms.json", "w") as f:
        _json.dump({**norms, "trained_at": checkpoint["trained_at"], "version": checkpoint["version"]}, f)
    logger.info("ONNX model exported to %s", onnx_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train LSTM Kp predictor")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--seq-len", type=int, default=24)
    parser.add_argument("--hidden", type=int, default=64)
    parser.add_argument("--layers", type=int, default=2)
    parser.add_argument("--dropout", type=float, default=0.2)
    parser.add_argument("--kp-years", type=int, default=2)
    args = parser.parse_args()

    train(
        epochs=args.epochs,
        lr=args.lr,
        batch_size=args.batch_size,
        seq_len=args.seq_len,
        hidden_size=args.hidden,
        num_layers=args.layers,
        dropout=args.dropout,
        kp_years=args.kp_years,
    )
