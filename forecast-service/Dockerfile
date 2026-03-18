# ============================================================
# forecast-service/Dockerfile — imagen liviana sin PyTorch
# Usa onnxruntime para inferencia (~50 MB vs ~2 GB de torch)
# Imagen final estimada: ~400 MB
# ============================================================
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p weights

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
