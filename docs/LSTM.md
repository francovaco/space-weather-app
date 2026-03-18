# Prediccion con IA — Modelo LSTM para el indice Kp

## Que es el indice Kp

El **indice Kp** (Planetary K-index) es una escala de 0 a 9 que mide el nivel de perturbacion del campo geomagnetico de la Tierra causado por la actividad solar. Se calcula cada 3 horas como el promedio de 13 estaciones magnetometricas distribuidas globalmente.

| Kp | Nivel | Descripcion |
|----|-------|-------------|
| 0-1 | Quieto | Sin actividad notable |
| 2-3 | Menor | Auroras posibles en latitudes muy altas |
| 4 | G1 | Tormenta menor — auroras visibles en Canada/Escandinavia |
| 5 | G2 | Tormenta moderada — auroras hasta latitudes medias |
| 6-7 | G3-G4 | Tormenta fuerte — posibles disrupciones en GPS/comunicaciones |
| 8-9 | G5 | Tormenta extrema — efectos en redes electricas |

---

## Por que predecir el Kp

Predecir el Kp con anticipacion de 1 a 6 horas permite:

- Alertar a operadores de redes electricas
- Preparar sistemas de GPS de alta precision
- Notificar a astronautas en la ISS sobre radiacion elevada
- Planificar observaciones astronomicas y auroras
- Proteger satelites en orbita

---

## Que es una red LSTM

Una **LSTM (Long Short-Term Memory)** es un tipo especial de red neuronal recurrente (RNN) disenada para aprender dependencias de largo plazo en secuencias de datos.

### El problema de las RNN clasicas

Las RNN clasicas sufren del problema del **desvanecimiento del gradiente**: al entrenar con secuencias largas, el gradiente que propaga el error hacia atras se hace tan pequeno que las capas iniciales dejan de aprender. Esto impide que la red "recuerde" eventos que ocurrieron muchos pasos atras en el tiempo.

### La solucion LSTM: celdas de memoria

Una celda LSTM mantiene un **estado de celda** (cell state) que actua como una "cinta transportadora" que puede transportar informacion a lo largo de toda la secuencia con pocas modificaciones. Las compuertas (gates) controlan que informacion se retiene, se olvida o se escribe:

```
           forget gate    input gate    output gate
                ↓              ↓              ↓
 c(t-1) → [ f gate ] → [ i gate ] → [ o gate ] → h(t)
                            ↑
                     [ update gate ]
```

Las tres compuertas son:

1. **Forget gate** (`f`): decide que informacion del estado anterior se descarta
   - `f = sigmoid(W_f · [h_{t-1}, x_t] + b_f)`

2. **Input gate** (`i`): decide que informacion nueva se almacena
   - `i = sigmoid(W_i · [h_{t-1}, x_t] + b_i)`
   - `g = tanh(W_g · [h_{t-1}, x_t] + b_g)`  (candidatos)
   - `c_t = f * c_{t-1} + i * g`

3. **Output gate** (`o`): decide que parte del estado de celda se expone
   - `o = sigmoid(W_o · [h_{t-1}, x_t] + b_o)`
   - `h_t = o * tanh(c_t)`

Gracias a estas compuertas, las LSTM pueden aprender a recordar patrones que ocurrieron 24, 48 o 72 pasos antes — crucial para el clima espacial donde las tormentas geomagneticas tienen precursores solares que llegan horas antes.

---

## Arquitectura del modelo KpLSTM

```
Entrada: secuencia de 24 pasos x 3 variables
         [Bz_norm, wind_speed_norm, kp_norm]
              ↓
         LSTM Layer 1 (hidden=64, batch_first=True)
              ↓
         LSTM Layer 2 (hidden=64)
              ↓
         Ultimo paso de la secuencia h[-1]
              ↓
         Dropout(0.2)
              ↓
         Capa lineal (64 → 3)
              ↓
Salida: [kp_+1h, kp_+3h, kp_+6h]
```

### Variables de entrada

| Variable | Descripcion | Fuente |
|----------|-------------|--------|
| `Bz` | Componente Z del campo magnetico interplanetario (nT) | DSCOVR/ACE |
| `wind_speed` | Velocidad del viento solar (km/s) | DSCOVR plasma |
| `kp` | Indice Kp actual | NOAA GFZ Kp 1-min |

**Por que estas tres variables:**

- **Bz**: cuando Bz es fuertemente negativo (campo magnetico sur), la reconexion magnetica con el campo terrestre es mas eficiente, lo que causa tormentas geomagneticas. Es el predictor mas importante del Kp.
- **Velocidad del viento solar**: viento mas rapido comprime la magnetosfera mas y aumenta la eficiencia de la transferencia de energia.
- **Kp actual**: la inercia del sistema — una tormenta en curso tiende a continuar.

### Normalizacion

Todas las variables se normalizan con z-score antes de entrar al modelo:

```python
x_norm = (x - mean) / std
```

Los parametros de normalizacion se calculan sobre los datos de entrenamiento y se guardan en `weights/norms.json` para usarlos en inferencia.

---

## Datos de entrenamiento

### Fuentes

| Dataset | Descripcion | Resolucion | Anos disponibles |
|---------|-------------|------------|-----------------|
| GFZ Potsdam Kp | Kp historico definitivo | 3 horas | 1930-presente |
| NOAA DSCOVR Bz | Campo magnetico DSCOVR | 1 minuto | 2016-presente |
| NOAA DSCOVR plasma | Velocidad viento solar | 1 minuto | 2016-presente |

Por defecto el script descarga 2 anos de Kp (GFZ) y 7 dias de Bz/plasma (NOAA). Para periodos mas largos de Bz/plasma se necesita una fuente historica adicional — para el rango reciente, el modelo usa valores por defecto donde no hay datos.

### Construccion de secuencias

Para cada punto en el tiempo `t` en el dataset:

```
X[i] = [[Bz_t-24, wind_t-24, kp_t-24],
         [Bz_t-23, wind_t-23, kp_t-23],
         ...
         [Bz_t-1,  wind_t-1,  kp_t-1]]   ← shape: (24, 3)

y[i] = [kp_t+1, kp_t+3, kp_t+6]          ← shape: (3,)
```

El dataset resultante puede tener cientos de miles de secuencias.

---

## Guia de entrenamiento

### Requisitos

```bash
# Python 3.11+
cd forecast-service
pip install -r requirements-train.txt
```

`requirements-train.txt` incluye:
- `torch>=2.9.0`
- `onnxscript`
- `scikit-learn>=1.5`
- `httpx>=0.27`
- `numpy>=1.26`

### Entrenamiento basico

```bash
python train.py
```

Esto:
1. Descarga 2 anos de datos Kp de GFZ Potsdam
2. Descarga 7 dias de DSCOVR Bz y plasma de NOAA
3. Construye secuencias de 24 pasos
4. Divide en train/val (85%/15%, sin shuffle temporal)
5. Entrena 50 epocas con Adam + CosineAnnealingLR
6. Guarda el mejor modelo en `weights/kp_lstm.pt`
7. Exporta a ONNX en `weights/kp_lstm.onnx`
8. Guarda parametros de normalizacion en `weights/norms.json`

### Parametros avanzados

```bash
python train.py \
  --epochs 100 \        # Numero de epocas (default: 50)
  --lr 5e-4 \           # Learning rate (default: 1e-3)
  --batch-size 512 \    # Batch size (default: 256)
  --seq-len 24 \        # Longitud de secuencia (default: 24)
  --hidden 128 \        # Unidades LSTM ocultas (default: 64)
  --layers 2 \          # Capas LSTM (default: 2)
  --dropout 0.3 \       # Dropout (default: 0.2)
  --kp-years 3          # Anos de datos historicos (default: 2)
```

### Salida del entrenamiento

```
INFO — Training on cpu
INFO — Fetching historical Kp from GFZ (2 years)…
INFO — Got 5840 Kp readings
INFO — Fetching recent DSCOVR Bz and plasma (7 days)…
INFO — Got 10080 Bz readings, 10080 plasma readings
INFO — Normalisation — Kp: μ=2.35 σ=1.82 | Bz: μ=-0.12 σ=7.84 | Wind: μ=451.3 σ=98.6
INFO — Dataset: X=(5740, 24, 3) y=(5740, 3)
INFO — Epoch 1/50 — train=0.8234 val=0.7891
INFO — Epoch 10/50 — train=0.4123 val=0.4521
INFO — Epoch 20/50 — train=0.3218 val=0.3892
INFO — Epoch 30/50 — train=0.2876 val=0.3534
INFO — Epoch 40/50 — train=0.2654 val=0.3312
INFO — Epoch 50/50 — train=0.2511 val=0.3187
INFO — Training complete. Best val loss: 0.3187
INFO — ONNX model exported to weights/kp_lstm.onnx
```

### Usar GPU (CUDA)

El script detecta automaticamente CUDA. Si tenes una GPU NVIDIA:

```bash
# Verificar que CUDA este disponible
python -c "import torch; print(torch.cuda.is_available())"

# El script usa GPU automaticamente si esta disponible
python train.py --epochs 200
```

---

## Exportacion a ONNX

Despues del entrenamiento, el modelo PyTorch se exporta a formato **ONNX** (Open Neural Network Exchange):

```python
torch.onnx.export(
    model,
    dummy_input,          # shape: (1, 24, 3)
    'weights/kp_lstm.onnx',
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch'}},
    opset_version=17,
)
```

**Por que ONNX:**
- El servicio de produccion usa `onnxruntime` en lugar de PyTorch completo
- Imagen Docker ~400 MB vs ~2 GB con PyTorch
- Inferencia mas rapida (optimizaciones del runtime)
- Independiente del framework de entrenamiento

---

## Inferencia en produccion

El archivo `predictor.py` maneja la inferencia:

```python
# Carga el modelo ONNX una sola vez al inicio
session = ort.InferenceSession('weights/kp_lstm.onnx')

# Para cada prediccion:
# 1. Descarga datos en tiempo real de NOAA (Bz, plasma, Kp 1-min)
# 2. Construye secuencia de 24 pasos
# 3. Normaliza con los parametros de norms.json
# 4. Ejecuta inferencia ONNX
# 5. Desnormaliza y recorta a rango [0, 9]
x = np.array([seq], dtype=np.float32)  # (1, 24, 3)
out = session.run(['output'], {'input': x})[0][0]  # (3,)
```

### Fallback basado en reglas

Si el modelo ONNX no esta disponible o la inferencia falla, el predictor usa un modelo basado en fisica simplificada:

```python
# Si Bz < 0 (campo sur): tormenta potencial
if bz < 0:
    injection = abs(bz) * (wind / 400) * 0.1
    kp_forecast = kp_now + injection * sqrt(hours)
else:
    # Sin driver: Kp decae exponencialmente
    kp_forecast = kp_now * exp(-hours * 0.15)
```

| Metodo | Confianza +1h | Confianza +3h | Confianza +6h |
|--------|--------------|--------------|--------------|
| LSTM | 78% | 63% | 48% |
| Reglas | 65% | 50% | 38% |

---

## Mejorar el modelo

### Agregar mas variables de entrada

Para mejorar la precision, se pueden agregar:
- Densidad del viento solar (protons/cm³)
- Presion dinamica del viento solar
- Componente Bx, By del IMF
- Flujo de rayos X (precursor de llamaradas)

### Arquitecturas alternativas

- **Transformer** — mejor para secuencias largas pero necesita mas datos
- **TCN (Temporal Convolutional Network)** — mas rapido que LSTM, bueno para inferencia
- **Ensemble LSTM + GRU** — promedia predicciones de multiples modelos

### Datos adicionales

Para obtener mas datos historicos de Bz:

```bash
# Datos historicos ACE (desde 1998)
# https://www.srl.caltech.edu/ACE/ASC/level2/

# Datos historicos WIND (desde 1994)
# https://cdaweb.gsfc.nasa.gov/
```

---

## Archivos del modelo

```
forecast-service/weights/
├── kp_lstm.onnx     ← modelo para produccion (inferencia)
├── kp_lstm.pt       ← checkpoint PyTorch (guardar, reentrenar)
└── norms.json       ← parametros de normalizacion
```

`norms.json` ejemplo:
```json
{
  "kp_mean": 2.35,
  "kp_std": 1.82,
  "bz_mean": -0.12,
  "bz_std": 7.84,
  "wind_mean": 451.3,
  "wind_std": 98.6,
  "trained_at": "2026-03-17T12:00:00",
  "version": "1.0"
}
```

> **Importante**: si reentrenas el modelo, los parametros de normalizacion cambian. El archivo `norms.json` se actualiza automaticamente. El servicio carga este archivo al inicio — reiniciar el servicio despues de reentrenar.
