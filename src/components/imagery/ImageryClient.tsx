'use client'
// ============================================================
// src/components/imagery/ImageryClient.tsx
// GOES-19 ABI animation viewer
// • Frames generated client-side (no API dependency)
// • Images served through /api/goes/img-proxy (NOAA hotlink bypass)
// • Loop / rock playback, speed control, grid overlay
// ============================================================
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  Download, Grid3x3, ExternalLink, ChevronLeft,
  RefreshCw, Minus, Plus, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────
type BandType  = 'visible' | 'near-ir' | 'ir' | 'rgb'
type PlayMode  = 'loop' | 'rock'

interface ColorEntry { label: string; color: string }
interface BandRef {
  descripcionLarga: string
  aplicaciones: string[]
  escala?: ColorEntry[]
  receta?: string          // RGB recipe (e.g. "R=B08−B10 / G=B12−B13 / B=B08")
  notaDiurna?: string      // e.g. "Solo disponible de día"
  resolucion?: string      // spatial resolution
  frecuencia?: string      // scan frequency for SSA
}
interface Channel {
  id: string; nombre: string; nombreCorto: string
  longitud?: string; tipo: BandType; color: string
  descripcion: string; docUrl: string; ref: BandRef
}
interface Frame {
  url: string    // proxied URL
  rawUrl: string // direct CDN URL (for downloads)
  ts: Date
  label: string
  filename: string
}

// ── CDN & proxy helpers ────────────────────────────────────────
const CDN = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa'

function proxy(cdnUrl: string) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(cdnUrl)}`
}

// Build NOAA timestamp string: YYYYDDDHHMM (11 chars)
function makeTsStr(d: Date): string {
  const year  = d.getUTCFullYear()
  const start = Date.UTC(year, 0, 0)           // Dec 31 of prev year
  const doy   = Math.floor((d.getTime() - start) / 86400000)
  const hh    = d.getUTCHours().toString().padStart(2, '0')
  const mm    = d.getUTCMinutes().toString().padStart(2, '0')
  return `${year}${doy.toString().padStart(3, '0')}${hh}${mm}`
}

function formatLabel(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} — ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

// Generate N frame objects going backwards from "now minus processing delay"
function generateFrames(bandId: string, count: number, res: string): Frame[] {
  const now = new Date()
  now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 10) * 10, 0, 0)
  // NOAA processing delay: subtract 20 min to make sure latest frame exists
  now.setTime(now.getTime() - 20 * 60 * 1000)

  return Array.from({ length: count }, (_, i) => {
    const d  = new Date(now.getTime() - (count - 1 - i) * 10 * 60 * 1000)
    const ts = makeTsStr(d)
    const fn = `${ts}_GOES19-ABI-ssa-${bandId}-${res}x${res}.jpg`
    const rawUrl = `${CDN}/${bandId}/${fn}`
    return { url: proxy(rawUrl), rawUrl, ts: d, label: formatLabel(d), filename: fn }
  })
}

// ── Channel catalogue ──────────────────────────────────────────
const CHANNELS: Channel[] = [
  // ─── RGB products ──────────────────────────────────────────
  { id:'GEOCOLOR', nombre:'GeoColor', nombreCorto:'GeoColor',
    tipo:'rgb', color:'#22d3ee',
    descripcion:'Color verdadero de día · IR multiespectral de noche',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_CIRA_Geocolor_20171019.pdf',
    ref:{ frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Algoritmo de CIRA/CSU. Combina las bandas rojas, verdes y azules del ABI para simular color natural durante el día. El "verde" de GeoColor no existe en el ABI — se sintetiza matemáticamente a partir de las bandas azul (B01), rojo (B02) y IR cercano (B03). De noche usa B13 IR coloreado en una paleta azul-gris que imita el aspecto nocturno urbano/oceánico.',
      receta:'Día: pseudo-verde (0.45·B02 + 0.10·B03 + 0.45·B01) · Noche: B13 IR → paleta azul/gris CIRA',
      aplicaciones:['Nubes y frentes sinópticos','Humo de incendios y polvo','Hielo marino y nieve','Ciclones y sistemas organizados','Florescencia de algas en océano'],
      escala:[{label:'Nubes altas frías',color:'#ffffff'},{label:'Nubes medias',color:'#c8d0e0'},{label:'Océano/cielo claro',color:'#3a6ea8'},{label:'Vegetación',color:'#3a7a3a'},{label:'Suelo/desierto',color:'#c8a040'},{label:'Noche (IR)',color:'#1a2a4a'}] }},

  { id:'EXTENT3', nombre:'GLM Densidad de Rayos', nombreCorto:'GLM Rayos',
    tipo:'rgb', color:'#facc15',
    descripcion:'Densidad de destellos GLM superpuesta a GeoColor',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/GLM_Quick_Guides_May_2019.pdf',
    ref:{ frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'El GLM (Geostationary Lightning Mapper) es un sensor dedicado en GOES-19 que detecta destellos ópticos de rayos día y noche con una frecuencia de muestreo de 500 fotogramas/segundo. El producto EXTENT3 calcula la densidad de la extensión de cada destello (área cubierta) en una grilla de ~10 km, y la superpone sobre GeoColor para facilitar la correlación espacial tormenta-rayo.',
      receta:'Fondo: GeoColor · Sobreposición: densidad GLM Flash Extent acumulada en ventana temporal',
      aplicaciones:['Actividad eléctrica en tiempo real','Sistemas convectivos de mesoescala (MCS)','Alerta temprana de tormentas severas','Evolución de células convectivas','Seguimiento de tormentas que cruzan países'],
      escala:[{label:'Alta densidad de rayos',color:'#ff0000'},{label:'Densidad media',color:'#ffaa00'},{label:'Baja densidad',color:'#ffff00'},{label:'Fondo GeoColor',color:'#3a6ea8'}] }},

  { id:'AirMass', nombre:'Air Mass RGB', nombreCorto:'Air Mass',
    tipo:'rgb', color:'#a78bfa',
    descripcion:'Masas de aire · Tropopausa dinámica · Jet stream',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_GOESR_AirMassRGB_final.pdf',
    ref:{ frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Compuesto desarrollado por EUMETSAT para identificar masas de aire y características dinámicas. Es especialmente útil para detectar la tropopausa dinámica (intrusiones estratosféricas), el jet stream, y distinguir entre aire polar, tropical y estratosférico.',
      receta:'R = B08 (6.2µm) − B10 (7.3µm) · G = B12 (9.6µm) − B13 (10.3µm) · B = B08 (6.2µm) invertido',
      aplicaciones:['Masas de aire polar vs tropical','Tropopausa dinámica e intrusiones estratosféricas','Vorticidad potencial en superficie isentrópica','Jet stream y ondas de Rossby','Ciclogénesis explosiva'],
      escala:[{label:'Aire polar estratosférico',color:'#ff4444'},{label:'Aire polar troposférico',color:'#aa44aa'},{label:'Aire tropical húmedo',color:'#44aa44'},{label:'Nubes convectivas profundas',color:'#222244'},{label:'Nubes de nivel medio',color:'#4444aa'},{label:'Cielo seco en altura',color:'#ff8844'}] }},

  { id:'Sandwich', nombre:'Sandwich RGB', nombreCorto:'Sandwich',
    tipo:'rgb', color:'#f97316',
    descripcion:'Bandas 3 + 13 · Detalle textural y temperatura',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/SandwichProduct.pdf',
    ref:{ frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'El producto Sandwich combina la alta resolución espacial de la banda visible B03 (0.86 µm, 1 km) con la información de temperatura de cima del canal IR B13 (10.35 µm, 2 km). La reflectancia visible proporciona detalle textural, mientras que la temperatura IR permite clasificar altura de nubes.',
      receta:'Visible B03 (reflectancia, alta resolución) sobre B13 IR (temperatura, paleta de color)',
      aplicaciones:['Tormentas convectivas y severidad','Temperatura de cima de nubes con detalle','Nubes bajas y niebla','Ciclones tropicales','Sistemas frontales'],
      escala:[{label:'Nubes muy frías (<-60°C)',color:'#ff2222'},{label:'Nubes frías',color:'#ffaa00'},{label:'Nubes templadas',color:'#44cc44'},{label:'Nubes cálidas bajas',color:'#2244ff'},{label:'Superficie',color:'#888888'}] }},

  { id:'DayNightCloudMicroCombo', nombre:'Día/Noche Micro Combo RGB', nombreCorto:'Día/Noche',
    tipo:'rgb', color:'#6366f1',
    descripcion:'Microfísica diurna · Niebla nocturna',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_DayNightCloudMicroCombo.pdf',
    ref:{ frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Producto híbrido que aprovecha la luz solar de día y diferencias térmicas de noche. Durante el día muestra propiedades microfísicas de las nubes (gotitas vs cristales de hielo, tamaño de partículas). De noche, usa la diferencia B07-B13 (split window de onda corta vs onda larga) que es muy sensible a la niebla y nubes bajas de agua.',
      receta:'Día: R=B06 · G=B02 · B=B01 (microfísica) · Noche: R=B07-B13 · G=B07 · B=B05 (detección niebla)',
      aplicaciones:['Niebla y nubes bajas nocturnas','Fase de partículas (gotitas vs hielo)','Potencial de precipitación','Niebla costera y de valle','Bandas de nubes bajas en inversión térmica'],
      escala:[{label:'Agua líquida (día)',color:'#aa44ff'},{label:'Hielo (día)',color:'#ffffff'},{label:'Niebla/nubes bajas (noche)',color:'#ffaa00'},{label:'Cielo claro noche',color:'#2244aa'}] }},

  { id:'FireTemperature', nombre:'Temperatura de Incendios RGB', nombreCorto:'Incendios',
    tipo:'rgb', color:'#ef4444',
    descripcion:'Temperatura y extensión de incendios activos',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_Fire_Temperature_RGB.pdf',
    ref:{ frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Diseñado específicamente para detectar y caracterizar incendios activos usando bandas IR de onda corta que se saturan con el calor del fuego. Permite estimar la temperatura del frente de fuego y la extensión del área afectada. Funciona día y noche.',
      receta:'R = B07 (3.9µm) · G = B06 (2.2µm) · B = B05 (1.6µm)',
      aplicaciones:['Incendios forestales activos y frentes de fuego','Temperatura estimada del incendio (>600°C saturado)','Volcanes activos (Copahue, Villarrica, Calbuco)','Quemas agrícolas en la pampa','Pozos de gas en combustión'],
      escala:[{label:'Fuego muy caliente >600°C (saturado)',color:'#ffffff'},{label:'Fuego caliente',color:'#ffff00'},{label:'Fuego moderado',color:'#ff4400'},{label:'Humo denso',color:'#884422'},{label:'Nubes normales',color:'#aaaaff'},{label:'Sin actividad ígnea',color:'#224422'}] }},

  { id:'Dust', nombre:'Polvo RGB', nombreCorto:'Polvo',
    tipo:'rgb', color:'#d97706',
    descripcion:'Polvo mineral y aerosoles gruesos en suspensión',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_Dust_RGB.pdf',
    ref:{ frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Técnica de "split window" diferencial entre canales IR para detectar polvo mineral en suspensión. Funciona mejor sobre superficies cálidas y durante el día. En Sudamérica Sur es especialmente útil para el polvo patagónico y las tolvaneras en zonas áridas de Argentina.',
      receta:'R = B15 (12.3µm) − B13 (10.3µm) · G = B13 (10.3µm) − B11 (8.4µm) · B = B13 (10.3µm) invertido',
      aplicaciones:['Polvo patagónico bajo viento zonda','Tolvaneras en zonas áridas (La Rioja, San Juan, Mendoza)','Polvo sahariano transoceánico (SAL)','Evaluación calidad del aire','Transporte de aerosoles sobre océano'],
      escala:[{label:'Polvo denso',color:'#ff88aa'},{label:'Polvo moderado',color:'#ffaacc'},{label:'Vegetación/sin polvo',color:'#224422'},{label:'Nubes de hielo altas',color:'#ff2222'},{label:'Nubes de agua',color:'#ffffff'}] }},

  // ─── Bands 01–16 ───────────────────────────────────────────
  { id:'01', nombre:'Banda 1 — Azul Visible', nombreCorto:'B01 Azul',
    longitud:'0.47 µm', tipo:'visible', color:'#60a5fa',
    descripcion:'Aerosoles · Calidad del aire · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band01.pdf',
    ref:{ resolucion:'1 km', frecuencia:'Cada 10 min (sector SSA)', notaDiurna:'Solo disponible de día (reflectancia solar)',
      descripcionLarga:'Canal visible azul a 0.47 µm, resolución 1 km. Forma parte del compuesto GeoColor (canal B del RGB). El azul es sensible a la dispersión de Rayleigh, lo que lo hace ideal para detectar aerosoles finos y humo. El océano aparece más brillante en este canal que en el rojo.',
      aplicaciones:['Profundidad óptica de aerosoles (AOD)','Humo de incendios a altitudes medias','Calidad del aire en ciudades','Nubes de polvo fino','Componente de GeoColor y Fire Temperature RGB'],
      escala:[{label:'Alta reflectancia (nubes/nieve)',color:'#ffffff'},{label:'Moderada',color:'#888888'},{label:'Baja (océano/vegetación)',color:'#111144'}] }},

  { id:'02', nombre:'Banda 2 — Rojo Visible', nombreCorto:'B02 Rojo',
    longitud:'0.64 µm', tipo:'visible', color:'#f87171',
    descripcion:'Canal principal · Máxima resolución 0.5 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band02.pdf',
    ref:{ resolucion:'0.5 km (500 m) — la más alta del ABI', frecuencia:'Cada 10 min (sector SSA)', notaDiurna:'Solo disponible de día (reflectancia solar)',
      descripcionLarga:'Único canal del ABI a 500 m de resolución, correspondiente al rojo visible (0.64 µm). Es el canal más similar al visible de los satélites GOES anteriores (GOES-13). Forma parte de GeoColor y Sandwich RGB. La nieve aparece muy brillante y es indistinguible de nubes sin información IR adicional.',
      aplicaciones:['Imágenes de alta resolución de nubes','Morfología de tormentas y células convectivas','Nieve superficial','Monitoreo de costa y litoral','Canal base de GeoColor y Sandwich'],
      escala:[{label:'Muy brillante (nubes/nieve)',color:'#ffffff'},{label:'Brillante',color:'#cccccc'},{label:'Moderado (tierra)',color:'#888888'},{label:'Oscuro (océano/vegetación)',color:'#111111'}] }},

  { id:'03', nombre:'Banda 3 — Vegetación', nombreCorto:'B03 Veggie',
    longitud:'0.86 µm', tipo:'near-ir', color:'#4ade80',
    descripcion:'Vegetación · Cicatrices · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band03.pdf',
    ref:{ resolucion:'1 km', frecuencia:'Cada 10 min (sector SSA)', notaDiurna:'Solo disponible de día (reflectancia solar)',
      descripcionLarga:'Canal IR cercano a 0.86 µm (borde rojo). La vegetación sana refleja fuertemente (efecto "red edge") mientras que el agua y el suelo oscuro absorben. Forma parte del RGB Fire Temperature. Junto a B02, permite calcular el NDVI (Normalized Difference Vegetation Index). Cicatrices de incendios aparecen muy oscuras.',
      aplicaciones:['NDVI y monitoreo de vegetación','Cicatrices de incendios forestales','Masas de agua y ríos','Humo fino diferenciado de vegetación','Componente de GeoColor sintético'],
      escala:[{label:'Vegetación densa (muy brillante)',color:'#00cc00'},{label:'Vegetación escasa',color:'#668866'},{label:'Nubes',color:'#ffffff'},{label:'Agua (oscuro)',color:'#000033'},{label:'Suelo desnudo',color:'#ccaa66'},{label:'Cicatriz incendio (muy oscuro)',color:'#111111'}] }},

  { id:'04', nombre:'Banda 4 — Cirros', nombreCorto:'B04 Cirros',
    longitud:'1.37 µm', tipo:'near-ir', color:'#a5f3fc',
    descripcion:'Detección exclusiva de cirros delgados · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band04.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)', notaDiurna:'Solo disponible de día (reflectancia solar)',
      descripcionLarga:'Canal centrado en una fuerte banda de absorción de vapor de agua. Prácticamente toda la radiación ascendente de la superficie y de las nubes bajas es absorbida por el vapor de agua atmosférico antes de llegar al satélite. Solo los cirros muy altos (por encima de la mayor parte del vapor) y la nieve a gran altitud son visibles. La superficie siempre aparece negra.',
      aplicaciones:['Detección exclusiva de cirros delgados','Extensión de yunques de cumulonimbus','Nieve en alta montaña (Andes)','Nubes de cima de tormentas profundas','Heladas radiativas en valles andinos'],
      escala:[{label:'Cirros densos (encima del VA)',color:'#ffffff'},{label:'Cirros delgados',color:'#888888'},{label:'Cielo claro o nubes bajas (negro)',color:'#000000'}] }},

  { id:'05', nombre:'Banda 5 — Nieve / Hielo', nombreCorto:'B05 Nieve',
    longitud:'1.60 µm', tipo:'near-ir', color:'#e0f2fe',
    descripcion:'Discriminación nieve/hielo vs nubes de agua · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band05.pdf',
    ref:{ resolucion:'1 km', frecuencia:'Cada 10 min (sector SSA)', notaDiurna:'Solo disponible de día (reflectancia solar)',
      descripcionLarga:'La nieve y el hielo absorben fuertemente a 1.6 µm y aparecen oscuros (casi negros). Las nubes de agua líquida son brillantes porque el agua líquida no absorbe en esta longitud. Esto permite discriminar perfectamente nieve/granizo de nubes de agua, algo imposible en el visible.',
      aplicaciones:['Cobertura de nieve en los Andes','Discriminar granizo en tormentas','Identificación de nubes de hielo vs agua','Glaciares y hielos continentales patagónicos','Fase de partículas en nubes de Patagonia'],
      escala:[{label:'Nubes de agua (muy brillante)',color:'#ffffff'},{label:'Nubes mixtas',color:'#aaaaaa'},{label:'Nieve/hielo (oscuro)',color:'#222266'},{label:'Glaciares (muy oscuro)',color:'#000044'},{label:'Océano',color:'#000022'}] }},

  { id:'06', nombre:'Banda 6 — Partículas en Nubes', nombreCorto:'B06 Part.',
    longitud:'2.24 µm', tipo:'near-ir', color:'#bfdbfe',
    descripcion:'Radio efectivo de partículas en nubes · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band06.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)', notaDiurna:'Solo disponible de día (reflectancia solar)',
      descripcionLarga:'Sensible al radio efectivo de partículas en las nubes. Nubes con partículas pequeñas (jóvenes, difíciles de precipitar) son brillantes. Nubes con partículas grandes (maduras, con mayor potencial de precipitación) son oscuras. Forma parte del compuesto Fire Temperature RGB (canal B).',
      aplicaciones:['Potencial de precipitación de nubes convectivas','Tamaño de gotitas en niebla (marina vs continental)','Identificación de nubes con granizo','Propiedades microfísicas para modelos','Componente de Día/Noche Micro Combo'],
      escala:[{label:'Partículas muy pequeñas (muy brillante)',color:'#ffffff'},{label:'Partículas medianas',color:'#888888'},{label:'Partículas grandes (oscuro)',color:'#111111'},{label:'Hielo/nieve (muy oscuro)',color:'#000044'}] }},

  { id:'07', nombre:'Banda 7 — Ventana Onda Corta', nombreCorto:'B07 OC',
    longitud:'3.90 µm', tipo:'ir', color:'#fb923c',
    descripcion:'Incendios · Niebla nocturna · 2 km · Día y noche',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band07.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Banda mixta: de día recibe tanto radiación solar reflejada como emisión térmica. De noche solo emisión térmica. Fuegos activos saturan el detector (aparecen blancos) porque su temperatura supera ampliamente los límites del canal. La diferencia B07-B13 (canal onda corta − onda larga) es la técnica estándar para detectar niebla y nubes bajas de noche.',
      aplicaciones:['Fuego activo día y noche (sensibilidad < 1 km²)','Niebla y nubes bajas nocturnas (diferencia B07-B13)','Temperatura de superficies cálidas','Volcanes activos (fumarolas)','Nubes de convección profunda (frías = oscuras)'],
      escala:[{label:'Fuego activo (saturado blanco)',color:'#ffffff'},{label:'Muy cálido',color:'#ff2200'},{label:'Cálido (tierra)',color:'#ff8800'},{label:'Templado',color:'#ffff00'},{label:'Frío (nubes altas)',color:'#0044ff'},{label:'Muy frío',color:'#000044'}] }},

  { id:'08', nombre:'Banda 8 — Vapor de Agua Alto', nombreCorto:'B08 VA Alto',
    longitud:'6.19 µm', tipo:'ir', color:'#818cf8',
    descripcion:'Humedad troposfera alta 300–600 hPa · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band08.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Sondea la humedad entre aproximadamente 300 y 600 hPa (troposfera alta). Brillante = muy húmedo y frío. Oscuro = seco y cálido. No puede "ver" la superficie, independientemente de la cobertura de nubes. Sensible al flujo en el jet stream. Forma parte del AirMass RGB.',
      aplicaciones:['Jet stream y corriente en chorro','Vorticidad potencial en 500/300 hPa','Ondas de Rossby y vainas','Flujo en altura sobre los Andes','Seguimiento de masas de aire en sistemas frontales'],
      escala:[{label:'Muy húmedo (brillante/frío)',color:'#ffffff'},{label:'Húmedo',color:'#8888cc'},{label:'Normal',color:'#444488'},{label:'Seco (oscuro/cálido)',color:'#aa4400'},{label:'Muy seco',color:'#220000'}] }},

  { id:'09', nombre:'Banda 9 — Vapor de Agua Medio', nombreCorto:'B09 VA Med',
    longitud:'6.93 µm', tipo:'ir', color:'#a78bfa',
    descripcion:'Humedad troposfera media ~500 hPa · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band09.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Similar a B08 pero muestrea capas ligeramente más bajas (~500 hPa, troposfera media). Complementa B08 y B10 para obtener un perfil vertical de vapor de agua. Útil en el análisis de sistemas frontales donde el gradiente de humedad es vertical.',
      aplicaciones:['Humedad de troposfera media','Análisis de frentes fríos sobre la pampa','Corrientes de bajo nivel (SALLJ)','Predicción de convección en Argentina','Sistemas frontales en el sur'],
      escala:[{label:'Muy húmedo',color:'#ffffff'},{label:'Húmedo',color:'#8888cc'},{label:'Normal',color:'#444488'},{label:'Seco',color:'#884400'}] }},

  { id:'10', nombre:'Banda 10 — Vapor de Agua Bajo', nombreCorto:'B10 VA Bajo',
    longitud:'7.34 µm', tipo:'ir', color:'#c4b5fd',
    descripcion:'Humedad troposfera baja · Capa límite · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band10.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'El más bajo de los tres canales de vapor de agua (~750–850 hPa). Sensible a la humedad de la capa límite planetaria. Más cálido que B08/B09 en condiciones normales. Detecta gradientes de humedad en capas bajas relacionados con la convergencia de flujos cálidos/húmedos del noreste (SALLJ).',
      aplicaciones:['Capa límite planetaria sobre pampas','Low-level jet de Sudamérica (SALLJ)','Entrada de viento húmedo del Atlántico','Polvo grueso en suspensión','Sistemas de baja presión en superficie'],
      escala:[{label:'Húmedo/frío',color:'#ffffff'},{label:'Normal',color:'#6688aa'},{label:'Seco/cálido',color:'#884400'}] }},

  { id:'11', nombre:'Banda 11 — Fase de Cima de Nubes', nombreCorto:'B11 Fase',
    longitud:'8.44 µm', tipo:'ir', color:'#67e8f9',
    descripcion:'Hielo vs agua · Banda de ozono · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band11.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Centrada en la banda de absorción del ozono (8.6 µm). Las nubes de hielo tienen emisividad distinta de las de agua en esta longitud. Usada junto a B13 para determinar la fase de partículas (ice vs liquid). También sensible a contaminación por polvo, ya que los minerales de silicato tienen emisividad anómala alrededor de 8-9 µm.',
      aplicaciones:['Fase de partículas en cimas de nubes','Ozono total columna (variaciones grandes)','Detección de polvo (complemento Dust RGB)','Topografía de cimas de nubes convectivas','Diferenciación de tipos de nubes altas'],
      escala:[{label:'Nubes de hielo (emisividad alta)',color:'#ccffff'},{label:'Nubes mixtas',color:'#8888aa'},{label:'Nubes de agua (emisividad baja)',color:'#aaccff'},{label:'Superficie',color:'#884400'}] }},

  { id:'12', nombre:'Banda 12 — Ozono', nombreCorto:'B12 Ozono',
    longitud:'9.61 µm', tipo:'ir', color:'#86efac',
    descripcion:'Ozono total · Tropopausa dinámica · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band12.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Centrada en la banda de absorción del ozono estratosférico (9.6 µm). Permite detectar variaciones en la columna total de ozono y, en particular, las intrusiones de aire estratosférico pobre en ozono (agujeros dinámicos de ozono) relacionados con la tropopausa dinámica. Forma parte del AirMass RGB (canal G).',
      aplicaciones:['Intrusiones estratosféricas con ozono bajo','Tropopausa dinámica sobre los Andes','Predicción de turbulencia en altura (CAT)','Monitoreo del agujero de ozono antártico (con cobertura total)','Componente del AirMass RGB'],
      escala:[{label:'Ozono alto (frío)',color:'#ffffff'},{label:'Normal',color:'#88aa88'},{label:'Ozono bajo (cálido)',color:'#ff8800'}] }},

  { id:'13', nombre:'Banda 13 — IR Limpia Onda Larga', nombreCorto:'B13 IR Limpia',
    longitud:'10.35 µm', tipo:'ir', color:'#fcd34d',
    descripcion:'Canal IR principal · Temperatura de cima · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band13.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Canal IR principal del ABI, correspondiente a la ventana "limpia" a 10.35 µm con mínima absorción de vapor de agua. Convierte radiancia a temperatura de brillo (Tb). Nubes brillantes = frías = altas. Paleta estándar NOAA: escala de grises invertida con realces en color para temperaturas por debajo de -40°C. Indispensable para seguimiento de ciclones, análisis de convección y estimación de lluvia (técnicas GOES-rainfall).',
      aplicaciones:['Temperatura de cima de nubes (estándar)',
                    'Seguimiento de ciclones tropicales y extratropicales',
                    'Estimación de lluvia (técnica Hydroestimator/GOES-Rainfall)',
                    'Temperatura superficial del mar (zonas claras)',
                    'Clasificación de nubes y determinación de tope',
                    'Base de Sandwich RGB y otros compuestos'],
      escala:[{label:'<-60°C convección profunda',color:'#aa00ff'},{label:'-60 a -40°C',color:'#ff0000'},{label:'-40 a -20°C',color:'#ffaa00'},{label:'-20 a 0°C',color:'#ffff00'},{label:'0 a +20°C',color:'#cccccc'},{label:'>+20°C (superficie cálida)',color:'#884400'}] }},

  { id:'14', nombre:'Banda 14 — Ventana IR Onda Larga', nombreCorto:'B14 IR Ventana',
    longitud:'11.19 µm', tipo:'ir', color:'#fbbf24',
    descripcion:'TSM · Vientos derivados · Temperatura · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band14.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Canal IR ventana a 11.19 µm. Ligeramente más sensible al vapor de agua bajo que B13 ("ventana más sucia"). Combinada con B13 se usa para corregir la absorción atmosférica en la estimación de temperatura superficial del mar (TSM). También es el canal base para los Vientos Derivados de Movimiento (DMW) en el infrarrojo.',
      aplicaciones:['Temperatura superficial del mar en el Atlántico Sur','Vientos derivados de movimiento (DMW-IR)','Análisis de temperatura combinado B13/B14','Frentes oceánicos (Corriente de Malvinas)','Temperatura de isla de calor urbana'],
      escala:[{label:'Nubes muy frías',color:'#ffffff'},{label:'Nubes frías',color:'#8888ff'},{label:'Nubes templadas',color:'#44cc44'},{label:'Superficie cálida',color:'#ff8800'},{label:'Superficie muy cálida',color:'#ff2200'}] }},

  { id:'15', nombre:'Banda 15 — Ventana OL Sucia', nombreCorto:'B15 IR Sucia',
    longitud:'12.30 µm', tipo:'ir', color:'#f97316',
    descripcion:'Split window · Polvo mineral · TSM · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band15.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Ventana IR "sucia" por mayor absorción de vapor de agua respecto a B13/B14. La diferencia B15−B13 (técnica "split window") es positiva para superficies normales y negativa para polvo mineral, lo que permite detectar y mapear nubes de polvo. También mejora la estimación de TSM al corregir el efecto del vapor de agua.',
      aplicaciones:['Detección de polvo mineral (split window B15-B13 < 0)','TSM mejorada (corrección atmosférica)','Niebla densa vs estratocúmulo','Detección de ceniza volcánica (junto a B13)','Componente del Dust RGB'],
      escala:[{label:'Nubes muy frías',color:'#ffffff'},{label:'Nubes medias',color:'#8888aa'},{label:'Polvo mineral (split window negativo)',color:'#ff88aa'},{label:'Superficie',color:'#884400'}] }},

  { id:'16', nombre:'Banda 16 — CO₂ IR Onda Larga', nombreCorto:'B16 CO₂',
    longitud:'13.30 µm', tipo:'ir', color:'#ef4444',
    descripcion:'Altura de cima de nubes · CO₂ troposférico · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band16.pdf',
    ref:{ resolucion:'2 km', frecuencia:'Cada 10 min (sector SSA)',
      descripcionLarga:'Centrada en la banda de absorción del CO₂ a 13.3 µm. La atmósfera es opaca en superficie; el satélite ve capas troposféricas medias-altas. Combinando B16 con B13 se puede estimar la altura de la cima de nubes sin sondeos adicionales. También detecta variaciones en la columna de CO₂ troposférico en escenarios extremos.',
      aplicaciones:['Altura de cima de nubes (combinado con B13)','Temperatura efectiva de nubes altas','Contraste nube-cielo claro en altura','Análisis de perfil vertical de temperatura','Complemento de técnicas de estimación de cima'],
      escala:[{label:'Nubes muy altas (frío)',color:'#ffffff'},{label:'Nubes medias',color:'#888888'},{label:'Troposfera media/baja',color:'#884400'}] }},
]

const TIPO_LABELS: Record<BandType,string> = { visible:'Visible','near-ir':'IR Cercano',ir:'Infrarrojo',rgb:'RGB' }
const TIPO_STYLE:  Record<BandType,string>  = {
  visible:  'border-blue-400/40 bg-blue-400/10 text-blue-300',
  'near-ir':'border-green-400/40 bg-green-400/10 text-green-300',
  ir:       'border-orange-400/40 bg-orange-400/10 text-orange-300',
  rgb:      'border-purple-400/40 bg-purple-400/10 text-purple-300',
}

const FRAME_COUNTS = [12,24,36,48,60,72,84,96,120,150,180,240]
const RESOLUTIONS  = [{value:'600',label:'600 px'},{value:'1200',label:'1200 px'}]

// ── Root export ────────────────────────────────────────────────
export function ImageryClient() {
  const [sel,setSel] = useState<Channel|null>(null)
  if (!sel) return <ChannelGrid onSelect={setSel}/>
  return <AnimationView channel={sel} onBack={()=>setSel(null)}/>
}

// ── Channel grid ───────────────────────────────────────────────
function ChannelGrid({ onSelect }:{ onSelect:(c:Channel)=>void }) {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-widest text-text-primary">
          Imágenes Satelitales ABI
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          GOES-19 · Sector Sudamérica Sur (SSA) · Actualización cada 10 minutos
        </p>
      </div>

      <section>
        <p className="section-label mb-3">Productos RGB y Compuestos</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {CHANNELS.filter(c=>c.tipo==='rgb').map(ch=>(
            <ChannelCard key={ch.id} channel={ch} onSelect={onSelect}/>
          ))}
        </div>
      </section>

      <section>
        <p className="section-label mb-3">Bandas ABI Individuales — Canales 1 al 16</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {CHANNELS.filter(c=>c.tipo!=='rgb').map(ch=>(
            <ChannelCard key={ch.id} channel={ch} onSelect={onSelect}/>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        {(Object.entries(TIPO_STYLE) as [BandType,string][]).map(([t,s])=>(
          <span key={t} className={cn('badge border text-xs',s)}>{TIPO_LABELS[t]}</span>
        ))}
      </div>
    </div>
  )
}

function ChannelCard({ channel:ch, onSelect }:{ channel:Channel; onSelect:(c:Channel)=>void }) {
  const [ok,setOk]=useState(true)
  const thumbSrc = proxy(`${CDN}/${ch.id}/600x600.jpg`)
  return (
    <button onClick={()=>onSelect(ch)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background-card
                 transition-all hover:border-border-accent hover:shadow-glow-blue hover:scale-[1.02]">
      <div className="relative aspect-square w-full overflow-hidden bg-background-secondary">
        {ok
          ? <img src={thumbSrc} alt={ch.nombre}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={()=>setOk(false)}/>
          : <div className="flex h-full items-center justify-center">
              <span className="text-2xs text-text-dim">{ch.id}</span>
            </div>}
        <span className={cn('absolute top-1 right-1 badge border text-2xs',TIPO_STYLE[ch.tipo])}>
          {TIPO_LABELS[ch.tipo]}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-2 text-left">
        <span className="text-xs font-semibold leading-tight" style={{color:ch.color}}>{ch.nombreCorto}</span>
        {ch.longitud&&<span className="font-data text-2xs text-text-muted">{ch.longitud}</span>}
        <p className="text-2xs leading-snug text-text-muted line-clamp-2">{ch.descripcion}</p>
      </div>
    </button>
  )
}

// ── Animation view ─────────────────────────────────────────────
function AnimationView({ channel, onBack }:{ channel:Channel; onBack:()=>void }) {
  const [frameCount,setFrameCount] = useState(24)
  const [resolution,setResolution] = useState('600')
  const [playMode,setPlayMode]     = useState<PlayMode>('loop')
  const [playing,setPlaying]       = useState(false)  // start paused until images load
  const [idx,setIdx]               = useState(0)
  const [speedMs,setSpeedMs]       = useState(250)
  const [showGrid,setShowGrid]     = useState(false)
  const [showInfo,setShowInfo]     = useState(false)
  const [loadedSet,setLoadedSet]   = useState<Set<number>>(new Set())
  const [genKey,setGenKey]         = useState(0)  // increment to regenerate frames

  const rockDir = useRef<1|-1>(1)
  const ticker  = useRef<ReturnType<typeof setInterval>|null>(null)

  // Generate frames client-side — no API needed
  const frames = useMemo(
    () => generateFrames(channel.id, frameCount, resolution),
    [channel.id, frameCount, resolution, genKey] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const total = frames.length

  // Reset when channel/frameCount changes
  useEffect(()=>{ setIdx(0); setLoadedSet(new Set()); setPlaying(false) },[channel.id,frameCount,resolution])

  // Auto-start playing once first frame loads
  useEffect(()=>{ if(loadedSet.size>=1 && !playing) setPlaying(true) },[loadedSet.size])

  // Auto-refresh: regenerate frame list every 10 min
  useEffect(()=>{
    const id = setInterval(()=>setGenKey(k=>k+1), 10*60*1000)
    return ()=>clearInterval(id)
  },[])

  // Playback
  useEffect(()=>{
    if(ticker.current) clearInterval(ticker.current)
    if(!playing||total===0) return
    ticker.current = setInterval(()=>{
      setIdx(prev=>{
        if(playMode==='loop') return (prev+1)%total
        const next=prev+rockDir.current
        if(next>=total-1){rockDir.current=-1;return total-1}
        if(next<=0){rockDir.current=1;return 0}
        return next
      })
    },speedMs)
    return ()=>{ if(ticker.current) clearInterval(ticker.current) }
  },[playing,speedMs,playMode,total])

  const frame      = frames[idx]
  const fps        = Math.round(1000/speedMs)
  const loadedCount= loadedSet.size

  const markLoaded = useCallback((i:number)=>{
    setLoadedSet(prev=>{ const s=new Set(prev); s.add(i); return s })
  },[])

  const toPrev = ()=>{ setPlaying(false); setIdx(i=>Math.max(0,i-1)) }
  const toNext = ()=>{ setPlaying(false); setIdx(i=>Math.min(total-1,i+1)) }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="ctrl-btn"><ChevronLeft size={16}/></button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold uppercase tracking-widest truncate"
              style={{color:channel.color}}>{channel.nombre}</h1>
          <p className="text-xs text-text-muted">
            GOES-19 · SSA{channel.longitud?` · ${channel.longitud}`:''} · {channel.descripcion}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={frameCount} onChange={e=>{setFrameCount(Number(e.target.value))}}
            className="rounded border border-border bg-background-secondary px-2 py-1 text-xs text-text-secondary">
            {FRAME_COUNTS.map(n=><option key={n} value={n}>{n} imágenes</option>)}
          </select>
          <select value={resolution} onChange={e=>setResolution(e.target.value)}
            className="rounded border border-border bg-background-secondary px-2 py-1 text-xs text-text-secondary">
            {RESOLUTIONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button onClick={()=>{ setGenKey(k=>k+1); setLoadedSet(new Set()); setPlaying(false) }}
            className="ctrl-btn" title="Regenerar frames">
            <RefreshCw size={13}/>
          </button>
          <button onClick={()=>setShowInfo(v=>!v)} className={cn('ctrl-btn',showInfo&&'active')}>
            <Info size={13}/>
          </button>
        </div>
      </div>

      {showInfo&&(
        <div className="card space-y-2">
          <p className="text-sm text-text-secondary">{channel.ref.descripcionLarga}</p>
          {channel.ref.receta&&(
            <div className="rounded border border-border bg-background-secondary px-3 py-2">
              <span className="text-2xs text-text-dim uppercase tracking-wider">Receta RGB: </span>
              <span className="font-data text-xs text-accent-cyan">{channel.ref.receta}</span>
            </div>
          )}
          <a href={channel.docUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-border bg-background-secondary px-3 py-1.5 text-xs text-text-secondary hover:text-primary transition-colors">
            <ExternalLink size={11}/> Guía PDF oficial
          </a>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        {/* Left: image + controls */}
        <div className="space-y-2">
          {/* Loading progress bar */}
          {loadedCount < total && (
            <div className="h-1 w-full rounded-full bg-border overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300"
                   style={{width:`${(loadedCount/total)*100}%`}}/>
            </div>
          )}

          {/* Image display */}
          <div className="relative overflow-hidden rounded-lg border border-border bg-black"
               style={{aspectRatio:'1/1'}}>
            {/* Preload all frames (hidden), show only current */}
            <div className="hidden">
              {frames.map((f,i)=>(
                <img key={f.url} src={f.url}
                  onLoad={()=>markLoaded(i)}
                  onError={()=>markLoaded(i)}
                  alt=""/>
              ))}
            </div>

            {loadedCount===0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-primary"/>
                <span className="text-sm text-text-muted">Cargando imágenes del satélite…</span>
                <span className="text-xs text-text-dim">Conectando con NOAA CDN</span>
              </div>
            ) : (
              <>
                <img key={`${frame.url}-${idx}`}
                  src={frame.url}
                  alt={frame.label}
                  className="h-full w-full object-contain"
                />
                {showGrid&&(
                  <svg className="pointer-events-none absolute inset-0 h-full w-full"
                       viewBox="0 0 100 100" preserveAspectRatio="none">
                    {[20,40,60,80].map(y=>(
                      <g key={y}>
                        <line x1="0" y1={y} x2="100" y2={y}
                          stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" strokeDasharray="2,2"/>
                        <text x="1" y={y-1} fill="rgba(255,255,255,0.6)"
                          fontSize="3" fontFamily="monospace">{100-y}%</text>
                      </g>
                    ))}
                    {[20,40,60,80].map(x=>(
                      <g key={x}>
                        <line x1={x} y1="0" x2={x} y2="100"
                          stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" strokeDasharray="2,2"/>
                        <text x={x+1} y="4" fill="rgba(255,255,255,0.6)"
                          fontSize="3" fontFamily="monospace">{x}%</text>
                      </g>
                    ))}
                  </svg>
                )}
                <div className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5">
                  <span className="font-data text-xs text-white">{frame.label}</span>
                </div>
                <div className="absolute top-2 right-2 rounded bg-black/80 px-2 py-0.5">
                  <span className="font-data text-xs text-text-secondary">{idx+1}/{total}</span>
                </div>
              </>
            )}
          </div>

          {/* Slider */}
          <div className="px-1">
            <input type="range" min={0} max={Math.max(0,total-1)} value={idx}
              onChange={e=>{ setPlaying(false); setIdx(Number(e.target.value)) }}
              className="w-full accent-primary" disabled={total===0}/>
            <div className="flex justify-between text-2xs text-text-dim mt-0.5">
              {frames[0]&&<span>{frames[0].label.split('—')[1]?.trim()}</span>}
              {frame&&<span className="text-accent-cyan font-semibold">{frame.label}</span>}
              {frames[total-1]&&frames[total-1]!==frames[0]&&
                <span>{frames[total-1].label.split('—')[1]?.trim()}</span>}
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2">
            <button className="ctrl-btn" onClick={toPrev} title="Frame anterior"><SkipBack size={14}/></button>
            <button className={cn('ctrl-btn',playing&&'active')} onClick={()=>setPlaying(v=>!v)}>
              {playing?<Pause size={14}/>:<Play size={14}/>}
            </button>
            <button className="ctrl-btn" onClick={toNext} title="Frame siguiente"><SkipForward size={14}/></button>
            <button className="ctrl-btn" onClick={()=>setIdx(total-1)} title="Ir al último frame">
              <RotateCcw size={14}/>
            </button>

            <div className="h-4 w-px bg-border mx-1"/>

            <button className="ctrl-btn" onClick={()=>setSpeedMs(s=>Math.min(1000,s+50))} title="Más lento">
              <Minus size={13}/>
            </button>
            <span className="font-data text-xs text-text-muted w-10 text-center tabular-nums">{fps} fps</span>
            <button className="ctrl-btn" onClick={()=>setSpeedMs(s=>Math.max(50,s-50))} title="Más rápido">
              <Plus size={13}/>
            </button>

            <div className="h-4 w-px bg-border mx-1"/>

            <select value={playMode} onChange={e=>setPlayMode(e.target.value as PlayMode)}
              className="rounded border border-border bg-background px-2 py-1 text-xs text-text-secondary">
              <option value="loop">Loop</option>
              <option value="rock">Vaivén</option>
            </select>

            <button className={cn('ctrl-btn',showGrid&&'active')} onClick={()=>setShowGrid(v=>!v)} title="Grilla">
              <Grid3x3 size={14}/>
            </button>

            <div className="ml-auto">
              <button className="ctrl-btn" title="Descargar frame actual"
                onClick={()=>{
                  const a=document.createElement('a')
                  a.href=frame?.rawUrl??''; a.download=frame?.filename??''; a.target='_blank'; a.click()
                }} disabled={!frame}>
                <Download size={13}/>
              </button>
            </div>
          </div>

          {/* References panel */}
          <BandReferencePanel channel={channel}/>
        </div>

        {/* Right panel */}
        <div className="space-y-3">
          {/* Channel info */}
          <div className="card space-y-3">
            <p className="section-label">Canal</p>
            <div className="space-y-2">
              <div>
                <p className="text-2xs text-text-dim">Nombre</p>
                <p className="font-display text-sm font-bold" style={{color:channel.color}}>
                  {channel.nombreCorto}
                </p>
              </div>
              {channel.longitud&&(
                <div>
                  <p className="text-2xs text-text-dim">Longitud de onda</p>
                  <p className="font-data text-xs text-text-primary">{channel.longitud}</p>
                </div>
              )}
              {channel.ref.resolucion&&(
                <div>
                  <p className="text-2xs text-text-dim">Resolución espacial</p>
                  <p className="font-data text-xs text-text-primary">{channel.ref.resolucion}</p>
                </div>
              )}
              {channel.ref.frecuencia&&(
                <div>
                  <p className="text-2xs text-text-dim">Frecuencia</p>
                  <p className="font-data text-xs text-text-primary">{channel.ref.frecuencia}</p>
                </div>
              )}
              {channel.ref.notaDiurna&&(
                <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1">
                  <p className="text-xs text-amber-400">☀ {channel.ref.notaDiurna}</p>
                </div>
              )}
              <div>
                <p className="text-2xs text-text-dim">Tipo</p>
                <span className={cn('badge border text-xs',TIPO_STYLE[channel.tipo])}>
                  {TIPO_LABELS[channel.tipo]}
                </span>
              </div>
              {frame&&(
                <div>
                  <p className="text-2xs text-text-dim">Frame actual</p>
                  <p className="font-data text-xs text-accent-cyan">{frame.label}</p>
                </div>
              )}
              <div>
                <p className="text-2xs text-text-dim mb-1">Aplicaciones</p>
                <ul className="space-y-0.5">
                  {channel.ref.aplicaciones.map(a=>(
                    <li key={a} className="text-xs text-text-secondary before:content-['›_'] before:text-text-dim">{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Downloads */}
          <div className="card space-y-2">
            <p className="section-label">Descargas</p>
            <p className="text-2xs text-text-muted">Última imagen disponible</p>
            {['300','600','1200','2400'].map(res=>(
              <a key={res} href={`${CDN}/${channel.id}/${res}x${res}.jpg`}
                download={`GOES19-ssa-${channel.id}-${res}x${res}.jpg`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between rounded border border-border bg-background-secondary
                           px-2 py-1.5 text-xs text-text-secondary hover:border-primary/50 hover:text-primary transition-colors">
                <span>JPG {res}×{res} px</span><Download size={11}/>
              </a>
            ))}
            <p className="text-2xs text-text-muted pt-1 border-t border-border">GIF animado (últimas 24 h)</p>
            {['600','1200'].map(res=>(
              <a key={res} href={`${CDN}/${channel.id}/${res}x${res}.gif`}
                download={`GOES19-ssa-${channel.id}-${res}x${res}.gif`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between rounded border border-border bg-background-secondary
                           px-2 py-1.5 text-xs text-text-secondary hover:border-primary/50 hover:text-primary transition-colors">
                <span>GIF animado {res}×{res}</span><Download size={11}/>
              </a>
            ))}
          </div>

          {/* Documentation — solo guia PDF, sin link NOAA/STAR */}
          <div className="card space-y-2">
            <p className="section-label">Documentación</p>
            <a href={channel.docUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded border border-border bg-background-secondary p-2
                         text-xs text-text-secondary hover:border-primary/50 hover:text-primary transition-colors">
              <ExternalLink size={12} className="shrink-0"/> Guía de referencia rápida (PDF)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Band reference panel ───────────────────────────────────────
function BandReferencePanel({ channel }:{ channel:Channel }) {
  return (
    <div className="rounded-lg border border-border bg-background-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="section-label">Referencia del Canal</p>
        <span className={cn('badge border text-xs',TIPO_STYLE[channel.tipo])}>{TIPO_LABELS[channel.tipo]}</span>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">{channel.ref.descripcionLarga}</p>

      {channel.ref.receta&&(
        <div className="rounded border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2 space-y-0.5">
          <p className="text-2xs uppercase tracking-wider text-text-dim">Receta / Composición</p>
          <p className="font-data text-xs text-accent-cyan">{channel.ref.receta}</p>
        </div>
      )}

      {channel.ref.escala&&channel.ref.escala.length>0&&(
        <div className="space-y-2">
          <p className="text-2xs uppercase tracking-wider text-text-dim">Escala de colores</p>
          <div className="h-5 w-full overflow-hidden rounded border border-white/10"
            style={{background:`linear-gradient(to right,${channel.ref.escala.map(e=>e.color).join(',')})`}}/>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {channel.ref.escala.map(e=>(
              <div key={e.label} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded border border-white/20"
                  style={{backgroundColor:e.color}}/>
                <span className="text-2xs text-text-muted leading-tight">{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-2xs uppercase tracking-wider text-text-dim">Principales aplicaciones</p>
        <div className="flex flex-wrap gap-1.5">
          {channel.ref.aplicaciones.map(a=>(
            <span key={a} className="rounded border border-border bg-background-secondary px-2 py-0.5 text-2xs text-text-secondary">
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Technical specs row */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-3">
        {channel.longitud&&(
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-text-dim">λ central:</span>
            <span className="font-data text-xs font-semibold" style={{color:channel.color}}>{channel.longitud}</span>
          </div>
        )}
        {channel.ref.resolucion&&(
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-text-dim">Resolución:</span>
            <span className="font-data text-xs text-text-secondary">{channel.ref.resolucion}</span>
          </div>
        )}
        {channel.ref.frecuencia&&(
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-text-dim">Scan:</span>
            <span className="font-data text-xs text-text-secondary">{channel.ref.frecuencia}</span>
          </div>
        )}
        {channel.ref.notaDiurna&&(
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-amber-400">☀ {channel.ref.notaDiurna}</span>
          </div>
        )}
      </div>
    </div>
  )
}
