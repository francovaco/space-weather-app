"""
Prediction logic: loads ONNX model and fetches live NOAA data.
Uses onnxruntime for inference (no PyTorch needed at runtime).
Falls back to rule-based prediction when the model is not available.
"""
import asyncio
import json
import logging
import math
from pathlib import Path
from typing import Optional

import httpx
import numpy as np

logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "weights"
ONNX_PATH = WEIGHTS_DIR / "kp_lstm.onnx"
NORMS_PATH = WEIGHTS_DIR / "norms.json"

SEQ_LEN = 24
NOAA_BZ_URL = "https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json"
NOAA_PLASMA_URL = "https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json"
NOAA_KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"

DEFAULT_NORM = {
    "bz_mean": 0.0, "bz_std": 8.0,
    "wind_mean": 450.0, "wind_std": 100.0,
    "kp_mean": 2.0, "kp_std": 2.0,
}


class KpPredictor:
    def __init__(self):
        self._session = None
        self._norm: dict = DEFAULT_NORM
        self._model_version: Optional[str] = None
        self._trained_at: Optional[str] = None
        self._load_model()

    def _load_model(self):
        if not ONNX_PATH.exists():
            logger.info("No ONNX model found at %s — using rule-based fallback", ONNX_PATH)
            return
        try:
            import onnxruntime as ort
            self._session = ort.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
            if NORMS_PATH.exists():
                with open(NORMS_PATH) as f:
                    data = json.load(f)
                self._norm = {k: v for k, v in data.items() if k in DEFAULT_NORM}
                self._model_version = data.get("version")
                self._trained_at = data.get("trained_at")
            logger.info("Loaded ONNX model v%s (trained %s)", self._model_version, self._trained_at)
        except Exception as exc:
            logger.warning("Failed to load ONNX model: %s — using fallback", exc)
            self._session = None

    def _normalise(self, bz: float, wind: float, kp: float) -> list[float]:
        n = self._norm
        return [
            (bz - n["bz_mean"]) / n["bz_std"],
            (wind - n["wind_mean"]) / n["wind_std"],
            (kp - n["kp_mean"]) / n["kp_std"],
        ]

    def _denorm_kp(self, val: float) -> float:
        return float(np.clip(val * self._norm["kp_std"] + self._norm["kp_mean"], 0, 9))

    async def _fetch_live_sequence(self) -> Optional[list[list[float]]]:
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

        bz_series: dict[str, float] = {}
        bz_raw = safe_json(bz_r)
        if isinstance(bz_raw, list) and len(bz_raw) > 1:
            for row in bz_raw[1:]:
                try:
                    if row[0] is not None and row[3] is not None:
                        bz_series[row[0]] = float(row[3])
                except (IndexError, ValueError, TypeError):
                    pass

        plasma_series: dict[str, float] = {}
        plasma_raw = safe_json(plasma_r)
        if isinstance(plasma_raw, list) and len(plasma_raw) > 1:
            for row in plasma_raw[1:]:
                try:
                    if row[0] is not None and row[2] is not None:
                        plasma_series[row[0]] = float(row[2])
                except (IndexError, ValueError, TypeError):
                    pass

        kp_series: dict[str, float] = {}
        kp_raw = safe_json(kp_r)
        if isinstance(kp_raw, list):
            for item in kp_raw:
                try:
                    kp_series[item["time_tag"]] = float(item["estimated_kp"])
                except (KeyError, ValueError, TypeError):
                    pass

        if not bz_series or not plasma_series:
            return None

        common = sorted(set(bz_series) & set(plasma_series))[-SEQ_LEN * 2:]
        seq = []
        last_kp = 1.0
        for t in common:
            bz = bz_series[t]
            wind = plasma_series[t]
            kp = kp_series.get(t, last_kp)
            last_kp = kp
            if not (math.isnan(bz) or math.isnan(wind)):
                seq.append(self._normalise(bz, wind, kp))
            if len(seq) >= SEQ_LEN:
                break

        if len(seq) < SEQ_LEN:
            seq = [[0.0, 0.0, 0.0]] * (SEQ_LEN - len(seq)) + seq

        return seq[-SEQ_LEN:]

    async def predict(self) -> dict:
        seq = await self._fetch_live_sequence()

        if self._session is not None and seq is not None:
            try:
                x = np.array([seq], dtype=np.float32)  # (1, SEQ_LEN, 3)
                out = self._session.run(["output"], {"input": x})[0][0]  # (3,)
                return {
                    "available": True,
                    "predictions": [
                        {"horizon_hours": 1, "predicted_kp": round(self._denorm_kp(float(out[0])), 1), "confidence": 0.78, "method": "lstm"},
                        {"horizon_hours": 3, "predicted_kp": round(self._denorm_kp(float(out[1])), 1), "confidence": 0.63, "method": "lstm"},
                        {"horizon_hours": 6, "predicted_kp": round(self._denorm_kp(float(out[2])), 1), "confidence": 0.48, "method": "lstm"},
                    ],
                    "model_version": self._model_version,
                    "trained_at": self._trained_at,
                }
            except Exception as exc:
                logger.warning("ONNX inference failed: %s — falling back to rule-based", exc)

        # Rule-based fallback
        if seq is not None:
            n = self._norm
            bz = seq[-1][0] * n["bz_std"] + n["bz_mean"]
            wind = seq[-1][1] * n["wind_std"] + n["wind_mean"]
            kp_now = seq[-1][2] * n["kp_std"] + n["kp_mean"]
        else:
            bz, wind, kp_now = 0.0, 450.0, 1.0

        return {
            "available": True,
            "predictions": _rule_based(bz, wind, kp_now),
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
