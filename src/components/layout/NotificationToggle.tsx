'use client'

import { Bell, BellOff, Settings2, ShieldAlert } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function NotificationToggle() {
  const { enabled, setEnabled, minKpThreshold, setSettings, notifyXClass, notifySwpcAlerts } = useNotificationStore()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const requestPermission = async () => {
    const res = await Notification.requestPermission()
    setPermission(res)
    if (res === 'granted') {
      setEnabled(true)
    }
  }

  const toggleNotifications = () => {
    if (permission === 'default') {
      requestPermission()
    } else if (permission === 'granted') {
      setEnabled(!enabled)
    }
  }

  if (!mounted || !('Notification' in window)) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border transition-all outline-none',
          enabled
            ? 'border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan shadow-glow-blue'
            : 'border-border bg-background-secondary text-text-muted hover:text-text-primary'
        )}
        aria-label={enabled ? 'Alertas activas — Configurar alertas' : 'Alertas desactivadas — Configurar alertas'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Configurar Alertas de Clima Espacial"
      >
        {enabled ? <Bell size={18} className="animate-pulse" /> : <BellOff size={18} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Configuración de alertas de clima espacial"
          className="absolute right-0 mt-3 z-50 w-80 rounded-xl border border-border bg-background-card p-5 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldAlert size={18} className="text-accent-cyan shrink-0" />
              <h3 className="text-sm font-bold text-text-primary truncate">
                Alertas Espaciales
              </h3>
            </div>
            <div className="text-text-dim/50 shrink-0 p-1">
              <Settings2 size={14} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold text-text-primary">Notificaciones</span>
                <span className="text-[11px] text-text-dim truncate leading-none mt-0.5">Sistema local activo</span>
              </div>
              <button
                onClick={toggleNotifications}
                role="switch"
                aria-checked={enabled}
                aria-label="Activar o desactivar notificaciones"
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none shrink-0',
                  enabled ? 'bg-primary' : 'bg-slate-700'
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md',
                  enabled ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>

            {permission === 'denied' && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
                <p className="text-xs text-red-400 leading-tight flex gap-2">
                  <span className="shrink-0">⚠️</span>
                  Permiso denegado. Active las alertas en el navegador.
                </p>
              </div>
            )}

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-text-dim font-black">Umbrales de Alerta</p>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <span className="text-xs text-text-secondary font-semibold truncate">Tormentas (Kp)</span>
                    <span className="font-data text-[10px] text-accent-cyan font-bold bg-accent-cyan/10 px-2 py-1 rounded border border-accent-cyan/20 whitespace-nowrap shrink-0">
                      G{minKpThreshold-4} · Kp {minKpThreshold}
                    </span>
                  </div>
                  <div className="px-1">
                    <input
                      type="range" min="5" max="9" step="1"
                      value={minKpThreshold}
                      onChange={(e) => setSettings({ minKpThreshold: parseInt(e.target.value) })}
                      aria-label={`Umbral de tormenta Kp: nivel G${minKpThreshold - 4} (Kp ${minKpThreshold})`}
                      aria-valuemin={5}
                      aria-valuemax={9}
                      aria-valuenow={minKpThreshold}
                      className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-text-dim mt-2.5 font-data font-medium">
                      <span>G1</span>
                      <span>G5</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/5 p-3 hover:bg-white/5 transition-colors cursor-pointer"
                     onClick={() => setSettings({ notifyXClass: !notifyXClass })}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-text-secondary font-semibold">Fulguraciones X</span>
                    <span className="text-[10px] text-text-dim truncate">Apagones de radio R3+</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyXClass}
                    onChange={(e) => setSettings({ notifyXClass: e.target.checked })}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/50 shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/5 p-3 hover:bg-white/5 transition-colors cursor-pointer"
                     onClick={() => setSettings({ notifySwpcAlerts: !notifySwpcAlerts })}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-text-secondary font-semibold">Alertas oficiales SWPC</span>
                    <span className="text-[10px] text-text-dim truncate">Vigilancias, advertencias y alertas NOAA</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySwpcAlerts}
                    onChange={(e) => setSettings({ notifySwpcAlerts: e.target.checked })}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/50 shrink-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3.5">
              <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', enabled ? 'bg-green-500 animate-pulse' : 'bg-slate-600')} />
              <p className="text-[10px] text-text-dim italic leading-tight">
                Activo mientras la aplicación está abierta.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
