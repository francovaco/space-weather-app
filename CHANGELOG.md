# Changelog

---

## [Unreleased] — v1.0.0

> Pendiente: ver TODO.md

---

## v0.9.0 — Observabilidad, ML e infraestructura

- **Machine learning / Train** — modelo LSTM para predicción de Kp (Stage 2 del sistema de forecast)
- **Tests** — suite de tests con Playwright para cobertura e2e
- **Logging + métricas** — sistema de logging estructurado y colección de métricas de telemetría
- **Sentry** — integración de Sentry para error tracking y monitoreo en producción
- **CI/CD** — workflow de GitHub Actions para lint, type-check y build automático en cada push
- **Documentación** — actualización de docs técnica del proyecto

---

## v0.8.0 — Nuevas secciones y PWA

- **SWFO-L1** — página placeholder con countdown para el satélite NOAA Solar-1 (operaciones previstas julio 2026)
- **Ciclo solar** — nueva página con gráfico de progresión del ciclo solar 25
- **Panorama clima espacial** — vista resumen con condiciones actuales de todos los índices NOAA (R/S/G)
- **Perturbaciones magnéticas** — mapa global de perturbaciones del campo magnético terrestre
- **Auroras 3D** — visualización de auroras en globo 3D polar (Three.js)
- **Notificaciones push** — implementación de Web Push API con VAPID para alertas en background
- **Mapa de estado satelital** — mapa operacional de GOES-16/17/18/19 y HIMAWARI
- **Estado de satélites** — dashboard de salud operacional de la constelación GOES
- **Sismos INPRES** — widget de sismos en tiempo real de Argentina/Chile (INPRES + USGS)

---

## v0.7.0 — DSCOVR y visualizaciones 3D

- **DSCOVR** — integración del magnetómetro solar DSCOVR en L1 (viento solar a 1 AU, Bz/Bt)
- **Auroras 3D** — primera versión del globo 3D de auroras con datos OVATION Prime
- **Magnetósfera 3D** — visualización 3D del entorno geoespacial con densidad/presión/velocidad

---

## v0.6.0 — Análisis y exportación de datos

- **Modo comparativo** — vista de comparación multi-instrumento con gráficos superpuestos y normalización
- **Opciones de exportación** — descarga de datos en CSV y ZIP desde cualquier instrumento
- **Datos históricos** — selector de rango de fechas para consultar series históricas
- **Notificaciones** — primera versión del sistema de notificaciones push
- **Normalización** — toggle para normalizar escalas en gráficos comparativos

---

## v0.5.0 — Widget meteorológico

- **Clima (SMN)** — integración del Servicio Meteorológico Nacional de Argentina: temperatura, humedad, viento, precipitación, pronóstico e íconos
- **Alertas SMN** — mapa de alertas meteorológicas de SMN con GeoJSON por provincia
- **Contador de rayos** — widget de actividad eléctrica atmosférica

---

## v0.4.0 — Modelos atmosféricos y magnetósfera

- **CTIPE** — modelo CTIPe de predicción de contenido electrónico total (TEC) de la ionósfera
- **Magnetósfera** — primera versión de la visualización del entorno magnetosférico

---

## v0.3.0 — Instrumentos GOES y modelos espaciales

- **Viento solar** — modelo WSA-ENLIL de pronóstico de viento solar con player de animación
- **Aurora boreal y austral** — forecast OVATION Prime con frames animados norte/sur
- **D-RAP** — predicción de absorción HF en la región D (vistas global, polo norte, polo sur)
- **WAM-IPE** — modelo de atmósfera completa e ionósfera (Whole Atmosphere Model)
- **GloTEC** — contenido electrónico total global con vistas Atlántico/Pacífico y anomalías
- **Índice Kp** — índice planetario geomagnético con escala de colores NOAA
- **Flujo de rayos X** — monitoreo del flujo solar X (clasificación B/C/M/X)
- **Flujo de protones** — niveles de flujo de protones energéticos (escalas S1–S5)
- **Flujo de electrones** — flujo de electrones del entorno satelital
- **Coronógrafo** — imágenes LASCO con player de animación de CMEs
- **Magnetómetro GOES** — campo magnético en órbita geoestacionaria
- **Entorno satelital** — métricas del entorno operacional del satélite
- **Mapa sinóptico solar** — mapa de la superficie solar con regiones activas
- **Condiciones actuales en topbar** — pills de R/S/G scales + velocidad de viento solar en tiempo real
- **Sección educativa "Clima Espacial"** — páginas de fenómenos e impactos (16 artículos)

---

## v0.2.0 — Visualizador de imágenes satelitales

- **Imágenes ABI** — player de animación canvas-based para imágenes satelitales GOES-19
- **Documentación** — página con visor PDF sobre el satélite, instrumentos y aplicaciones
- **TopBar** — relojes UTC/local y barra superior de la aplicación
- **Dashboard status** — estado inicial del dashboard principal

---

## v0.1.0 — Base del proyecto

- **Scaffolding inicial** — estructura Next.js 14 App Router, Tailwind, TanStack Query, Zustand
