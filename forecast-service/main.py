"""
Space Weather Forecast Service
FastAPI microservice for Kp index prediction using LSTM.

Endpoints:
  GET /health   — liveness check
  GET /predict  — Kp predictions for +1h, +3h, +6h
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from predictor import KpPredictor

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

predictor: KpPredictor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    logger.info("Loading Kp predictor…")
    predictor = KpPredictor()
    logger.info("Forecast service ready")
    yield
    logger.info("Forecast service shutting down")


app = FastAPI(title="Space Weather Forecast Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to your Next.js domain in production
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": predictor is not None and predictor._model is not None}


@app.get("/predict")
async def predict():
    if predictor is None:
        return {"available": False, "error": "Service not initialised"}
    return await predictor.predict()
