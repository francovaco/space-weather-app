'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  Download, Grid3x3, ExternalLink, ChevronLeft,
  RefreshCw, Minus, Plus, AlertTriangle,
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
      descripcionLarga:'Producto multiespectral compuesto por Color Verdadero (True Color, usando un componente verde simulado) durante el día, y un producto infrarrojo que combina las bandas 7 y 13 de noche. De día, las imágenes se ven aproximadamente como se verían con ojos humanos desde el espacio. De noche, los colores azules representan nubes de agua líquida como niebla y estratos, mientras que los tonos gris a blanco indican nubes altas de hielo, y las luces urbanas provienen de una base de datos estática derivada del VIIRS Day Night Band (JPSS). Desarrollado por CIRA y NOAA STAR/RAMMB. Nota: las áreas iluminadas en imágenes nocturnas no son representaciones en tiempo real de luces urbanas.',
      receta:'Día: True Color con verde simulado (B01/B02/B03) · Noche: IR bandas 7 + 13 · Luces urbanas: base estática VIIRS DNB',
      aplicaciones:['Nubes y frentes sinópticos','Niebla y estratos nocturnos (azul)','Nubes altas de hielo (gris/blanco)','Humo y aerosoles','Ciclones tropicales','Orientación nocturna con luces urbanas','Hielo marino y nieve'],
      escala:[] }},

  { id:'AirMass', nombre:'Air Mass RGB', nombreCorto:'Air Mass RGB',
    tipo:'rgb', color:'#a78bfa', descripcion:'Masas de aire · Tropopausa dinámica · Jet stream',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_GOESR_AirMassRGB_final.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'RGB basado en datos IR y vapor de agua. Diagnostica el entorno de sistemas sinópticos realzando características de temperatura y humedad de las masas de aire. Permite inferir ciclogénesis identificando aire estratosférico seco, cálido y rico en ozono descendente, asociado a jet streams y anomalías de vorticidad potencial (PV). Permite validar la ubicación de anomalías PV en datos de modelos y distinguir entre masas de aire polares y tropicales, especialmente a lo largo de límites frontales de niveles altos. También identifica nubes altas, medias y bajas.',
      receta:'R = B08 (6.2µm) − B10 (7.3µm)  ·  G = B12 (9.6µm) − B13 (10.3µm)  ·  B = B08 (6.2µm) invertido',
      aplicaciones:['Jet stream y zonas de deformación','Vorticidad potencial (PV) y anomalías','Ciclogénesis','Distinción masas de aire polares vs tropicales','Límites frontales en niveles altos','Identificación de nubes altas, medias y bajas'],
      escala:[{label:'Jet stream / PV / zonas de deformación / aire seco en altura',color:'#cc3300'},{label:'Masa de aire frío',color:'#2a1a6e'},{label:'Masa de aire cálido',color:'#44aa44'},{label:'Masa de aire cálido, menos humedad',color:'#8b7a2a'},{label:'Nube alta gruesa',color:'#ffffff'},{label:'Nube de nivel medio',color:'#d2a679'},{label:'Nube de nivel bajo',color:'#2a5a2a'},{label:'Efectos de limbo',color:'#6633aa'}] }},

  { id:'DayNightCloudMicroCombo', nombre:'Día/Noche Micro Combo RGB', nombreCorto:'Día/Noche Micro Combo RGB',
    tipo:'rgb', color:'#6366f1', descripcion:'Fase de nubes de día · Microfísica nocturna',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_DayNightCloudMicroCombo.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Producto combo desarrollado por el equipo STAR GOES para entregar el valor observacional del Day Cloud Phase Distinction RGB (día) y el Night Microphysics RGB (noche). De día: evalúa la fase de cimas de nubes en enfriamiento para monitorear iniciación convectiva, crecimiento y decaimiento de tormentas, e identificar nieve en superficie. Aprovecha diferencias de reflectancia entre canales visibles e IR cercano. Desarrollado por JMA para Himawari-8. De noche: distingue nubes bajas y niebla usando diferencias entre canales 10.4 y 3.9 µm, con el canal 12.4−10.4 µm como proxy de espesor de nube, realzando nubes cálidas/bajas donde la niebla es más probable.',
      receta:'Día: Day Cloud Phase RGB (B02, B05, IR) · Noche: Night Microphysics RGB (B07−B13, B13−B15, B13)',
      aplicaciones:['Fase de cima de nube (agua vs hielo)','Iniciación convectiva y crecimiento de tormentas','Nieve en superficie','Niebla y nubes bajas nocturnas','Distinción de tipos de nubes en atmósfera media y alta','Necesidades de pronóstico aeronáutico'],
      escala:[
        {label:'Día: Nubes bajas agua (cyan/lavanda)',color:'#88cccc'},{label:'Día: Nubes en glaciación (verde)',color:'#008800'},{label:'Día: Nieve (verde)',color:'#336633'},{label:'Día: Nubes altas hielo gruesas (amarillo)',color:'#cccc00'},{label:'Día: Nubes medias agua delgadas (magenta)',color:'#cc00cc'},{label:'Día: Nubes altas hielo delgadas (rojo-naranja)',color:'#cc4400'},{label:'Día: Superficie terrestre (azul)',color:'#3344aa'},{label:'Día: Superficie agua (negro)',color:'#000000'},
        {label:'Noche: Niebla (aqua opaco/gris)',color:'#668888'},{label:'Noche: Nube baja cálida (aqua)',color:'#00cccc'},{label:'Noche: Nube baja fría (verde brillante)',color:'#00ff00'},{label:'Noche: Nube media agua (verde claro)',color:'#88cc88'},{label:'Noche: Nube media gruesa agua/hielo (tostado)',color:'#ccaa77'},{label:'Noche: Nube alta delgada hielo (azul oscuro)',color:'#000088'},{label:'Noche: Nube alta muy delgada hielo (púrpura)',color:'#660088'},{label:'Noche: Nube alta gruesa (rojo oscuro)',color:'#880000'},{label:'Noche: Nube alta delgada (casi negro)',color:'#111111'},{label:'Noche: Nube alta gruesa muy fría (rojo/amarillo)',color:'#cc6600'}
      ] }},

  { id:'Dust', nombre:'Polvo RGB', nombreCorto:'Polvo RGB',
    tipo:'rgb', color:'#d97706', descripcion:'Polvo patagónico · Tolvaneras · Aerosoles gruesos',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_Dust_RGB.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Split-window diferencial para detectar polvo mineral. En SSA útil para polvo patagónico bajo viento zonda y tolvaneras en La Rioja, San Juan y Mendoza.',
      receta:'R = B15 − B13  ·  G = B13 − B11  ·  B = B13 invertido',
      aplicaciones:['Polvo patagónico (viento zonda)','Tolvaneras en zonas áridas','Polvo del Atacama','Transporte de aerosoles sobre el océano','Calidad del aire'],
      escala:[{label:'Polvo denso',color:'#ff88aa'},{label:'Polvo moderado',color:'#ffaacc'},{label:'Sin polvo',color:'#224422'},{label:'Nubes de hielo altas',color:'#ff2222'},{label:'Nubes de agua',color:'#ffffff'}] }},

  { id:'FireTemperature', nombre:'Temperatura de Incendios RGB', nombreCorto:'Temperatura de Incendios RGB',
    tipo:'rgb', color:'#ef4444', descripcion:'RGB para resaltar incendios e identificar los más intensos',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/QuickGuide_Fire_Temperature_RGB.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'Fire Temperature RGB permite identificar dónde se producen los incendios más intensos y diferenciarlos de los más "fríos". El RGB aprovecha que desde 3.9 µm hacia longitudes de onda más cortas, la radiación solar de fondo y la reflectancia superficial aumentan. Esto significa que los incendios deben ser más intensos para ser detectados por las bandas de 2.2 y 1.6 µm, ya que los incendios más intensos emiten más radiación en esas longitudes de onda. Por lo tanto, incendios pequeños/"fríos" solo aparecen a 3.9 µm y se ven rojos, mientras que aumentos en la intensidad del fuego aportan mayor contribución de los otros canales, resultando en blanco para los incendios muy intensos.',
      receta:'R = B07 (3.9µm)  ·  G = B06 (2.2µm)  ·  B = B05 (1.6µm)',
      aplicaciones:['Incendios forestales y de pastizales','Volcanes activos andinos','Quemas agrícolas en la pampa','Temperatura del frente de fuego'],
      escala:[{label:'Fuego templado',color:'#CC0000'},{label:'Fuego muy cálido',color:'#FF6600'},{label:'Fuego caliente',color:'#FFFF00'},{label:'Fuego muy caliente',color:'#FFFFFF'},{label:'Cicatrices de quema',color:'#800020'},{label:'Cielo despejado: tierra',color:'#660033'},{label:'Cielo despejado: tierra',color:'#FF69B4'},{label:'Cielo despejado: agua/nieve/noche',color:'#000000'},{label:'Nubes de agua',color:'#004488'},{label:'Nubes de hielo',color:'#008080'}] }},

  { id:'Sandwich', nombre:'Sandwich RGB', nombreCorto:'Sandwich RGB',
    tipo:'rgb', color:'#f97316', descripcion:'Combina banda visible 3 con IR banda 13',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/SandwichProduct.pdf',
    ref:{ frecuencia:'Cada 10 min · Sector SSA',
      descripcionLarga:'El beneficio del VIS/IR Sandwich RGB es que combina el alto detalle espacial de la banda visible 3 con la información de temperatura de la banda IR 13. Con este producto es posible monitorear las características de la cima de nubes de tormentas convectivas maduras, las cuales están relacionadas con la severidad.',
      receta:'Banda visible 3 (0.86µm, alta resolución espacial) combinada con banda IR 13 (10.35µm, temperatura)',
      aplicaciones:['Monitoreo de cimas de tormentas convectivas maduras','Características de severidad de tormentas','Detalle espacial con información de temperatura','Nubes bajas y niebla'],
      escala:[{label:'-15°C',color:'#ccccee'},{label:'-30°C',color:'#8888cc'},{label:'-45°C',color:'#4444aa'},{label:'-55°C',color:'#00ff00'},{label:'-65°C',color:'#ffff00'},{label:'-75°C',color:'#ff8800'},{label:'-85°C',color:'#ff0000'},{label:'-93°C',color:'#880000'}] }},

  { id:'EXTENT3', nombre:'GLM Densidad de Destellos', nombreCorto:'GLM Densidad de Destellos',
    tipo:'rgb', color:'#facc15', descripcion:'Destellos GLM + GeoColor · Tormentas eléctricas',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/GLM_Quick_Guides_May_2019.pdf',
    ref:{ frecuencia:'Cada 5 min · Sector SSA',
      descripcionLarga:'Densidad de Extensión de Destellos GLM (Flash Extent Density). Representa la cantidad de destellos de rayos que ocurren dentro de cada celda de grilla en un período de 5 minutos. FED es la mejor métrica individual para expresar tanto la cantidad como la extensión de la actividad eléctrica. La visualización superpone los datos GLM sobre una imagen de fondo GeoColor. Los datos GLM se producen entre 54°N y 54°S.',
      receta:'Fondo: GeoColor · Superposición: GLM Flash Extent Density acumulada en 5 minutos',
      aplicaciones:['Densidad de destellos por celda de grilla','Tendencia y evolución de tormentas','Cobertura geográfica de actividad eléctrica','Sistemas convectivos de mesoescala','Alerta de tormentas severas','Seguimiento de tormentas transfronterizas'],
      escala:[{label:'Extremo (>100 destellos/5min)',color:'#ffffff'},{label:'Muy alto (50–100)',color:'#ff00ff'},{label:'Alto (20–50)',color:'#ff0000'},{label:'Moderado-alto (10–20)',color:'#ffa500'},{label:'Moderado (5–10)',color:'#ffff00'},{label:'Bajo (2–5)',color:'#00ff00'},{label:'Muy bajo (1–2)',color:'#0000ff'}] }},

  // ─── Bands 01–16 ───────────────────────────────────────────
  { id:'01', nombre:'1 - Visible: azul', nombreCorto:'1 - Visible: azul', longitud:'0.47 µm',
    tipo:'visible', color:'#60a5fa', descripcion:'Aerosoles · Calidad del aire · 1 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band01.pdf',
    ref:{ resolucion:'1 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'0.47 µm – Banda azul – Resolución 1 km – La banda visible 1 está en la porción azul del espectro. Es particularmente útil para detectar aerosoles atmosféricos como humo y polvo (solo de día). La banda 1 es un canal visible y por lo tanto aparece en negro durante las horas nocturnas.',
      aplicaciones:['Profundidad óptica de aerosoles (AOD)','Humo de incendios','Calidad del aire en ciudades','Nubes de polvo fino'],
      escala:[] }},

  { id:'02', nombre:'2 - Visible: rojo', nombreCorto:'2 - Visible: rojo', longitud:'0.64 µm',
    tipo:'visible', color:'#f87171', descripcion:'Máxima resolución 0.5 km · Canal principal',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band02.pdf',
    ref:{ resolucion:'0.5 km — única banda a 500 m del ABI', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Único canal a 500 m de resolución. Canal principal para imágenes diurnas. Nieve y nubes son indistinguibles sin IR adicional.',
      aplicaciones:['Imágenes de alta resolución','Morfología de tormentas','Nieve superficial en los Andes','Monitoreo costero'],
      escala:[] }},

  { id:'03', nombre:'3 - IR Cercano: Veggie', nombreCorto:'3 - IR Cercano: Veggie', longitud:'0.86 µm',
    tipo:'near-ir', color:'#4ade80', descripcion:'Vegetación · Cicatrices · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band03.pdf',
    ref:{ resolucion:'1 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'IR cercano 0.86 µm. Vegetación sana refleja fuertemente. Cicatrices de incendios aparecen muy oscuras. Permite calcular NDVI con B02.',
      aplicaciones:['NDVI y monitoreo de vegetación','Cicatrices de incendios forestales','Masas de agua','Componente de GeoColor sintético'],
      escala:[] }},

  { id:'04', nombre:'4 - IR Cercano: cirros', nombreCorto:'4 - IR Cercano: cirros', longitud:'1.37 µm',
    tipo:'near-ir', color:'#a5f3fc', descripcion:'Cirros delgados exclusivamente · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band04.pdf',
    ref:{ resolucion:'2 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Centrada en absorción de vapor de agua. Solo cirros por encima de la mayor parte del vapor son visibles. La superficie siempre aparece negra.',
      aplicaciones:['Cirros delgados en alta troposfera','Extensión de yunques de cumulonimbus','Nieve en alta montaña andina'],
      escala:[] }},

  { id:'05', nombre:'5 - IR Cercano: nieve/hielo', nombreCorto:'5 - IR Cercano: nieve/hielo', longitud:'1.60 µm',
    tipo:'near-ir', color:'#e0f2fe', descripcion:'Nieve/hielo vs nubes de agua · 1 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band05.pdf',
    ref:{ resolucion:'1 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Nieve/hielo absorben fuertemente a 1.6 µm (oscuro). Nubes de agua líquida son brillantes. Discriminación perfecta nieve/granizo vs nubes — crítico para los Andes y Patagonia.',
      aplicaciones:['Cobertura nival en los Andes y Patagonia','Discriminar granizo en tormentas','Glaciares patagónicos','Fase de partículas en nubes'],
      escala:[] }},

  { id:'06', nombre:'6 - IR Cercano: partículas de nube', nombreCorto:'6 - IR Cercano: partículas de nube', longitud:'2.24 µm',
    tipo:'near-ir', color:'#bfdbfe', descripcion:'Radio efectivo de partículas · Precipitación · 2 km',
    docUrl:'https://cimss.ssec.wisc.edu/goes/OCLOFactSheetPDFs/ABIQuickGuide_Band06.pdf',
    ref:{ resolucion:'2 km', notaDiurna:'Solo disponible de día',
      descripcionLarga:'Partículas pequeñas = brillante. Partículas grandes = oscuro. Indicador de potencial de precipitación en nubes convectivas.',
      aplicaciones:['Potencial de precipitación','Tamaño de gotitas en niebla marina','Identificación de nubes con granizo','Propiedades microfísicas para modelos'],
      escala:[] }},

  { id:'07', nombre:'7 - IR: onda corta', nombreCorto:'7 - IR: onda corta', longitud:'3.90 µm',
    tipo:'ir', color:'#fb923c', descripcion:'Incendios · Niebla nocturna · Día y noche · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band07.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'3.9 µm – Banda "Shortwave Window" – Resolución 2 km – La banda 7 tiene una variedad de aplicaciones, incluyendo detección de incendios, recuperación del tamaño de partículas de nubes y diferenciación entre nubes de agua líquida y de hielo. Los puntos calientes de incendios aparecen como píxeles relativamente pequeños de gris oscuro a negro.',
      aplicaciones:['Detección de incendios','Tamaño de partículas de nubes','Diferenciación nubes de agua líquida vs hielo','Niebla y nubes bajas nocturnas (B07-B13)','Volcanes andinos activos'],
      escala:[{label:'-83°C',color:'#333333'},{label:'-42°C',color:'#FF0000'},{label:'-42°C',color:'#FF6600'},{label:'-42°C',color:'#FFFF00'},{label:'-13°C',color:'#00FFFF'},{label:'13°C',color:'#CCCCCC'},{label:'38°C',color:'#888888'},{label:'127°C',color:'#333333'}] }},

  { id:'08', nombre:'8 - IR: vapor de agua superior', nombreCorto:'8 - IR: vapor de agua superior', longitud:'6.19 µm',
    tipo:'ir', color:'#818cf8', descripcion:'Humedad troposfera alta · 300–600 hPa · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band08.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'6.2 µm – Banda "Upper-level Water Vapor" – Resolución 2 km – La banda 8 se utiliza para seguimiento de vapor de agua troposférico de nivel superior, identificación de jet stream, pronóstico de trayectoria de huracanes, pronóstico de tormentas de latitudes medias, análisis de tiempo severo, estimación de humedad de nivel medio-superior y detección de turbulencia. Esta banda muestra temperaturas atmosféricas en grados Celsius. Valores en el rango rojo a amarillo representan una atmósfera seca. Valores entre amarillo y blanco, incluyendo azul, representan una atmósfera relativamente húmeda. Valores más fríos que el blanco, incluyendo verde, representan nubes.',
      aplicaciones:['Seguimiento de vapor de agua troposférico superior','Identificación de jet stream','Pronóstico de trayectoria de huracanes','Pronóstico de tormentas de latitudes medias','Análisis de tiempo severo','Detección de turbulencia'],
      escala:[{label:'-93°C (nubes)',color:'#00CC66'},{label:'-54°C (nubes)',color:'#00FFCC'},{label:'-30°C (húmedo)',color:'#FFFFFF'},{label:'-18°C',color:'#CCCCFF'},{label:'-5°C (seco)',color:'#FFFF00'},{label:'-5°C (seco)',color:'#FF6600'},{label:'7°C (seco)',color:'#FF0000'},{label:'7°C (muy seco)',color:'#000000'}] }},

  { id:'09', nombre:'9 - IR: vapor de agua medio', nombreCorto:'9 - IR: vapor de agua medio', longitud:'6.93 µm',
    tipo:'ir', color:'#a78bfa', descripcion:'Humedad troposfera media · ~500 hPa · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band09.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'6.9 µm – Banda "Mid-level Water Vapor" – Resolución 2 km – La banda 9 es la banda de vapor de agua de nivel medio. Se utiliza para seguimiento de vientos de la troposfera media, identificación de jet streams, pronóstico de trayectoria de huracanes y movimiento de tormentas de latitudes medias, monitoreo de potencial de tiempo severo, estimación de humedad de nivel medio y para identificar regiones donde podría existir turbulencia. Las características de la superficie generalmente no son visibles en esta banda. Las temperaturas de brillo muestran enfriamiento debido a la absorción de energía a 6.9 µm por el vapor de agua.',
      aplicaciones:['Seguimiento de vientos troposféricos medios','Identificación de jet streams','Pronóstico de huracanes y tormentas','Monitoreo de potencial de tiempo severo','Estimación de humedad de nivel medio','Detección de turbulencia'],
      escala:[{label:'-93°C (nubes)',color:'#00CC66'},{label:'-54°C (nubes)',color:'#00FFCC'},{label:'-30°C (húmedo)',color:'#FFFFFF'},{label:'-18°C',color:'#CCCCFF'},{label:'-5°C (seco)',color:'#FFFF00'},{label:'-5°C (seco)',color:'#FF6600'},{label:'7°C (seco)',color:'#FF0000'},{label:'7°C (muy seco)',color:'#000000'}] }},

  { id:'10', nombre:'10 - IR: vapor de agua inferior', nombreCorto:'10 - IR: vapor de agua inferior', longitud:'7.34 µm',
    tipo:'ir', color:'#c4b5fd', descripcion:'Humedad troposfera baja · Capa límite · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band10.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'7.3 µm – Banda "Lower-level Water Vapor" – Resolución 2 km – La banda 10 es una banda de vapor de agua, capaz de detectar vapor de agua en las porciones media a inferior de la atmósfera, además de nubes altas. Puede detectar vapor de agua más abajo en la troposfera en comparación con la banda de vapor de agua de los satélites GOES-13 y -15. Esta banda muestra temperaturas atmosféricas en grados Celsius. Valores en el rango rojo a amarillo representan una atmósfera seca. Valores entre amarillo y blanco, incluyendo azul, representan una atmósfera relativamente húmeda. Valores más fríos que el blanco, incluyendo verde, representan nubes.',
      aplicaciones:['Detección de vapor de agua en troposfera media-baja','Nubes altas','Seguimiento de humedad en capa límite','Complemento de bandas 8 y 9 para perfil vertical de vapor de agua'],
      escala:[{label:'-93°C (nubes)',color:'#00CC66'},{label:'-54°C (nubes)',color:'#00FFCC'},{label:'-30°C (húmedo)',color:'#FFFFFF'},{label:'-18°C',color:'#CCCCFF'},{label:'-5°C (seco)',color:'#FFFF00'},{label:'-5°C (seco)',color:'#FF6600'},{label:'7°C (seco)',color:'#FF0000'},{label:'7°C (muy seco)',color:'#000000'}] }},

  { id:'11', nombre:'11 - IR: fase de cima de nube', nombreCorto:'11 - IR: fase de cima de nube', longitud:'8.44 µm',
    tipo:'ir', color:'#67e8f9', descripcion:'Hielo vs agua líquida · Banda de ozono · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band11.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'8.4 µm – Banda "Cloud-top Phase" – Resolución 2 km – La banda 11 se utiliza en combinación con las bandas de 11.2 y 12.3 µm para derivar productos de fase y tipo de nubes. Esta banda es similar a la banda IR "tradicional" de ventana de onda larga, aunque la banda de 8.4 µm asiste en la determinación de las propiedades microfísicas de las nubes.',
      aplicaciones:['Fase de partículas en cimas de nubes','Tipo de nubes en combinación con B14 y B15','Propiedades microfísicas de nubes'],
      escala:[{label:'-110°C',color:'#FFFFFF'},{label:'-80°C',color:'#AAAAAA'},{label:'-66°C',color:'#FF0000'},{label:'-63°C',color:'#FF6600'},{label:'-60°C',color:'#FFFF00'},{label:'-57°C',color:'#00FF00'},{label:'-53°C',color:'#0000FF'},{label:'-45°C',color:'#00FFFF'},{label:'-20°C',color:'#CCCCCC'},{label:'6°C',color:'#999999'},{label:'31°C',color:'#555555'},{label:'57°C',color:'#222222'}] }},

  { id:'12', nombre:'12 - IR: ozono', nombreCorto:'12 - IR: ozono', longitud:'9.61 µm',
    tipo:'ir', color:'#86efac', descripcion:'Ozono · Tropopausa dinámica · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band12.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'9.6 µm – Banda "Ozone" – Resolución 2 km – La banda 12 proporcionará información tanto de día como de noche sobre la dinámica de la atmósfera cerca de la tropopausa con alta resolución espacial y temporal. Para escenas de vista despejadas (sin nubes), esta banda es más fría que las bandas de ventana IR debido a la absorción por el ozono.',
      aplicaciones:['Dinámica atmosférica cerca de la tropopausa','Detección de ozono día y noche','Intrusiones estratosféricas','Componente del AirMass RGB'],
      escala:[{label:'-110°C',color:'#FFFFFF'},{label:'-80°C',color:'#AAAAAA'},{label:'-66°C',color:'#FF0000'},{label:'-63°C',color:'#FF6600'},{label:'-60°C',color:'#FFFF00'},{label:'-57°C',color:'#00FF00'},{label:'-53°C',color:'#0000FF'},{label:'-45°C',color:'#00FFFF'},{label:'-20°C',color:'#CCCCCC'},{label:'6°C',color:'#999999'},{label:'31°C',color:'#555555'},{label:'57°C',color:'#222222'}] }},

  { id:'13', nombre:'13 - IR: onda larga limpia', nombreCorto:'13 - IR: onda larga limpia', longitud:'10.35 µm',
    tipo:'ir', color:'#fcd34d', descripcion:'Canal IR principal · Temperatura de cima · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band13.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'10.3 µm – Banda "Clean" Longwave IR Window – Resolución 2 km – La banda 13 a 10.3 µm es una ventana infrarroja, lo que significa que no es fuertemente afectada por el vapor de agua atmosférico. Este canal es útil para detectar nubes en todo momento del día y la noche y es particularmente útil en la recuperación de la altura de la cima de las nubes.',
      aplicaciones:['Detección de nubes día y noche','Altura de cima de nubes','Seguimiento de ciclones y tormentas','Estimación de lluvia (Hydroestimator)','Base del Sandwich RGB'],
      escala:[{label:'-110°C',color:'#FFFFFF'},{label:'-80°C',color:'#AAAAAA'},{label:'-66°C',color:'#FF0000'},{label:'-63°C',color:'#FF6600'},{label:'-60°C',color:'#FFFF00'},{label:'-57°C',color:'#00FF00'},{label:'-53°C',color:'#0000FF'},{label:'-45°C',color:'#00FFFF'},{label:'-20°C',color:'#CCCCCC'},{label:'6°C',color:'#999999'},{label:'31°C',color:'#555555'},{label:'57°C',color:'#222222'}] }},

  { id:'14', nombre:'14 - IR: onda larga', nombreCorto:'14 - IR: onda larga', longitud:'11.19 µm',
    tipo:'ir', color:'#fbbf24', descripcion:'TSM · Vientos derivados · Corriente de Malvinas · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band14.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'11.2 µm – Banda IR Longwave Window – Resolución 2 km – La banda tradicional de ventana infrarroja de onda larga, se utiliza para diagnosticar nubes discretas y características organizadas para pronóstico meteorológico general, análisis y aplicaciones de difusión. Las observaciones de este canal de ventana IR caracterizan procesos atmosféricos asociados con ciclones extratropicales y también en tormentas eléctricas individuales y complejos convectivos.',
      aplicaciones:['Pronóstico meteorológico general','Diagnóstico de nubes discretas','Ciclones extratropicales','Tormentas eléctricas y complejos convectivos','TSM en el Atlántico Sur','Vientos derivados DMW-IR'],
      escala:[{label:'-110°C',color:'#FFFFFF'},{label:'-80°C',color:'#AAAAAA'},{label:'-66°C',color:'#FF0000'},{label:'-63°C',color:'#FF6600'},{label:'-60°C',color:'#FFFF00'},{label:'-57°C',color:'#00FF00'},{label:'-53°C',color:'#0000FF'},{label:'-45°C',color:'#00FFFF'},{label:'-20°C',color:'#CCCCCC'},{label:'6°C',color:'#999999'},{label:'31°C',color:'#555555'},{label:'57°C',color:'#222222'}] }},

  { id:'15', nombre:'15 - IR: onda larga sucia', nombreCorto:'15 - IR: onda larga sucia', longitud:'12.30 µm',
    tipo:'ir', color:'#f97316', descripcion:'Split window · Polvo mineral · TSM corregida · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band15.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'12.3 µm – Banda "Dirty" Longwave IR Window – Resolución 2 km – La banda 15 a 12.3 µm ofrece monitoreo casi continuo para numerosas aplicaciones, aunque generalmente a través de una diferencia de split window con un canal de ventana más limpio. Estas diferencias pueden estimar mejor la humedad de bajo nivel, ceniza volcánica, polvo/arena en suspensión, temperatura de la superficie del mar y tamaño de partículas de nubes.',
      aplicaciones:['Humedad de bajo nivel','Ceniza volcánica','Polvo/arena en suspensión','Temperatura de la superficie del mar','Tamaño de partículas de nubes'],
      escala:[{label:'-110°C',color:'#FFFFFF'},{label:'-80°C',color:'#AAAAAA'},{label:'-66°C',color:'#FF0000'},{label:'-63°C',color:'#FF6600'},{label:'-60°C',color:'#FFFF00'},{label:'-57°C',color:'#00FF00'},{label:'-53°C',color:'#0000FF'},{label:'-45°C',color:'#00FFFF'},{label:'-20°C',color:'#CCCCCC'},{label:'6°C',color:'#999999'},{label:'31°C',color:'#555555'},{label:'57°C',color:'#222222'}] }},

  { id:'16', nombre:'16 - IR: CO₂ onda larga', nombreCorto:'16 - IR: CO₂ onda larga', longitud:'13.30 µm',
    tipo:'ir', color:'#ef4444', descripcion:'Altura de cima de nubes · CO₂ troposférico · 2 km',
    docUrl:'https://www.star.nesdis.noaa.gov/GOES/documents/ABIQuickGuide_Band16.pdf',
    ref:{ resolucion:'2 km',
      descripcionLarga:'13.3 µm – Banda CO₂ Longwave IR – Resolución 2 km – La banda 16 se utiliza para la estimación de la temperatura media del aire troposférico, delineación de la tropopausa, y como parte de productos cuantitativos de nubes para estimación de opacidad de nubes, asignación de altura de cima de nubes en vectores de movimiento de deriva de nubes, y como complemento de las observaciones del Sistema Automatizado de Observación de Superficie (ASOS).',
      aplicaciones:['Temperatura media del aire troposférico','Delineación de la tropopausa','Opacidad de nubes','Altura de cima de nubes','Vectores de movimiento de deriva de nubes','Complemento de observaciones ASOS'],
      escala:[{label:'-128°C',color:'#FFFFFF'},{label:'-93°C',color:'#AAAAAA'},{label:'-60°C',color:'#0000CC'},{label:'-30°C',color:'#666666'},{label:'0°C',color:'#CCCCCC'},{label:'30°C',color:'#FFFF00'},{label:'60°C',color:'#FF6600'},{label:'83°C',color:'#FF0000'},{label:'128°C',color:'#222222'}] }},
]

const TIPO_LABELS: Record<BandType,string> = { visible:'Visible','near-ir':'IR Cercano',ir:'Infrarrojo',rgb:'RGB' }
const TIPO_STYLE:  Record<BandType,string>  = {
  visible:  'border-blue-400/40 bg-blue-400/10 text-blue-300',
  'near-ir':'border-green-400/40 bg-green-400/10 text-green-300',
  ir:       'border-orange-400/40 bg-orange-400/10 text-orange-300',
  rgb:      'border-purple-400/40 bg-purple-400/10 text-purple-300',
}
const FRAME_COUNTS = [12,24,36,48,60,72,84,96,120,150,180,240]

// ── Color matching helpers for hover feature ───────────────────
function hexToRgb(hex: string): [number,number,number] {
  const h = hex.replace('#','')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function colorDistance(r1:number,g1:number,b1:number, r2:number,g2:number,b2:number): number {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
}

function findClosestScaleEntry(r:number, g:number, b:number, escala: ColorEntry[]): ColorEntry {
  let minDist = Infinity
  let closest = escala[0]
  for (const entry of escala) {
    const [r2,g2,b2] = hexToRgb(entry.color)
    const d = colorDistance(r,g,b, r2,g2,b2)
    if (d < minDist) { minDist = d; closest = entry }
  }
  return closest
}

// Extract UTC hour from frame filename (YYYYDDDHHMM)
function getFrameUtcHour(filename: string): number {
  return parseInt(filename.slice(7, 9))
}

// For SSA sector (~UTC-3 to UTC-5), daytime is roughly 10-22 UTC
function isFrameDaytime(filename: string): boolean {
  const h = getFrameUtcHour(filename)
  return h >= 10 && h < 22
}

// Filter scale entries by day/night prefix for dual-scale channels
function getActiveScale(escala: ColorEntry[], channelId: string, filename: string): ColorEntry[] {
  if (channelId !== 'DayNightCloudMicroCombo') return escala
  const day = isFrameDaytime(filename)
  const prefix = day ? 'Día:' : 'Noche:'
  return escala.filter(e => e.label.startsWith(prefix))
}

// Compute rendered image bounds within an object-contain container
function getContainedBounds(containerW: number, containerH: number, imgW: number, imgH: number) {
  const containerAR = containerW / containerH
  const imgAR = imgW / imgH
  let renderW: number, renderH: number, offsetX: number, offsetY: number
  if (imgAR > containerAR) {
    renderW = containerW
    renderH = containerW / imgAR
    offsetX = 0
    offsetY = (containerH - renderH) / 2
  } else {
    renderH = containerH
    renderW = containerH * imgAR
    offsetX = (containerW - renderW) / 2
    offsetY = 0
  }
  return { renderW, renderH, offsetX, offsetY }
}

// ── Grid overlay — NOAA official lat/lon grid for G19 SSA sector ──
function GeoGrid() {
  return (
    <img
      src="/assets/g19_ssa_grid_1800x1080_yellow.gif"
      alt="Lat/Lon grid"
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      draggable={false}
    />
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
  const [ok,setOk]           = useState(true)
  const [lastTs,setLastTs]   = useState<string|null>(null)
  const [visible, setVisible] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)
  const isGlm = ch.id === 'EXTENT3'

  // Thumbnail: use latest symlink from CDN via proxy
  const thumbRaw = isGlm
    ? `${CDN_GLM}/latest.jpg`
    : `${CDN_ABI}/${ch.id}/latest.jpg`
  const thumbSrc = proxy(thumbRaw)

  // Use IntersectionObserver to only fetch data when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  // Fetch the timestamp of the latest image only when visible
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    async function fetchLatest() {
      try {
        const res  = await fetch(`/api/goes/imagery-list?band=${ch.id}&count=1`)
        const data = await res.json()
        if (cancelled) return
        const fn: string = data.frames?.[0]
        if (fn) setLastTs(formatLabel(fn))
      } catch { /* silent */ }
    }
    fetchLatest()
    // Refresh every 10 min
    const id = setInterval(fetchLatest, 10 * 60 * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [ch.id, visible])

  return (
    <button 
      ref={cardRef}
      onClick={()=>onSelect(ch)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background-card
                 transition-all hover:border-border-accent hover:shadow-glow-blue hover:scale-[1.02]">
      <div className="relative aspect-square w-full overflow-hidden bg-background-secondary">
        {ok && visible
          ? <img src={thumbSrc} alt={ch.nombre}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={()=>setOk(false)}/>
          : <div className="flex h-full flex-col items-center justify-center gap-1">
              <span className="text-sm text-text-dim font-mono">{ch.id}</span>
            </div>}
        <span className={cn('absolute top-1 right-1 badge border text-2xs backdrop-blur-sm',TIPO_STYLE[ch.tipo], 'bg-black/60')}>
          {TIPO_LABELS[ch.tipo]}
        </span>
        {/* Last image timestamp overlay */}
        {lastTs && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5">
            <span className="font-data text-2xs text-accent-cyan tabular-nums leading-none">
              {lastTs}
            </span>
          </div>
        )}
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
  const [frames,setFrames]         = useState<Frame[]>([])
  const [loadedSet,setLoadedSet]   = useState<Set<number>>(new Set())
  const [apiErr,setApiErr]         = useState<string|null>(null)
  const [fetching,setFetching]     = useState(false)
  const rockDir  = useRef<1|-1>(1)
  const ticker   = useRef<ReturnType<typeof setInterval>|null>(null)
  // loadKey invalidates markLoaded callbacks from previous loads
  const loadKey  = useRef(0)
  const total    = frames.length

  // ── Hover color picking ─────────────────────────────────────
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const imgContRef   = useRef<HTMLDivElement>(null)
  const canvasReady  = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{x:number;y:number;color:string;label:string;swatch:string}|null>(null)
  const hasEscala = (channel.ref.escala?.length ?? 0) > 0

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

  // ── Draw current frame to hidden canvas for pixel sampling ──
  useEffect(() => {
    canvasReady.current = false
    if (playing || !frame || !hasEscala || !allLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) { ctx.drawImage(img, 0, 0); canvasReady.current = true }
    }
    img.src = frame.proxied
  }, [playing, frame, hasEscala, allLoaded])

  const handleImgMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (playing || !hasEscala || !canvasReady.current) { setHoverInfo(null); return }
    const canvas = canvasRef.current
    const container = imgContRef.current
    if (!canvas || !container || canvas.width === 0) { setHoverInfo(null); return }
    const rect = container.getBoundingClientRect()
    const { renderW, renderH, offsetX, offsetY } = getContainedBounds(
      rect.width, rect.height, canvas.width, canvas.height)
    const mx = e.clientX - rect.left - offsetX
    const my = e.clientY - rect.top  - offsetY
    if (mx < 0 || my < 0 || mx > renderW || my > renderH) { setHoverInfo(null); return }
    const imgX = Math.min(canvas.width  - 1, Math.round(mx / renderW * canvas.width))
    const imgY = Math.min(canvas.height - 1, Math.round(my / renderH * canvas.height))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const p = ctx.getImageData(imgX, imgY, 1, 1).data
    const curFrame = frames[idx]
    const activeScale = curFrame
      ? getActiveScale(channel.ref.escala!, channel.id, curFrame.filename)
      : channel.ref.escala!
    if (activeScale.length === 0) { setHoverInfo(null); return }
    const closest = findClosestScaleEntry(p[0], p[1], p[2], activeScale)
    // Strip "Día: " / "Noche: " prefix for cleaner display
    const cleanLabel = closest.label.replace(/^(Día|Noche):\s*/, '')
    setHoverInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      color: `rgb(${p[0]},${p[1]},${p[2]})`,
      label: cleanLabel,
      swatch: closest.color,
    })
  }, [playing, hasEscala, channel.ref.escala, channel.id, frames, idx])

  const handleImgMouseLeave = useCallback(() => setHoverInfo(null), [])

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="ctrl-btn"><ChevronLeft size={16}/></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold uppercase tracking-widest truncate"
                style={{color:channel.color}}>{channel.nombre}</h1>
          </div>
          <p className="text-xs text-text-muted">
            GOES-19 · SSA{channel.longitud?` · ${channel.longitud}`:''} · {channel.descripcion}
          </p>
        </div>
      </div>

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
          <div ref={imgContRef}
               className="relative overflow-hidden rounded-lg border border-border bg-black"
               style={{aspectRatio: isGlm ? '5/3' : '5/3'}}
               onMouseMove={handleImgMouseMove}
               onMouseLeave={handleImgMouseLeave}>

            {/* Hidden canvas for pixel sampling */}
            <canvas ref={canvasRef} className="hidden" />

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
                {/* Hover color tooltip */}
                {hoverInfo && !playing && (
                  <div className="pointer-events-none absolute z-20 rounded border border-white/20 bg-black/85 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                    style={{
                      left: Math.min(hoverInfo.x + 14, (imgContRef.current?.clientWidth ?? 300) - 180),
                      top:  Math.max(hoverInfo.y - 40, 4),
                    }}>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded border border-white/30"
                        style={{backgroundColor: hoverInfo.swatch}}/>
                      <span className="font-data text-xs text-white whitespace-nowrap">{hoverInfo.label}</span>
                    </div>
                  </div>
                )}
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
            <button className="ctrl-btn" onClick={()=>{
              const steps = [1000,500,333,250,200,167,143,125,100,67,50]
              const i = steps.indexOf(speedMs)
              if(i>0) setSpeedMs(steps[i-1])
              else { const prev = [...steps].reverse().find(s=>s>speedMs); if(prev) setSpeedMs(prev) }
            }}>
              <Minus size={13}/>
            </button>
            <span className="font-data text-xs text-text-muted tabular-nums whitespace-nowrap">{fps} fps</span>
            <button className="ctrl-btn" onClick={()=>{
              const steps = [1000,500,333,250,200,167,143,125,100,67,50]
              const i = steps.indexOf(speedMs)
              if(i>=0 && i<steps.length-1) setSpeedMs(steps[i+1])
              else { const next = steps.find(s=>s<speedMs); if(next) setSpeedMs(next) }
            }}>
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
            <p className="text-2xs text-text-muted pt-1 border-t border-border">GIF animado (últimas 4 h)</p>
            {['900x540'].map(res=>{
              const gifName = isGlm
                ? `GOES19-SSA-EXTENT3-${res}.gif`
                : `GOES19-SSA-${channel.id}-${res}.gif`
              const url = `${cdnDir(channel.id)}/${gifName}`
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
