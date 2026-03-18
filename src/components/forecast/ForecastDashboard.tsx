'use client'
// ============================================================
// src/components/forecast/ForecastDashboard.tsx
// Space weather forecast dashboard — Stage 1 (thresholds)
// + Stage 2 (LSTM) when Python service is available
// ============================================================
import { useMemo } from 'react'
import { AlertTriangle, Zap, Wind, Activity, Radio, BrainCircuit, Clock, RefreshCw } from 'lucide-react'
import { useAutoRefresh, REFRESH_INTERVALS } from '@/hooks/useAutoRefresh'
import { getForecastAlerts, getKpPrediction, type KpPredictionServiceResponse } from '@/lib/forecast-api'
import { classifyXRay } from '@/types/swpc'
import { kpToGScale, GEOMAGNETIC_SCALE } from '@/types/forecast'
import type { ForecastResponse, ForecastAlert, KpPrediction, AlertSeverity } from '@/types/forecast'
import { cn } from '@/lib/utils'

// ---- Alert severity styles ---------------------------------

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; text: string; badge: string }> = {
  alert:   { border: 'border-red-500/60',    bg: 'bg-red-500/10',    text: 'text-red-400',    badge: 'bg-red-500/20 text-red-300' },
  warning: { border: 'border-orange-400/60', bg: 'bg-orange-400/10', text: 'text-orange-300', badge: 'bg-orange-400/20 text-orange-200' },
  watch:   { border: 'border-yellow-400/60', bg: 'bg-yellow-400/10', text: 'text-yellow-300', badge: 'bg-yellow-400/20 text-yellow-200' },
  info:    { border: 'border-blue-400/60',   bg: 'bg-blue-400/10',   text: 'text-blue-300',   badge: 'bg-blue-400/20 text-blue-200' },
}

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  alert: 'ALERTA', warning: 'ADVERTENCIA', watch: 'VIGILANCIA', info: 'INFO',
}

// ---- Probability gauge -------------------------------------

function ProbabilityGauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="font-mono text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/60">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ---- Condition chip -----------------------------------------

function CondChip({ label, value, unit, highlight }: { label: string; value: string | null; unit: string; highlight?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center rounded border px-3 py-2 text-center', highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-background-secondary')}>
      <span className="text-xs text-text-muted">{label}</span>
      <span className={cn('font-mono text-sm font-bold', highlight ? 'text-primary' : 'text-text-primary')}>
        {value ?? '—'}
      </span>
      <span className="text-xs text-text-dim">{unit}</span>
    </div>
  )
}

// ---- Kp prediction bar -------------------------------------

function KpPredictionBar({ predictions, method }: { predictions: KpPrediction[]; method: string }) {
  return (
    <div className="rounded border border-border bg-background-secondary p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
          <BrainCircuit size={13} className="text-primary" />
          Predicción de Kp
        </h3>
        <span className={cn(
          'rounded px-1.5 py-0.5 text-xs font-medium',
          method === 'lstm' ? 'bg-primary/20 text-primary' : 'bg-border/60 text-text-muted'
        )}>
          {method === 'lstm' ? 'Modelo LSTM' : 'Modelo Base'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {predictions.map((p) => {
          const scale = kpToGScale(p.predicted_kp)
          const scaleInfo = GEOMAGNETIC_SCALE[scale]
          return (
            <div key={p.horizon_hours} className="flex flex-col items-center gap-1 rounded border border-border bg-background/60 py-3">
              <span className="text-xs text-text-muted">+{p.horizon_hours}h</span>
              <span className="font-mono text-xl font-bold" style={{ color: scaleInfo.color }}>
                {p.predicted_kp.toFixed(1)}
              </span>
              <span className="text-xs font-medium" style={{ color: scaleInfo.color }}>
                {scale} {scaleInfo.label}
              </span>
              <span className="text-xs text-text-dim">{Math.round(p.confidence * 100)}% conf.</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Main dashboard ----------------------------------------

export function ForecastDashboard() {
  const { data: forecast, isLoading, isError, isFetching, refetch } = useAutoRefresh<ForecastResponse>({
    queryKey: ['forecast-alerts'],
    fetcher: getForecastAlerts,
    intervalMs: REFRESH_INTERVALS.ONE_MIN,
  })

  const { data: predService } = useAutoRefresh<KpPredictionServiceResponse>({
    queryKey: ['forecast-kp-prediction'],
    fetcher: getKpPrediction,
    intervalMs: REFRESH_INTERVALS.FIVE_MIN,
  })

  // Merge LSTM predictions when available
  const predictions = useMemo<KpPrediction[]>(() => {
    if (predService?.available && predService.predictions?.length) {
      return predService.predictions
    }
    return forecast?.kp_predictions ?? []
  }, [forecast, predService])

  const predMethod = predService?.available ? 'lstm' : 'rule_based'

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="animate-pulse text-sm text-text-secondary">Cargando datos de pronóstico…</span>
      </div>
    )
  }

  if (isError || !forecast) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <AlertTriangle size={24} className="text-red-400" />
        <p className="text-sm text-text-secondary">Error al cargar el pronóstico. Reintentando…</p>
      </div>
    )
  }

  const { conditions, alerts, storm_probability } = forecast
  const currentGScale = kpToGScale(conditions.kp_current ?? 0)
  const gScaleInfo = GEOMAGNETIC_SCALE[currentGScale]

  // Sort alerts by severity
  const SEVERITY_ORDER: AlertSeverity[] = ['alert', 'warning', 'watch', 'info']
  const sortedAlerts = [...alerts].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">Predicción del Clima Espacial</h1>
          <p className="mt-1 text-xs text-text-muted">
            Evaluación en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          {forecast.data_age_minutes > 0 && (
            <span className="flex items-center gap-1 text-xs text-text-dim">
              <Clock size={10} />
              Datos: hace {forecast.data_age_minutes} min
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded border border-border bg-background-secondary px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-border/60 disabled:opacity-50"
          >
            <RefreshCw size={11} className={cn(isFetching && 'animate-spin')} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Current G-Scale Banner */}
      <div
        className="flex items-center justify-between rounded-lg border p-4"
        style={{ borderColor: `${gScaleInfo.color}40`, backgroundColor: `${gScaleInfo.color}0d` }}
      >
        <div>
          <p className="text-xs text-text-secondary">Escala Geomagnética Actual</p>
          <p className="font-display text-2xl font-bold" style={{ color: gScaleInfo.color }}>
            {currentGScale} — {gScaleInfo.label}
          </p>
          <p className="text-xs text-text-muted">Kp = {conditions.kp_current?.toFixed(1) ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">Alertas activas</p>
          <p className="font-mono text-3xl font-bold text-text-primary">{alerts.length}</p>
        </div>
      </div>

      {/* Current Conditions Grid */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          <Activity size={12} />
          Condiciones Actuales
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          <CondChip
            label="IMF Bz"
            value={conditions.bz_last?.toFixed(1) ?? null}
            unit="nT"
            highlight={(conditions.bz_last ?? 0) < -5}
          />
          <CondChip
            label="Bz 30min"
            value={conditions.bz_sustained?.toFixed(1) ?? null}
            unit="nT"
            highlight={(conditions.bz_sustained ?? 0) < -5}
          />
          <CondChip
            label="IMF Bt"
            value={conditions.bt_last?.toFixed(1) ?? null}
            unit="nT"
          />
          <CondChip
            label="Vel. Viento"
            value={conditions.wind_speed?.toFixed(0) ?? null}
            unit="km/s"
            highlight={(conditions.wind_speed ?? 0) > 500}
          />
          <CondChip
            label="Densidad"
            value={conditions.wind_density?.toFixed(1) ?? null}
            unit="p/cm³"
          />
          <CondChip
            label="Kp actual"
            value={conditions.kp_current?.toFixed(1) ?? null}
            unit="Kp"
            highlight={(conditions.kp_current ?? 0) >= 4}
          />
          <CondChip
            label="Llamarada"
            value={conditions.xray_class}
            unit="clase"
            highlight={!!conditions.xray_class && !conditions.xray_class.startsWith('A') && !conditions.xray_class.startsWith('B')}
          />
          <CondChip
            label="Protones"
            value={conditions.proton_flux_10mev !== null ? conditions.proton_flux_10mev.toFixed(1) : null}
            unit="pfu"
            highlight={(conditions.proton_flux_10mev ?? 0) >= 10}
          />
          <CondChip
            label="Generado"
            value={new Date(forecast.generated_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
            unit="UTC"
          />
        </div>
      </section>

      {/* Kp Predictions */}
      {predictions.length > 0 && (
        <KpPredictionBar predictions={predictions} method={predMethod} />
      )}

      {/* Storm Probability */}
      <section className="rounded border border-border bg-background-secondary p-4">
        <h2 className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          <Zap size={12} />
          Probabilidad de Tormentas — Próximas 24h
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            <ProbabilityGauge label="Tormenta G1+ (Kp≥5)" value={storm_probability.g1_or_above} color="#facc15" />
            <ProbabilityGauge label="Tormenta G2+ (Kp≥6)" value={storm_probability.g2_or_above} color="#fb923c" />
            <ProbabilityGauge label="Tormenta G3+ (Kp≥7)" value={storm_probability.g3_or_above} color="#f87171" />
          </div>
          <div className="space-y-3">
            <ProbabilityGauge label="Apagón Radio R1+ (M1+)" value={storm_probability.r1_or_above} color="#60a5fa" />
            <ProbabilityGauge label="Radiación Solar S1+ (≥10 pfu)" value={storm_probability.s1_or_above} color="#c084fc" />
          </div>
        </div>
      </section>

      {/* Active Alerts */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          <AlertTriangle size={12} />
          Alertas de Umbral Activas ({sortedAlerts.length})
        </h2>
        {sortedAlerts.length === 0 ? (
          <div className="flex items-center justify-center rounded border border-border/40 bg-background-secondary/50 py-8">
            <p className="text-sm text-text-dim">No hay alertas activas. Condiciones tranquilas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAlerts.map((alert) => {
              const styles = SEVERITY_STYLES[alert.severity]
              return (
                <div
                  key={alert.id}
                  className={cn('rounded border p-3', styles.border, styles.bg)}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-text-primary">{alert.title}</span>
                    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs font-bold', styles.badge)}>
                      {SEVERITY_LABEL[alert.severity]}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{alert.description}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-text-dim">
                    <span>Valor: <span className={cn('font-mono font-bold', styles.text)}>{alert.value.toExponential ? (Math.abs(alert.value) < 0.01 ? alert.value.toExponential(1) : alert.value.toFixed(1)) : alert.value} {alert.unit}</span></span>
                    <span>Umbral: {alert.threshold.toExponential ? (Math.abs(alert.threshold) < 0.01 ? alert.threshold.toExponential(1) : alert.threshold) : alert.threshold} {alert.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Detalles del modelo */}
      <section className="rounded border border-border bg-background-secondary p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          <BrainCircuit size={12} />
          Cómo funciona el sistema de predicción
        </h2>
        <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
          <p>
            El sistema analiza en tiempo real múltiples parámetros del entorno espacial para estimar el estado geomagnético
            actual y proyectar su evolución en las próximas horas. Cada actualización procesa los valores más recientes
            del campo magnético interplanetario, la velocidad y densidad del viento solar, el flujo de rayos X y
            partículas energéticas, y el índice Kp instantáneo.
          </p>
          <p>
            Las predicciones de Kp se generan mediante una red neuronal recurrente de tipo <span className="font-mono text-primary">LSTM</span> (Long Short-Term Memory),
            entrenada con secuencias históricas de 24 pasos de los mismos parámetros que el sistema monitorea en tiempo real.
            La red aprende patrones temporales en el comportamiento del campo magnético terrestre y los correlaciona
            con la actividad del viento solar, permitiendo estimar la intensidad geomagnética esperada a <span className="text-text-primary font-medium">+1h, +3h y +6h</span>.
          </p>
          <p>
            El nivel de confianza disminuye con el horizonte temporal: las predicciones a corto plazo (~78%) son más
            precisas que las de largo plazo (~48%), dado que la dinámica del plasma solar introduce mayor incertidumbre
            a medida que se extiende la ventana de predicción. Cuando el modelo neuronal no está disponible, el sistema
            activa automáticamente un <span className="text-text-primary font-medium">Modelo Base</span> de predicción
            analítica que estima la evolución del Kp a partir de los valores actuales del campo Bz y la velocidad del viento solar.
          </p>
          {predService?.available && (
            <p className="text-primary">
              Modelo LSTM activo · v{predService.model_version}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
