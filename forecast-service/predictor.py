"""
Prediction logic: loads trained LSTM model and fetches live NOAA data.
Falls back to rule-based prediction when the model is not available.
"""
import os
import math
import asyncio
import logging
from pathlib import Path
from typing import Optional
import httpx
import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "weights" / "kp_lstm.pt"
SEQ_LEN = 24          # 24 × 1-minute readings → 24-minute window
NOAA_BZ_URL = "https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json"
NOAA_PLASMA_URL = "https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json"
NOAA_KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"

# Normalisation constants (fit on training data, update after re-training)
NORM = {
    "bz_mean": 0.0, "bz_std": 8.0,
    "wind_mean": 450.0, "wind_std": 100.0,
    "kp_mean": 2.0, "kp_std": 2.0,
}


def _normalise(bz: float, wind: float, kp: float) -> list[float]:
    return [
        (bz - NORM["bz_mean"]) / NORM["bz_std"],
        (wind - NORM["wind_mean"]) / NORM["wind_std"],
        (kp - NORM["kp_mean"]) / NORM["kp_std"],
    ]


def _denormalise_kp(val: float) -> float:
    return float(np.clip(val * NORM["kp_std"] + NORM["kp_mean"], 0, 9))


class KpPredictor:
    def __init__(self):
        self._model = None
        self._model_version: Optional[str] = None
        self._trained_at: Optional[str] = None
        self._load_model()

    def _load_model(self):
        if not MODEL_PATH.exists():
            logger.info("No trained model found at %s — using rule-based fallback", MODEL_PATH)
            return
        try:
            import torch
            from model import KpLSTM

            checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
            net = KpLSTM()
            net.load_state_dict(checkpoint["model_state_dict"])
            net.eval()
            self._model = net
            self._model_version = checkpoint.get("version", "1.0")
            self._trained_at = checkpoint.get("trained_at", None)
            logger.info("Loaded LSTM model v%s (trained %s)", self._model_version, self._trained_at)
        except Exception as exc:
            logger.warning("Failed to load LSTM model: %s — using fallback", exc)
            self._model = None

    async def _fetch_live_sequence(self) -> Optional[list[list[float]]]:
        """Download the last SEQ_LEN minutes of [bz, wind_speed, kp] data."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                bz_r, plasma_r, kp_r = await asyncio.gather(
                    client.get(NOAA_BZ_URL),
                    client.get(NOAA_PLASMA_URL),
                    client.get(NOAA_KP_URL),
                    return_exceptions=True,
                )
            except Exception as exc:
                logger.warning("Error fetching live data: %s", exc)
                return None

        def safe_json(resp):
            try:
                return resp.json() if not isinstance(resp, Exception) else None
            except Exception:
                return None

        bz_raw = safe_json(bz_r)
        plasma_raw = safe_json(plasma_r)
        kp_raw = safe_json(kp_r)

        # Parse Bz (array of arrays: [time, bx, by, bz, bt, lat, lon])
        bz_series: dict[str, float] = {}
        if isinstance(bz_raw, list) and len(bz_raw) > 1:
            for row in bz_raw[1:]:
                try:
                    bz_series[row[0]] = float(row[3])
                except (IndexError, ValueError, TypeError):
                    pass

        # Parse plasma (array of arrays: [time, density, speed, temp])
        plasma_series: dict[str, float] = {}
        if isinstance(plasma_raw, list) and len(plasma_raw) > 1:
            for row in plasma_raw[1:]:
                try:
                    plasma_series[row[0]] = float(row[2])
                except (IndexError, ValueError, TypeError):
                    pass

        # Parse Kp 1-minute (array of objects)
        kp_series: dict[str, float] = {}
        if isinstance(kp_raw, list):
            for item in kp_raw:
                try:
                    kp_series[item["time_tag"]] = float(item["estimated_kp"])
                except (KeyError, ValueError, TypeError):
                    pass

        if not bz_series or not plasma_series:
            return None

        # Merge on minute-aligned timestamps — take last SEQ_LEN with all three signals
        common = sorted(set(bz_series) & set(plasma_series))[-SEQ_LEN * 2:]
        seq = []
        last_kp = 1.0
        for t in common:
            bz = bz_series[t]
            wind = plasma_series[t]
            kp = kp_series.get(t, last_kp)
            last_kp = kp
            if not (math.isnan(bz) or math.isnan(wind)):
                seq.append(_normalise(bz, wind, kp))
            if len(seq) >= SEQ_LEN:
                break

        if len(seq) < SEQ_LEN:
            # Pad with zeros if not enough data
            seq = [[0.0, 0.0, 0.0]] * (SEQ_LEN - len(seq)) + seq

        return seq[-SEQ_LEN:]

    async def predict(self) -> dict:
        """Return Kp predictions for +1h, +3h, +6h horizons."""
        seq = await self._fetch_live_sequence()

        if self._model is not None and seq is not None:
            try:
                import torch
                x = torch.tensor([seq], dtype=torch.float32)  # (1, SEQ_LEN, 3)
                with torch.no_grad():
                    out = self._model(x)[0].tolist()  # [kp_1h, kp_3h, kp_6h]

                return {
                    "available": True,
                    "predictions": [
                        {"horizon_hours": 1, "predicted_kp": round(_denormalise_kp(out[0]), 1), "confidence": 0.78, "method": "lstm"},
                        {"horizon_hours": 3, "predicted_kp": round(_denormalise_kp(out[1]), 1), "confidence": 0.63, "method": "lstm"},
                        {"horizon_hours": 6, "predicted_kp": round(_denormalise_kp(out[2]), 1), "confidence": 0.48, "method": "lstm"},
                    ],
                    "model_version": self._model_version,
                    "trained_at": self._trained_at,
                }
            except Exception as exc:
                logger.warning("LSTM inference failed: %s — falling back to rule-based", exc)

        # Rule-based fallback using current conditions
        if seq is not None:
            bz_norm, wind_norm, kp_norm = seq[-1]
            bz = bz_norm * NORM["bz_std"] + NORM["bz_mean"]
            wind = wind_norm * NORM["wind_std"] + NORM["wind_mean"]
            kp_now = kp_norm * NORM["kp_std"] + NORM["kp_mean"]
        else:
            bz, wind, kp_now = 0.0, 450.0, 1.0

        predictions = _rule_based(bz, wind, kp_now)
        return {
            "available": True,
            "predictions": predictions,
            "model_version": None,
            "trained_at": None,
        }


def _rule_based(bz: float, wind: float, kp_now: float) -> list[dict]:
    def estimate(hours: float) -> float:
        if bz < 0:
            injection = abs(bz) * (wind / 400) * 0.1
            kp_max = min(9.0, 1 + abs(bz) * 0.25 * (wind / 400))
            kp = kp_now + injection * math.sqrt(hours) * (1 if kp_max > kp_now else -0.3)
        else:
            kp = kp_now * math.exp(-hours * 0.15)
        return round(float(np.clip(kp, 0, 9)), 1)

    return [
        {"horizon_hours": 1, "predicted_kp": estimate(1), "confidence": 0.65, "method": "rule_based"},
        {"horizon_hours": 3, "predicted_kp": estimate(3), "confidence": 0.50, "method": "rule_based"},
        {"horizon_hours": 6, "predicted_kp": estimate(6), "confidence": 0.38, "method": "rule_based"},
    ]
