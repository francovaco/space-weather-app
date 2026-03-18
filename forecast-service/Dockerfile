# ============================================================
# forecast-service/Dockerfile
# Python LSTM space weather forecast microservice
# Deploy to: Railway, Fly.io, Render, or any container host
# ============================================================
FROM python:3.12-slim

# Install only CPU PyTorch (saves ~2 GB vs full CUDA build)
# Override at build time: --build-arg TORCH_INDEX=https://download.pytorch.org/whl/cu121
ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu

WORKDIR /app

# Deps first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url ${TORCH_INDEX} \
    && pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# Pre-create weights dir (populated by train.py or mounted as volume)
RUN mkdir -p weights

EXPOSE 8000

# Uvicorn with 1 worker — stateful model is not fork-safe without custom logic
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
