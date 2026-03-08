'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  Download, Grid3x3, ExternalLink, ChevronLeft,
  RefreshCw, Minus, Plus, Info, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────
type BandType = 'visible' | 'near-ir' | 'ir' | 'rgb'
type PlayMode = 'loop' | 'rock'

interface ColorEntry { label: string; color: string }
interface BandRef {
  descripcionLarga: string
  aplicaciones: string[]
  escala?: ColorEntry[]
  receta?: string
  notaDiurna?: string
  resolucion?: string
  frecuencia?: string
}
interface Channel {
  id: string
  nombre: string
  nombreCorto: string
  longitud?: string
  tipo: BandType
  color: string
  descripcion: string
  docUrl: string
  ref: BandRef
}
interface Frame {
  filename: string
  rawUrl: string   // direct CDN URL (for download)
  proxied: string  // /api/goes/img-proxy?url=...
}

// ── CDN helpers ────────────────────────────────────────────────
const CDN_ABI = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/SSA'
const CDN_GLM = 'https://cdn.star.nesdis.noaa.gov/GOES19/GLM/SECTOR/ssa/EXTENT3'

function cdnDir(id: string) {
  return id === 'EXTENT3' ? CDN_GLM : `${CDN_ABI}/${id}`
}

function proxy(url: string) {
  return `/api/goes/img-proxy?url=${encodeURIComponent(url)}`
}

function filenameToFrame(filename: string, id: string): Frame {
  const rawUrl = `${cdnDir(id)}/${filename}`
  return { filename, rawUrl, proxied: proxy(rawUrl) }
}

function formatLabel(filename: string): string {
  // filename starts with YYYYDDDHHMM (11 chars)
  const ts = filename.slice(0, 11)
  const year = parseInt(ts.slice(0, 4))
  const doy  = parseInt(ts.slice(4, 7))
  const hh   = ts.slice(7, 9)
  const mm   = ts.slice(9, 11)
  // Convert DOY to month/day
  const d = new Date(Date.UTC(year, 0, doy))
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d.getUTCDate().toString().padStart(2,'0')} ${months[d.getUTCMonth()]} ${year} — ${hh}:${mm} UTC`
}

// ── Channel catalogue ──────────────────────────────────────────
const CHANNELS: Channel[] = [
  // ─── RGBs ─────────────────────────────────────────────────
  { id:'GEOCOLOR', nombre:'GeoColor', nombreCorto:'GeoColor',
    tipo:'rgb', color:'#22d3ee', descripcion:'Color verdadero de día · IR multiespectral de noche',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_CIRA_Geocolor_20171019.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Algoritmo CIRA/CSU. Combina bandas visibles para simular color natural de día. El canal verde no existe en el ABI — se sintetiza desde B01/B02/B03. De noche usa B13 IR en paleta azul-gris.',
      receta:'Día: pseudo-verde = 0.45·B02 + 0.10·B03 + 0.45·B01 · Noche: B13 IR → paleta azul/gris CIRA',
      aplicaciones:['Nubes y frentes sinópticos','Humo y aerosoles','Hielo marino y nieve','Ciclones tropicales','Florescencia de algas'],
      escala:[{label:'Nubes altas frías',color:'#ffffff'},{label:'Nubes medias',color:'#c8d0e0'},{label:'Océano claro',color:'#3a6ea8'},{label:'Vegetación',color:'#3a7a3a'},{label:'Suelo/desierto',color:'#c8a040'},{label:'Noche (IR)',color:'#1a2a4a'}] }},

  { id:'AirMass', nombre:'Air Mass RGB', nombreCorto:'Air Mass RGB',
    tipo:'rgb', color:'#a78bfa', descripcion:'Masas de aire · Tropopausa dinámica · Jet stream',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_GOESR_AirMassRGB_final.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Compuesto EUMETSAT. Identifica masas de aire y dinámica de troposfera superior. Esencial para análisis sinóptico y ciclogénesis sobre Sudamérica.',
      receta:'R = B08 (6.2µm) − B10 (7.3µm)  ·  G = B12 (9.6µm) − B13 (10.3µm)  ·  B = B08 (6.2µm) invertido',
      aplicaciones:['Masas de aire polar vs tropical','Tropopausa dinámica','Vorticidad potencial','Jet stream sobre los Andes','Ciclogénesis explosiva'],
      escala:[{label:'Aire polar estratosférico',color:'#ff4444'},{label:'Aire polar troposférico',color:'#aa44aa'},{label:'Aire tropical húmedo',color:'#44aa44'},{label:'Nubes convectivas profundas',color:'#222244'},{label:'Cielo seco en altura',color:'#ff8844'}] }},

  { id:'DayNightCloudMicroCombo', nombre:'Día/Noche Micro Combo RGB', nombreCorto:'Día/Noche Micro Combo RGB',
    tipo:'rgb', color:'#6366f1', descripcion:'Microfísica diurna · Niebla nocturna',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_DayNightCloudMicroCombo.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Producto híbrido: microfísica de nubes de día, detección de niebla y nubes bajas de noche. Muy útil para niebla costera y de valles andinos.',
      receta:'Día: R=B06 · G=B02 · B=B01  ·  Noche: R=B07−B13 · G=B07 · B=B05',
      aplicaciones:['Niebla y nubes bajas nocturnas','Fase de partículas (gotitas vs hielo)','Niebla costera Pacífico/Atlántico','Potencial de precipitación','Inversiones térmicas en valles'],
      escala:[{label:'Agua líquida (día)',color:'#aa44ff'},{label:'Hielo (día)',color:'#ffffff'},{label:'Niebla/nubes bajas (noche)',color:'#ffaa00'},{label:'Cielo claro noche',color:'#2244aa'}] }},

  { id:'Dust', nombre:'Polvo RGB', nombreCorto:'Polvo RGB',
    tipo:'rgb', color:'#d97706', descripcion:'Polvo patagónico · Tolvaneras · Aerosoles gruesos',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_Dust_RGB.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Split-window diferencial para detectar polvo mineral. En SSA útil para polvo patagónico bajo viento zonda y tolvaneras en La Rioja, San Juan y Mendoza.',
      receta:'R = B15 − B13  ·  G = B13 − B11  ·  B = B13 invertido',
      aplicaciones:['Polvo patagónico (viento zonda)','Tolvaneras en zonas áridas','Polvo del Atacama','Transporte de aerosoles sobre el océano','Calidad del aire'],
      escala:[{label:'Polvo denso',color:'#ff88aa'},{label:'Polvo moderado',color:'#ffaacc'},{label:'Sin polvo',color:'#224422'},{label:'Nubes de hielo altas',color:'#ff2222'},{label:'Nubes de agua',color:'#ffffff'}] }},

  { id:'FireTemperature', nombre:'Temperatura de Incendios RGB', nombreCorto:'Temperatura de Incendios RGB',
    tipo:'rgb', color:'#ef4444', descripcion:'Temperatura y extensión de incendios activos',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_Fire_Temperature_RGB.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Usa IR de onda corta para detectar fuego activo día y noche. Detecta volcanes andinos (Copahue, Villarrica, Calbuco) y quemas en la pampa.',
      receta:'R = B07 (3.9µm)  ·  G = B06 (2.2µm)  ·  B = B05 (1.6µm)',
      aplicaciones:['Incendios forestales y de pastizales','Volcanes activos andinos','Quemas agrícolas en la pampa','Temperatura del frente de fuego'],
      escala:[{label:'Fuego >600°C (saturado)',color:'#ffffff'},{label:'Fuego caliente',color:'#ffff00'},{label:'Fuego moderado',color:'#ff4400'},{label:'Humo denso',color:'#884422'},{label:'Sin actividad ígnea',color:'#224422'}] }},

  { id:'Sandwich', nombre:'Sandwich RGB', nombreCorto:'Sandwich RGB',
    tipo:'rgb', color:'#f97316', descripcion:'Bandas 3 + 13 · Textura visible + temperatura IR',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/SandwichProduct.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Combina la alta resolución espacial del canal visible B03 (1 km) con la temperatura de cima del B13 (2 km). Detalle textural + información de altura de nubes simultáneamente.',
      receta:'B03 reflectancia (0.86µm, 1km) superpuesto sobre B13 IR (10.35µm)',
      aplicaciones:['Tormentas convectivas con detalle','Temperatura de cima con textura','Nubes bajas y niebla','Ciclones tropicales'],
      escala:[{label:'Nubes muy frías (<-60°C)',color:'#ff2222'},{label:'Nubes frías',color:'#ffaa00'},{label:'Nubes templadas',color:'#44cc44'},{label:'Nubes cálidas bajas',color:'#2244ff'}] }},

  { id:'EXTENT3', nombre:'GLM Densidad de Destellos', nombreCorto:'GLM Densidad de Destellos',
    tipo:'rgb', color:'#facc15', descripcion:'Destellos GLM + GeoColor · Tormentas eléctricas',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/GLM_Quick_Guides_May_2019.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'El GLM detecta destellos ópticos de rayos a 500 fotogramas/seg. EXTENT3 muestra densidad de extensión de cada destello superpuesta sobre GeoColor.',
      receta:'Fondo: GeoColor · Superposición: densidad GLM Flash Extent acumulada',
      aplicaciones:['Actividad eléctrica en tiempo real','Sistemas convectivos de mesoescala','Alerta de tormentas severas','Seguimiento de tormentas transfronterizas'],
      escala:[{label:'Alta densidad de rayos',color:'#ff0000'},{label:'Media densidad',color:'#ffaa00'},{label:'Baja densidad',color:'#ffff00'},{label:'Fondo GeoColor',color:'#3a6ea8'}] }},

  // ─── Bands 01–16 ───────────────────────────────────────────
  { id:'01', nombre:'1 - Visible: azul', nombreCorto:'1 - Visible: azul', longitud:'0.47 µm',
    tipo:'visible', color:'#60a5fa', descripcion:'Aerosoles · Calidad del aire · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band01.pdf',
    ref:{ resolucion:'1 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Canal azul visible a 0.47 µm. Sensible a dispersión de Rayleigh para detectar aerosoles finos y humo. Componente del compuesto GeoColor.',
      aplicaciones:['Profundidad óptica de aerosoles (AOD)','Humo de incendios','Calidad del aire en ciudades','Nubes de polvo fino'],
      escala:[{label:'Alta reflectancia',color:'#ffffff'},{label:'Moderada',color:'#888888'},{label:'Baja (océano)',color:'#111144'}] }},

  { id:'02', nombre:'2 - Visible: rojo', nombreCorto:'2 - Visible: rojo', longitud:'0.64 µm',
    tipo:'visible', color:'#f87171', descripcion:'Máxima resolución 0.5 km · Canal principal',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band02.pdf',
    ref:{ resolucion:'0.5 km — única banda a 500 m del ABI', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Único canal a 500 m de resolución. Canal principal para imágenes diurnas. Nieve y nubes son indistinguibles sin IR adicional.',
      aplicaciones:['Imágenes de alta resolución','Morfología de tormentas','Nieve superficial en los Andes','Monitoreo costero'],
      escala:[{label:'Muy brillante (nubes/nieve)',color:'#ffffff'},{label:'Brillante',color:'#cccccc'},{label:'Moderado (tierra)',color:'#888888'},{label:'Oscuro (océano)',color:'#111111'}] }},

  { id:'03', nombre:'3 - IR Cercano: Veggie', nombreCorto:'3 - IR Cercano: Veggie', longitud:'0.86 µm',
    tipo:'near-ir', color:'#4ade80', descripcion:'Vegetación · Cicatrices · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band03.pdf',
    ref:{ resolucion:'1 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'IR cercano 0.86 µm. Vegetación sana refleja fuertemente. Cicatrices de incendios aparecen muy oscuras. Permite calcular NDVI con B02.',
      aplicaciones:['NDVI y monitoreo de vegetación','Cicatrices de incendios forestales','Masas de agua','Componente de GeoColor sintético'],
      escala:[{label:'Vegetación densa',color:'#00cc00'},{label:'Vegetación escasa',color:'#668866'},{label:'Nubes',color:'#ffffff'},{label:'Agua',color:'#000033'},{label:'Cicatriz incendio',color:'#111111'}] }},

  { id:'04', nombre:'4 - IR Cercano: cirros', nombreCorto:'4 - IR Cercano: cirros', longitud:'1.37 µm',
    tipo:'near-ir', color:'#a5f3fc', descripcion:'Cirros delgados exclusivamente · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band04.pdf',
    ref:{ resolucion:'2 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Centrada en absorción de vapor de agua. Solo cirros por encima de la mayor parte del vapor son visibles. La superficie siempre aparece negra.',
      aplicaciones:['Cirros delgados en alta troposfera','Extensión de yunques de cumulonimbus','Nieve en alta montaña andina'],
      escala:[{label:'Cirros densos',color:'#ffffff'},{label:'Cirros delgados',color:'#888888'},{label:'Todo lo demás (negro)',color:'#000000'}] }},

  { id:'05', nombre:'5 - IR Cercano: nieve/hielo', nombreCorto:'5 - IR Cercano: nieve/hielo', longitud:'1.60 µm',
    tipo:'near-ir', color:'#e0f2fe', descripcion:'Nieve/hielo vs nubes de agua · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band05.pdf',
    ref:{ resolucion:'1 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Nieve/hielo absorben fuertemente a 1.6 µm (oscuro). Nubes de agua líquida son brillantes. Discriminación perfecta nieve/granizo vs nubes — crítico para los Andes y Patagonia.',
      aplicaciones:['Cobertura nival en los Andes y Patagonia','Discriminar granizo en tormentas','Glaciares patagónicos','Fase de partículas en nubes'],
      escala:[{label:'Nubes de agua (brillante)',color:'#ffffff'},{label:'Nubes mixtas',color:'#aaaaaa'},{label:'Nieve/hielo (oscuro)',color:'#222266'},{label:'Glaciares',color:'#000044'}] }},

  { id:'06', nombre:'6 - IR Cercano: partículas de nube', nombreCorto:'6 - IR Cercano: partículas de nube', longitud:'2.24 µm',
    tipo:'near-ir', color:'#bfdbfe', descripcion:'Radio efectivo de partículas · Precipitación · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band06.pdf',
    ref:{ resolucion:'2 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Partículas pequeñas = brillante. Partículas grandes = oscuro. Indicador de potencial de precipitación en nubes convectivas.',
      aplicaciones:['Potencial de precipitación','Tamaño de gotitas en niebla marina','Identificación de nubes con granizo','Propiedades microfísicas para modelos'],
      escala:[{label:'Partículas pequeñas',color:'#ffffff'},{label:'Partículas medianas',color:'#888888'},{label:'Partículas grandes',color:'#111111'},{label:'Hielo/nieve',color:'#000044'}] }},

  { id:'07', nombre:'7 - IR: onda corta', nombreCorto:'7 - IR: onda corta', longitud:'3.90 µm',
    tipo:'ir', color:'#fb923c', descripcion:'Incendios · Niebla nocturna · Día y noche · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band07.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Fuegos activos saturan el detector (blanco brillante). La diferencia B07−B13 es el estándar para detectar niebla nocturna y nubes bajas de agua líquida.',
      aplicaciones:['Fuego activo día y noche','Niebla y nubes bajas nocturnas (B07-B13)','Temperatura de superficies cálidas','Volcanes andinos activos'],
      escala:[{label:'Fuego activo (saturado)',color:'#ffffff'},{label:'Muy cálido',color:'#ff2200'},{label:'Templado',color:'#ffff00'},{label:'Frío (nubes altas)',color:'#0044ff'}] }},

  { id:'08', nombre:'8 - IR: vapor de agua superior', nombreCorto:'8 - IR: vapor de agua superior', longitud:'6.19 µm',
    tipo:'ir', color:'#818cf8', descripcion:'Humedad troposfera alta · 300–600 hPa · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band08.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Sondea humedad entre ~300–600 hPa. Brillante = húmedo/frío. Oscuro = seco/cálido. Nunca ve la superficie. Sensible al jet stream sobre los Andes.',
      aplicaciones:['Jet stream sobre Sudamérica','Vorticidad potencial 500/300 hPa','Ondas de Rossby','Frentes en altura'],
      escala:[{label:'Muy húmedo',color:'#ffffff'},{label:'Húmedo',color:'#8888cc'},{label:'Normal',color:'#444488'},{label:'Seco',color:'#aa4400'},{label:'Muy seco',color:'#220000'}] }},

  { id:'09', nombre:'9 - IR: vapor de agua medio', nombreCorto:'9 - IR: vapor de agua medio', longitud:'6.93 µm',
    tipo:'ir', color:'#a78bfa', descripcion:'Humedad troposfera media · ~500 hPa · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band09.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Complementa B08 y B10 para perfil vertical de vapor de agua. Útil en frentes fríos sobre la pampa y el SALLJ.',
      aplicaciones:['Frentes fríos sobre la pampa','Corrientes de bajo nivel (SALLJ)','Predicción de convección en Argentina'],
      escala:[{label:'Muy húmedo',color:'#ffffff'},{label:'Normal',color:'#444488'},{label:'Seco',color:'#884400'}] }},

  { id:'10', nombre:'10 - IR: vapor de agua inferior', nombreCorto:'10 - IR: vapor de agua inferior', longitud:'7.34 µm',
    tipo:'ir', color:'#c4b5fd', descripcion:'Humedad troposfera baja · Capa límite · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band10.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Sondea troposfera baja (~750–850 hPa). Detecta entrada de aire húmedo del Atlántico (SALLJ) y gradientes de humedad en la pampa.',
      aplicaciones:['Capa límite sobre pampas','Low-level jet de Sudamérica (SALLJ)','Entrada de viento húmedo del Atlántico'],
      escala:[{label:'Húmedo/frío',color:'#ffffff'},{label:'Normal',color:'#6688aa'},{label:'Seco/cálido',color:'#884400'}] }},

  { id:'11', nombre:'11 - IR: fase de cima de nube', nombreCorto:'11 - IR: fase de cima de nube', longitud:'8.44 µm',
    tipo:'ir', color:'#67e8f9', descripcion:'Hielo vs agua líquida · Banda de ozono · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band11.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Diferencia de emisividad hielo/agua. Usada con B13 para fase de partículas. Sensible a polvo mineral (silicatos tienen emisividad anómala a 8-9 µm).',
      aplicaciones:['Fase de partículas en cimas de nubes','Complemento del Dust RGB','Diferenciación de tipos de nubes altas'],
      escala:[{label:'Nubes de hielo',color:'#ccffff'},{label:'Nubes de agua',color:'#aaccff'},{label:'Superficie',color:'#884400'}] }},

  { id:'12', nombre:'12 - IR: ozono', nombreCorto:'12 - IR: ozono', longitud:'9.61 µm',
    tipo:'ir', color:'#86efac', descripcion:'Ozono · Tropopausa dinámica · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band12.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Absorción del O₃. Detecta intrusiones estratosféricas y variaciones del agujero de ozono antártico. Componente del AirMass RGB.',
      aplicaciones:['Intrusiones estratosféricas','Tropopausa dinámica sobre los Andes','Turbulencia en altura (CAT)','Componente del AirMass RGB'],
      escala:[{label:'Ozono alto/frío',color:'#ffffff'},{label:'Normal',color:'#88aa88'},{label:'Ozono bajo/cálido',color:'#ff8800'}] }},

  { id:'13', nombre:'13 - IR: onda larga limpia', nombreCorto:'13 - IR: onda larga limpia', longitud:'10.35 µm',
    tipo:'ir', color:'#fcd34d', descripcion:'Canal IR principal · Temperatura de cima · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band13.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Canal IR principal del ABI. Ventana limpia 10.35 µm. Nubes brillantes = frías = altas. Paleta NOAA con realces de color en temperaturas < -40°C. Base de Sandwich RGB y estimación de lluvia.',
      receta:'Escala de grises invertida (frío=blanco) con realces: violeta <-60°C / rojo -60/-40°C / naranja -40/-20°C',
      aplicaciones:['Temperatura de cima estándar','Seguimiento de ciclones y tormentas','Estimación de lluvia (Hydroestimator)','TSM en zonas claras','Base del Sandwich RGB'],
      escala:[{label:'<-60°C tormentas profundas',color:'#aa00ff'},{label:'-60 a -40°C',color:'#ff0000'},{label:'-40 a -20°C',color:'#ffaa00'},{label:'-20 a 0°C',color:'#ffff00'},{label:'0 a +20°C',color:'#cccccc'},{label:'>+20°C superficie',color:'#884400'}] }},

  { id:'14', nombre:'14 - IR: onda larga', nombreCorto:'14 - IR: onda larga', longitud:'11.19 µm',
    tipo:'ir', color:'#fbbf24', descripcion:'TSM · Vientos derivados · Corriente de Malvinas · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band14.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Combinada con B13 para estimación de TSM corregida. Base para vientos derivados de movimiento (DMW-IR). Análisis de la Corriente de Malvinas y frentes oceánicos.',
      aplicaciones:['TSM en el Atlántico Sur','Corriente de Malvinas','Vientos derivados DMW-IR','Temperatura de isla de calor urbana'],
      escala:[{label:'Nubes frías',color:'#8888ff'},{label:'Nubes templadas',color:'#44cc44'},{label:'Superficie cálida',color:'#ff8800'}] }},

  { id:'15', nombre:'15 - IR: onda larga sucia', nombreCorto:'15 - IR: onda larga sucia', longitud:'12.30 µm',
    tipo:'ir', color:'#f97316', descripcion:'Split window · Polvo mineral · TSM corregida · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band15.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Ventana "sucia". La diferencia B15−B13 (split window) es negativa en polvo mineral — técnica estándar de detección. Mejora la estimación de TSM.',
      aplicaciones:['Detección de polvo (split window B15-B13)','TSM mejorada','Niebla densa','Ceniza volcánica','Componente del Dust RGB'],
      escala:[{label:'Nubes frías',color:'#ffffff'},{label:'Polvo mineral',color:'#ff88aa'},{label:'Superficie',color:'#884400'}] }},

  { id:'16', nombre:'16 - IR: CO₂ onda larga', nombreCorto:'16 - IR: CO₂ onda larga', longitud:'13.30 µm',
    tipo:'ir', color:'#ef4444', descripcion:'Altura de cima de nubes · CO₂ troposférico · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band16.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'Absorción del CO₂. Combinado con B13 permite estimar altura de cima de nubes sin sondeos adicionales. Ve capas troposféricas medias-altas.',
      aplicaciones:['Altura de cima de nubes','Temperatura efectiva de nubes altas','Perfil vertical de temperatura'],
      escala:[{label:'Nubes muy altas',color:'#ffffff'},{label:'Nubes medias',color:'#888888'},{label:'Troposfera baja',color:'#884400'}] }},
]

const TIPO_LABELS: Record<BandType,string> = { visible:'Visible','near-ir':'IR Cercano',ir:'Infrarrojo',rgb:'RGB' }
const TIPO_STYLE:  Record<BandType,string>  = {
  visible:  'border-blue-400/40 bg-blue-400/10 text-blue-300',
  'near-ir':'border-green-400/40 bg-green-400/10 text-green-300',
  ir:       'border-orange-400/40 bg-orange-400/10 text-orange-300',
  rgb:      'border-purple-400/40 bg-purple-400/10 text-purple-300',
}
const FRAME_COUNTS = [12,24,36,48,60,72,84,96,120,150,180,240]

// ── GOES-R ABI Projection (PUG-L2-Vol5 §4.2.8.2) ─────────────
// GOES-19 at 75.2°W · SSA sector (Southern South America)
// Scan-angle bounds derived from sector definition metadata
const GR = {
  Re: 6378.137, Rp: 6356.7523, H: 42164.16,
  lam0: -75.2 * Math.PI / 180,
  // SSA scan-angle bounds (radians) — calibrated to 3600×2160 image
  X_MIN: -0.101523, X_MAX:  0.066818,
  Y_MIN: -0.157217, Y_MAX: -0.055493,
  W: 3600, HT: 2160,
}

function goesProject(latDeg: number, lonDeg: number): [number,number] | null {
  const phi = latDeg * Math.PI / 180
  const lam = lonDeg * Math.PI / 180
  const { Re, Rp, H, lam0, X_MIN, X_MAX, Y_MIN, Y_MAX, W, HT } = GR
  const phi_c = Math.atan((Rp/Re)**2 * Math.tan(phi))
  const r_c   = Rp / Math.sqrt(1 - (1-(Rp/Re)**2) * Math.cos(phi_c)**2)
  const Sx = H - r_c * Math.cos(phi_c) * Math.cos(lam - lam0)
  const Sy = -r_c * Math.cos(phi_c) * Math.sin(lam - lam0)
  const Sz = r_c * Math.sin(phi_c)
  if (H*(H-Sx) < Sy**2 + (Re/Rp)**2 * Sz**2) return null
  const x = Math.asin(-Sy / Math.sqrt(Sx**2 + Sy**2 + Sz**2))
  const y = Math.atan(Sz / Sx)
  if (x < X_MIN || x > X_MAX || y < Y_MIN || y > Y_MAX) return null
  return [(x-X_MIN)/(X_MAX-X_MIN)*W, (Y_MAX-y)/(Y_MAX-Y_MIN)*HT]
}

interface GridLine { d: string; label: string }

function buildGridPaths() {
  type Seg = [number,number][]
  const flush = (cur: Seg, out: Seg[]) => { if(cur.length>1) out.push([...cur]); cur.length=0 }
  const toD   = (seg: Seg) => seg.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')

  const latLines: GridLine[] = []
  const lonLines: GridLine[] = []

  // Latitude parallels 10°N … 60°S every 10°
  for (let lat = 10; lat >= -60; lat -= 10) {
    const segs: Seg[] = []; const cur: Seg = []
    for (let lon = -115; lon <= -10; lon += 0.2) {
      const p = goesProject(lat, lon); p ? cur.push(p) : flush(cur, segs)
    }
    flush(cur, segs)
    segs.forEach(seg => {
      // Pin label to left edge: use the leftmost point of this segment
      const leftmost = seg.reduce((a,b) => a[0]<b[0] ? a : b)
      latLines.push({ d: toD(seg), label: `${lat}°` })
      // attach label coords via dataset trick — embed in path comment
      latLines[latLines.length-1] = { d: toD(seg), label: `${lat}°`, lx: leftmost[0], ly: leftmost[1] } as GridLine & {lx:number;ly:number}
    })
  }

  // Longitude meridians 100°W … 30°W every 10°
  for (let lon = -100; lon <= -30; lon += 10) {
    const segs: Seg[] = []; const cur: Seg = []
    for (let lat = 15; lat >= -65; lat -= 0.2) {
      const p = goesProject(lat, lon); p ? cur.push(p) : flush(cur, segs)
    }
    flush(cur, segs)
    segs.forEach(seg => {
      // Pin label to top edge: use the topmost point (smallest y)
      const topmost = seg.reduce((a,b) => a[1]<b[1] ? a : b)
      lonLines.push({ d: toD(seg), label: `${Math.abs(lon)}°O`, lx: topmost[0], ly: topmost[1] } as GridLine & {lx:number;ly:number})
    })
  }

  return { latLines, lonLines }
}

type GridLineExt = GridLine & { lx: number; ly: number }

function GeoGrid() {
  const { latLines, lonLines } = useMemo(buildGridPaths, [])
  // One label per unique lat/lon value, deduplicated
  const shownLat = new Set<string>()
  const shownLon = new Set<string>()

  const STROKE_W = 3
  const FONT     = 44
  const OUTLINE  = 10

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full"
         viewBox={`0 0 ${GR.W} ${GR.HT}`} preserveAspectRatio="none">
      {/* Dashed yellow grid lines */}
      <g stroke="rgba(255,210,0,0.75)" strokeWidth={STROKE_W} fill="none" strokeDasharray="18,12">
        {latLines.map((l,i)=><path key={`ll${i}`} d={l.d}/>)}
        {lonLines.map((l,i)=><path key={`lo${i}`} d={l.d}/>)}
      </g>
      {/* Latitude labels — left edge, one per degree */}
      {(latLines as GridLineExt[]).map((l,i)=>{
        if (shownLat.has(l.label)) return null
        shownLat.add(l.label)
        return (
          <text key={`tl${i}`}
            x={Math.max(l.lx, 12)} y={l.ly - 8}
            fill="rgba(255,210,0,1)" fontSize={FONT} fontFamily="monospace" fontWeight="bold"
            textAnchor="start"
            style={{paintOrder:'stroke' as never, stroke:'rgba(0,0,0,0.85)', strokeWidth:OUTLINE}}>
            {l.label}
          </text>
        )
      })}
      {/* Longitude labels — top edge, one per degree */}
      {(lonLines as GridLineExt[]).map((l,i)=>{
        if (shownLon.has(l.label)) return null
        shownLon.add(l.label)
        return (
          <text key={`tlo${i}`}
            x={l.lx} y={Math.max(l.ly + FONT, FONT + 8)}
            fill="rgba(255,210,0,1)" fontSize={FONT} fontFamily="monospace" fontWeight="bold"
            textAnchor="middle"
            style={{paintOrder:'stroke' as never, stroke:'rgba(0,0,0,0.85)', strokeWidth:OUTLINE}}>
            {l.label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Root ───────────────────────────────────────────────────────
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
          {CHANNELS.filter(c=>c.tipo==='rgb').map(ch=><ChannelCard key={ch.id} channel={ch} onSelect={onSelect}/>)}
        </div>
      </section>
      <section>
        <p className="section-label mb-3">Bandas ABI Individuales — Canales 1 al 16</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {CHANNELS.filter(c=>c.tipo!=='rgb').map(ch=><ChannelCard key={ch.id} channel={ch} onSelect={onSelect}/>)}
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
  const [ok,setOk] = useState(true)
  const isGlm = ch.id === 'EXTENT3'
  // Thumbnail: use latest symlink from CDN via proxy
  const thumbRaw = isGlm
    ? `${CDN_GLM}/latest.jpg`
    : `${CDN_ABI}/${ch.id}/latest.jpg`
  const thumbSrc = proxy(thumbRaw)

  return (
    <button onClick={()=>onSelect(ch)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background-card
                 transition-all hover:border-border-accent hover:shadow-glow-blue hover:scale-[1.02]">
      <div className="relative aspect-square w-full overflow-hidden bg-background-secondary">
        {ok
          ? <img src={thumbSrc} alt={ch.nombre}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={()=>setOk(false)}/>
          : <div className="flex h-full flex-col items-center justify-center gap-1">
              <span className="text-sm text-text-dim font-mono">{ch.id}</span>
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
  const [playMode,setPlayMode]     = useState<PlayMode>('loop')
  const [playing,setPlaying]       = useState(false)
  const [idx,setIdx]               = useState(0)
  const [speedMs,setSpeedMs]       = useState(250)
  const [showGrid,setShowGrid]     = useState(false)
  const [showInfo,setShowInfo]     = useState(false)
  const [frames,setFrames]         = useState<Frame[]>([])
  const [loadedSet,setLoadedSet]   = useState<Set<number>>(new Set())
  const [apiErr,setApiErr]         = useState<string|null>(null)
  const [fetching,setFetching]     = useState(false)
  const rockDir  = useRef<1|-1>(1)
  const ticker   = useRef<ReturnType<typeof setInterval>|null>(null)
  // loadKey invalidates markLoaded callbacks from previous loads
  const loadKey  = useRef(0)
  const total    = frames.length

  // ── Fetch real filenames from CDN directory listing ──────────
  const loadFrames = useCallback(async () => {
    const myKey = ++loadKey.current  // this load's generation
    setFetching(true)
    setApiErr(null)
    setFrames([])
    setLoadedSet(new Set())
    setPlaying(false)
    setIdx(0)
    try {
      const res  = await fetch(`/api/goes/imagery-list?band=${channel.id}&count=${frameCount}`)
      const data = await res.json()
      if (myKey !== loadKey.current) return  // stale — another load started
      if (!res.ok || !data.frames?.length) {
        setApiErr(data.error ?? `Sin imágenes (HTTP ${res.status})`)
      } else {
        setFrames(data.frames.map((fn: string) => filenameToFrame(fn, channel.id)))
      }
    } catch (e) {
      if (myKey !== loadKey.current) return
      setApiErr(String(e))
    } finally {
      if (myKey === loadKey.current) setFetching(false)
    }
  }, [channel.id, frameCount])

  useEffect(() => { loadFrames() }, [loadFrames])

  // Auto-refresh every 10 min
  useEffect(() => {
    const id = setInterval(loadFrames, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadFrames])

  // Auto-play only when ALL frames have finished loading (or erroring)
  useEffect(() => {
    if (total > 0 && loadedSet.size >= total && !playing) setPlaying(true)
  }, [loadedSet.size, total]) // eslint-disable-line react-hooks/exhaustive-deps

  // Playback ticker
  useEffect(() => {
    if (ticker.current) clearInterval(ticker.current)
    if (!playing || total === 0) return
    ticker.current = setInterval(() => {
      setIdx(prev => {
        if (playMode === 'loop') return (prev + 1) % total
        const next = prev + rockDir.current
        if (next >= total-1) { rockDir.current = -1; return total-1 }
        if (next <= 0)        { rockDir.current =  1; return 0 }
        return next
      })
    }, speedMs)
    return () => { if (ticker.current) clearInterval(ticker.current) }
  }, [playing, speedMs, playMode, total])

  const markLoaded = useCallback((i: number, key: number) => {
    if (key !== loadKey.current) return  // discard stale callbacks
    setLoadedSet(prev => { const s = new Set(prev); s.add(i); return s })
  }, [])

  const frame   = frames[idx]
  const fps     = Math.round(1000 / speedMs)
  const loadPct = total > 0 ? Math.round((loadedSet.size / total) * 100) : 0
  const allLoaded = total > 0 && loadedSet.size >= total
  const isGlm   = channel.id === 'EXTENT3'
  const curKey  = loadKey.current

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="ctrl-btn"><ChevronLeft size={16}/></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold uppercase tracking-widest truncate"
                style={{color:channel.color}}>{channel.nombre}</h1>
            <button onClick={()=>setShowInfo(v=>!v)}
              className={cn('ctrl-btn shrink-0',showInfo&&'active')} title="Información del canal">
              <Info size={13}/>
            </button>
          </div>
          <p className="text-xs text-text-muted">
            GOES-19 · SSA{channel.longitud?` · ${channel.longitud}`:''} · {channel.descripcion}
          </p>
        </div>
      </div>

      {showInfo&&(
        <div className="card space-y-2">
          <p className="text-sm text-text-secondary">{channel.ref.descripcionLarga}</p>
          {channel.ref.receta&&(
            <div className="rounded border border-border bg-background-secondary px-3 py-2">
              <span className="text-2xs text-text-dim uppercase tracking-wider">Receta: </span>
              <span className="font-data text-xs text-accent-cyan leading-relaxed">{channel.ref.receta}</span>
            </div>
          )}
          <a href={channel.docUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-border bg-background-secondary
                       px-3 py-1.5 text-xs text-text-secondary hover:text-primary transition-colors">
            <ExternalLink size={11}/> Guía PDF oficial
          </a>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        {/* Left: image + controls */}
        <div className="space-y-2">
          {/* Progress bar */}
          {frames.length > 0 && (
            <div className="h-1 w-full rounded-full bg-border overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300"
                   style={{width:`${loadPct}%`}}/>
            </div>
          )}

          {/* Image */}
          <div className="relative overflow-hidden rounded-lg border border-border bg-black"
               style={{aspectRatio: isGlm ? '5/3' : '5/3'}}>

            {/* Preload all frames hidden */}
            <div className="hidden">
              {frames.map((f,i)=>(
                <img key={`${curKey}-${f.proxied}`} src={f.proxied} alt=""
                  onLoad={()=>markLoaded(i, curKey)} onError={()=>markLoaded(i, curKey)}/>
              ))}
            </div>

            {apiErr ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
                <AlertTriangle size={32} className="text-orange-400"/>
                <p className="text-sm text-text-secondary text-center">Error cargando imágenes</p>
                <code className="text-xs text-red-400 text-center break-all">{apiErr}</code>
                <button onClick={loadFrames} className="ctrl-btn flex items-center gap-2">
                  <RefreshCw size={13}/> Reintentar
                </button>
              </div>
            ) : fetching ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-primary"/>
                <span className="text-sm text-text-muted">Consultando directorio NOAA…</span>
              </div>
            ) : !allLoaded ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-primary"/>
                <span className="text-sm text-text-muted">
                  Precargando imágenes {loadedSet.size}/{total}…
                </span>
                <span className="text-xs text-text-dim">La animación iniciará cuando estén listas</span>
              </div>
            ) : frame ? (
              <>
                <img key={`vis-${idx}-${frame.filename}`}
                  src={frame.proxied}
                  alt={formatLabel(frame.filename)}
                  className="h-full w-full object-contain"/>
                {showGrid && <GeoGrid />}
                <div className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5">
                  <span className="font-data text-xs text-white">{formatLabel(frame.filename)}</span>
                </div>
                <div className="absolute top-2 right-2 rounded bg-black/80 px-2 py-0.5">
                  <span className="font-data text-xs text-text-secondary">{idx+1}/{total}</span>
                </div>
              </>
            ) : null}
          </div>

          {/* Slider */}
          <div className="px-1">
            <input type="range" min={0} max={Math.max(0,total-1)} value={idx}
              onChange={e=>{setPlaying(false);setIdx(Number(e.target.value))}}
              className="w-full accent-primary" disabled={total===0}/>
            <div className="flex justify-between text-2xs text-text-dim mt-0.5">
              <span>{frames[0] ? formatLabel(frames[0].filename).split('—')[1]?.trim() : ''}</span>
              <span className="text-accent-cyan font-semibold">
                {frame ? formatLabel(frame.filename) : ''}
              </span>
              <span>{frames[total-1] ? formatLabel(frames[total-1].filename).split('—')[1]?.trim() : ''}</span>
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2">
            {/* Playback */}
            <button className="ctrl-btn" onClick={()=>{setPlaying(false);setIdx(i=>Math.max(0,i-1))}}>
              <SkipBack size={14}/>
            </button>
            <button className={cn('ctrl-btn',playing&&'active')} onClick={()=>setPlaying(v=>!v)}
              disabled={!allLoaded}>
              {playing?<Pause size={14}/>:<Play size={14}/>}
            </button>
            <button className="ctrl-btn" onClick={()=>{setPlaying(false);setIdx(i=>Math.min(total-1,i+1))}}>
              <SkipForward size={14}/>
            </button>
            <button className="ctrl-btn" onClick={()=>setIdx(total-1)} title="Último frame">
              <RotateCcw size={14}/>
            </button>

            <div className="h-4 w-px bg-border mx-1"/>

            {/* Speed */}
            <button className="ctrl-btn" onClick={()=>setSpeedMs(s=>Math.min(1000,s+50))}>
              <Minus size={13}/>
            </button>
            <span className="font-data text-xs text-text-muted tabular-nums whitespace-nowrap">{fps} fps</span>
            <button className="ctrl-btn" onClick={()=>setSpeedMs(s=>Math.max(50,s-50))}>
              <Plus size={13}/>
            </button>

            <div className="h-4 w-px bg-border mx-1"/>

            {/* Mode */}
            <select value={playMode} onChange={e=>setPlayMode(e.target.value as PlayMode)}
              className="rounded border border-border bg-background px-2 py-1 text-xs text-text-secondary">
              <option value="loop">Loop</option>
              <option value="rock">Vaivén</option>
            </select>

            {/* Grid toggle */}
            <button className={cn('ctrl-btn',showGrid&&'active')} onClick={()=>setShowGrid(v=>!v)}
              title="Grilla lat/lon">
              <Grid3x3 size={14}/>
            </button>

            <div className="h-4 w-px bg-border mx-1"/>

            {/* Frame count selector */}
            <select value={frameCount} onChange={e=>setFrameCount(Number(e.target.value))}
              className="rounded border border-border bg-background px-2 py-1 text-xs text-text-secondary"
              title="Cantidad de imágenes">
              {FRAME_COUNTS.map(n=><option key={n} value={n}>{n} img</option>)}
            </select>

            {/* Reload */}
            <button onClick={loadFrames}
              className={cn('ctrl-btn',fetching&&'opacity-50')}
              disabled={fetching} title="Recargar imágenes">
              <RefreshCw size={13} className={fetching?'animate-spin':''}/>
            </button>
          </div>

          <BandReferencePanel channel={channel}/>
        </div>

        {/* Right panel */}
        <div className="space-y-3">
          <div className="card space-y-3">
            <p className="section-label">Canal</p>
            <div className="space-y-2">
              <div>
                <p className="text-2xs text-text-dim">Nombre</p>
                <p className="font-display text-sm font-bold" style={{color:channel.color}}>{channel.nombreCorto}</p>
              </div>
              {channel.longitud&&<div>
                <p className="text-2xs text-text-dim">Longitud de onda</p>
                <p className="font-data text-xs text-text-primary">{channel.longitud}</p>
              </div>}
              {channel.ref.resolucion&&<div>
                <p className="text-2xs text-text-dim">Resolución espacial</p>
                <p className="font-data text-xs text-text-primary">{channel.ref.resolucion}</p>
              </div>}
              {channel.ref.frecuencia&&<div>
                <p className="text-2xs text-text-dim">Frecuencia</p>
                <p className="font-data text-xs text-text-primary">{channel.ref.frecuencia}</p>
              </div>}
              {channel.ref.notaDiurna&&(
                <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1">
                  <p className="text-xs text-amber-400">☀ {channel.ref.notaDiurna}</p>
                </div>
              )}
              <div>
                <p className="text-2xs text-text-dim">Tipo</p>
                <span className={cn('badge border text-xs',TIPO_STYLE[channel.tipo])}>{TIPO_LABELS[channel.tipo]}</span>
              </div>
              {frame&&<div>
                <p className="text-2xs text-text-dim">Frame actual</p>
                <p className="font-data text-xs text-accent-cyan">{formatLabel(frame.filename)}</p>
              </div>}
              {total > 0 && <div>
                <p className="text-2xs text-text-dim">Precargado</p>
                <p className="font-data text-xs text-text-secondary">{loadedSet.size}/{total} imágenes</p>
              </div>}
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
            {frame&&(
              <>
                <p className="text-2xs text-text-muted">Frame actual</p>
                <button onClick={()=>{
                  const a=document.createElement('a')
                  a.href=frame.rawUrl; a.download=frame.filename; a.target='_blank'; a.click()
                }}
                  className="flex w-full items-center justify-between rounded border border-border
                             bg-background-secondary px-2 py-1.5 text-xs text-text-secondary
                             hover:border-primary/50 hover:text-primary transition-colors">
                  <span className="truncate font-data">{frame.filename}</span>
                  <Download size={11} className="shrink-0 ml-1"/>
                </button>
              </>
            )}
            <p className="text-2xs text-text-muted pt-1 border-t border-border">GIF animado (últimas 24 h)</p>
            {(isGlm ? ['1200x720'] : ['1200x720','3600x2160']).map(res=>{
              const url = isGlm ? `${CDN_GLM}/${res}.gif` : `${CDN_ABI}/${channel.id}/${res}.gif`
              return (
                <a key={res} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between rounded border border-border
                             bg-background-secondary px-2 py-1.5 text-xs text-text-secondary
                             hover:border-primary/50 hover:text-primary transition-colors">
                  <span>GIF {res}</span><Download size={11}/>
                </a>
              )
            })}
          </div>

          {/* Documentation */}
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
        <div className="rounded border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2">
          <p className="text-2xs uppercase tracking-wider text-text-dim mb-1">Receta / Composición</p>
          <p className="font-data text-xs text-accent-cyan leading-relaxed">{channel.ref.receta}</p>
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
                <span className="text-2xs text-text-muted">{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-2xs uppercase tracking-wider text-text-dim">Principales aplicaciones</p>
        <div className="flex flex-wrap gap-1.5">
          {channel.ref.aplicaciones.map(a=>(
            <span key={a} className="rounded border border-border bg-background-secondary
                                     px-2 py-0.5 text-2xs text-text-secondary">{a}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-border pt-3">
        {channel.longitud&&<div className="flex items-center gap-1.5">
          <span className="text-2xs text-text-dim">λ:</span>
          <span className="font-data text-xs font-semibold" style={{color:channel.color}}>{channel.longitud}</span>
        </div>}
        {channel.ref.resolucion&&<div className="flex items-center gap-1.5">
          <span className="text-2xs text-text-dim">Res:</span>
          <span className="font-data text-xs text-text-secondary">{channel.ref.resolucion}</span>
        </div>}
        {channel.ref.notaDiurna&&(
          <span className="text-xs text-amber-400">☀ {channel.ref.notaDiurna}</span>
        )}
      </div>
    </div>
  )
}
