// ============================================================
// src/lib/space-weather-content.ts
// Educational content about space weather — Spanish translations
// Source: https://www.swpc.noaa.gov/about-space-weather
// ============================================================

export interface SpaceWeatherArticle {
  slug: string
  title: string
  summary: string
  sections: { heading?: string; body: string }[]
}

// ────────────────────────────────────────────────────
//  IMPACTOS
// ────────────────────────────────────────────────────

export const IMPACTS: SpaceWeatherArticle[] = [
  {
    slug: 'electric-power',
    title: 'Transmisión de Energía Eléctrica',
    summary:
      'Cómo las tormentas geomagnéticas inducen corrientes en las redes de alta tensión y pueden provocar apagones masivos.',
    sections: [
      {
        body: 'Las tormentas geomagnéticas severas pueden representar una amenaza significativa para las redes eléctricas. Durante estos eventos, las variaciones del campo magnético terrestre inducen corrientes geoeléctricas en la superficie de la Tierra. Estas corrientes pueden fluir a través de los conductores de la red eléctrica y los transformadores de las subestaciones, generando lo que se conoce como Corrientes Inducidas Geomagnéticamente (GIC, por sus siglas en inglés).',
      },
      {
        heading: 'Corrientes Inducidas Geomagnéticamente (GIC)',
        body: 'Las GIC son esencialmente corrientes continuas (DC) de baja frecuencia que fluyen a través del sistema eléctrico. Los transformadores de potencia están diseñados para operar con corriente alterna (AC), por lo que la presencia de corrientes DC puede saturar el núcleo del transformador. Esta saturación provoca un calentamiento excesivo, deformación mecánica por fuerzas electromagnéticas, generación de armónicos y, en casos extremos, la destrucción completa del transformador.',
      },
      {
        heading: 'Consecuencias en el Sistema Eléctrico',
        body: 'Los efectos de las GIC en la red eléctrica pueden ser amplios: degradación gradual del aislamiento de los transformadores (reduciendo su vida útil), operación incorrecta de los dispositivos de protección, caídas de voltaje que afectan la calidad del servicio, y en el peor escenario, un efecto cascada de fallas que resulta en un apagón generalizado. Los transformadores de extra alta tensión (EHV), que son los más grandes, costosos y difíciles de reemplazar, son paradójicamente los más susceptibles a los daños por GIC.',
      },
      {
        heading: 'El Evento de Marzo de 1989',
        body: 'El ejemplo más notable de daño por clima espacial a una red eléctrica ocurrió el 13 de marzo de 1989. Una tormenta geomagnética severa provocó el colapso de la red eléctrica de Hydro-Québec en Canadá en apenas 92 segundos. Más de 6 millones de personas quedaron sin electricidad durante aproximadamente 9 horas. El evento también dañó transformadores en otras partes de Norteamérica y en el Reino Unido, con costos estimados de centenares de millones de dólares.',
      },
      {
        heading: 'Mitigación y Monitoreo',
        body: 'El SWPC emite alertas, vigilancias y advertencias de tormentas geomagnéticas para que los operadores de redes puedan tomar medidas preventivas: reducir los flujos de potencia, cancelar trabajos de mantenimiento programados, poner en servicio equipos de reserva y ajustar los esquemas de protección. El monitoreo continuo de las condiciones del viento solar y del campo magnético terrestre permite anticipar estos eventos con cierta antelación.',
      },
    ],
  },
  {
    slug: 'gps',
    title: 'Sistemas GPS',
    summary:
      'De qué manera las perturbaciones ionosféricas degradan la precisión de los sistemas de navegación global.',
    sections: [
      {
        body: 'El Sistema de Posicionamiento Global (GPS) y otros sistemas de navegación por satélite (GNSS) dependen de señales de radio que viajan desde los satélites hasta los receptores en tierra. Estas señales deben atravesar la ionósfera, una capa de la atmósfera terrestre que contiene partículas cargadas (plasma). Las condiciones del clima espacial pueden alterar significativamente las propiedades de la ionósfera, degradando la precisión y fiabilidad de los sistemas GPS.',
      },
      {
        heading: 'Contenido Total de Electrones (TEC)',
        body: 'La principal manera en que la ionósfera afecta las señales GPS es a través del Contenido Total de Electrones (TEC), que es la cantidad total de electrones libres a lo largo del camino de la señal entre el satélite y el receptor. Un aumento del TEC produce un retardo adicional en la señal, lo que se traduce en errores de posición. Durante tormentas geomagnéticas, el TEC puede aumentar dramáticamente y de forma irregular, creando gradientes pronunciados que los modelos de corrección estándar no pueden compensar adecuadamente.',
      },
      {
        heading: 'Centelleo Ionosférico',
        body: 'El centelleo ionosférico ocurre cuando irregularidades a pequeña escala en la densidad electrónica de la ionósfera causan fluctuaciones rápidas en la amplitud y fase de las señales GPS. Esto es análogo al parpadeo de las estrellas causado por la turbulencia atmosférica. En casos severos, el centelleo puede provocar que el receptor pierda la señal del satélite completamente (pérdida de enganche), lo que interrumpe el servicio de navegación.',
      },
      {
        heading: 'Impacto en Diferentes Aplicaciones',
        body: 'Los receptores GPS de frecuencia simple, como los de los teléfonos móviles, son los más vulnerables ya que dependen de modelos genéricos de corrección ionosférica. Los receptores de doble frecuencia pueden eliminar gran parte del error ionosférico, pero siguen siendo susceptibles al centelleo. Las aplicaciones que requieren máxima precisión —como la aviación (sistemas WAAS/SBAS), la agricultura de precisión, topografía y operaciones de perforación— son las más afectadas por las perturbaciones ionosféricas.',
      },
      {
        heading: 'Regiones Más Afectadas',
        body: 'Los efectos más intensos se observan en las regiones ecuatoriales (por la anomalía de la fuente ecuatorial) y en las regiones polares y aurorales (donde la actividad geomagnética es más intensa). Las perturbaciones en latitudes medias, aunque menos frecuentes, pueden ser particularmente problemáticas por ser menos predecibles y porque afectan zonas de alta densidad poblacional y actividad económica.',
      },
    ],
  },
  {
    slug: 'hf-radio',
    title: 'Comunicaciones de Radio HF',
    summary:
      'Cómo las fulguraciones solares y las tormentas de radiación solar pueden interrumpir las comunicaciones por radio de alta frecuencia.',
    sections: [
      {
        body: 'Las comunicaciones por radio de Alta Frecuencia (HF, entre 3 y 30 MHz) dependen de la refracción de las ondas de radio en la ionósfera para lograr comunicaciones de largo alcance más allá de la línea de visión. Este recurso natural es aprovechado por la aviación transoceánica, las operaciones marítimas, las fuerzas armadas y los servicios de emergencia. Sin embargo, las perturbaciones del clima espacial pueden degradar o interrumpir completamente estas comunicaciones.',
      },
      {
        heading: 'Apagones de Radio por Fulguraciones Solares',
        body: 'Cuando ocurre una fulguración solar, la emisión intensa de rayos X y radiación ultravioleta extrema (EUV) alcanza la Tierra en unos 8 minutos. Esta radiación ioniza fuertemente la capa D de la ionósfera (entre 60 y 90 km de altitud), que normalmente tiene baja densidad electrónica. La capa D ionizada absorbe las señales de radio HF en lugar de permitir su refracción en las capas superiores. El resultado es un apagón de radio que afecta toda la cara iluminada de la Tierra (lado diurno) y puede durar desde minutos hasta horas, dependiendo de la intensidad de la fulguración.',
      },
      {
        heading: 'Absorción de Casquete Polar (PCA)',
        body: 'Durante las tormentas de radiación solar, los protones energéticos emitidos por el Sol son canalizados por el campo magnético terrestre hacia las regiones polares. Estos protones de alta energía penetran profundamente en la ionósfera polar, produciendo una ionización intensa que absorbe las señales de radio HF que pasan por estas regiones. Los eventos de Absorción de Casquete Polar (PCA) pueden durar días e interrumpen las comunicaciones y navegación en las rutas aéreas transpolar que conectan Norteamérica con Asia y Europa.',
      },
      {
        heading: 'Perturbaciones Ionosféricas por Tormentas',
        body: 'Las tormentas geomagnéticas provocan cambios complejos en la ionósfera que pueden tanto degradar como mejorar la propagación HF. Los efectos incluyen cambios abruptos en la frecuencia máxima utilizable (MUF), aparición de capas de ionización esporádicas, y perturbaciones ionosféricas viajeras que causan fluctuaciones rápidas en las condiciones de propagación. Estos efectos son difíciles de predecir y pueden variar enormemente según la ubicación geográfica.',
      },
      {
        heading: 'Escala de Apagones de Radio del SWPC',
        body: 'El SWPC utiliza una escala de R1 a R5 para clasificar los apagones de radio. R1 (Menor) produce una degradación leve en las señales HF del lado diurno, mientras que R5 (Extremo) causa un apagón completo de HF en todo el lado iluminado de la Tierra durante varias horas. La escala está directamente relacionada con la clase de la fulguración solar: R1 corresponde a una fulguración M1, R2 a M5, R3 a X1, R4 a X10 y R5 a X20 o superior.',
      },
    ],
  },
  {
    slug: 'satellite-communications',
    title: 'Comunicaciones Satelitales',
    summary:
      'Efectos del clima espacial en las señales de comunicación que transitan la ionósfera.',
    sections: [
      {
        body: 'Los sistemas de comunicación por satélite emplean señales de radio que deben atravesar la ionósfera terrestre. Aunque las frecuencias utilizadas por las comunicaciones satelitales (UHF, SHF y superiores) son menos susceptibles que las frecuencias HF, las condiciones extremas de clima espacial pueden causar degradación significativa del servicio, especialmente en los sistemas que operan en bandas de frecuencia más bajas.',
      },
      {
        heading: 'Centelleo en Comunicaciones Satelitales',
        body: 'El centelleo ionosférico —fluctuaciones rápidas de la amplitud y fase de la señal— es la principal amenaza para las comunicaciones satelitales. Las irregularidades en la densidad electrónica de la ionósfera actúan como "lentes" que dispersan y enfocan las señales de forma aleatoria. En frecuencias UHF (300 MHz a 3 GHz), el centelleo puede ser lo suficientemente severo como para causar desvanecimientos profundos de la señal, incremento de la tasa de errores de bits y pérdida temporal de la conexión.',
      },
      {
        heading: 'Bandas SHF y Frecuencias Superiores',
        body: 'Las comunicaciones en banda Ku (12-18 GHz) y Ka (26-40 GHz), muy utilizadas por servicios de Internet satelital y televisión directa, son generalmente resistentes al centelleo ionosférico. Sin embargo, pueden verse afectadas por cambios en el retardo de grupo y la rotación de Faraday durante eventos geomagnéticos severos. Estas perturbaciones pueden afectar los sistemas de seguimiento, telemetría y comando de los satélites.',
      },
      {
        heading: 'Efectos Regionales',
        body: 'Los efectos más intensos del centelleo se observan en la región ecuatorial (aproximadamente ±20° de latitud geomagnética) durante las horas posteriores al atardecer local, y en las regiones aurorales durante tormentas geomagnéticas. La banda ecuatorial de centelleo experimenta las irregularidades más fuertes debido a la inestabilidad de Rayleigh-Taylor que genera las llamadas "burbujas de plasma" en la ionósfera nocturna.',
      },
      {
        heading: 'Redundancia y Mitigación',
        body: 'Los operadores de satélites de comunicaciones emplean diversas estrategias para mitigar los efectos del clima espacial: diversidad de frecuencia, codificación de errores avanzada, control adaptativo de potencia, y diversidad espacial (múltiples estaciones terrenas). Cuando las condiciones son severas, los operadores pueden reducir las tasas de datos o redirigir el tráfico a través de rutas alternativas que eviten las regiones más afectadas.',
      },
    ],
  },
  {
    slug: 'satellite-drag',
    title: 'Arrastre Satelital',
    summary:
      'Cómo la actividad solar modifica la densidad de la termósfera y altera las órbitas de los satélites.',
    sections: [
      {
        body: 'Los satélites en órbita terrestre baja (LEO, por debajo de ~1000 km de altitud) experimentan una fuerza de arrastre atmosférico residual que gradualmente reduce su altitud orbital. La densidad de la termósfera —la capa de la atmósfera donde orbitan estos satélites— está fuertemente controlada por la actividad solar y las condiciones del clima espacial. Los cambios en esta densidad pueden alterar drásticamente las tasas de decaimiento orbital.',
      },
      {
        heading: 'La Termósfera y el Ciclo Solar',
        body: 'Durante los máximos solares, la mayor emisión de radiación ultravioleta extrema (EUV) del Sol calienta la termósfera, provocando que se expanda y que la densidad a altitudes orbitales aumente significativamente. Un satélite a 400 km de altitud puede experimentar densidades atmosféricas de 10 a 100 veces mayores durante el máximo solar comparado con el mínimo solar. Esto se traduce en un arrastre mucho mayor y un decaimiento orbital acelerado.',
      },
      {
        heading: 'Tormentas Geomagnéticas y Arrastre',
        body: 'Las tormentas geomagnéticas producen un calentamiento adicional e impulsivo de la termósfera, causando aumentos repentinos en la densidad atmosférica que pueden durar horas o días. Durante eventos severos, la densidad puede aumentar hasta un 500% en cuestión de horas. Esto causa cambios abruptos en las órbitas de miles de objetos rastreados. Después de la gran tormenta de marzo de 1989, las fuerzas aéreas tuvieron que re-identificar temporalmente más de 1300 objetos orbitales.',
      },
      {
        heading: 'Consecuencias Operacionales',
        body: 'El aumento del arrastre reduce la vida útil de los satélites y requiere maniobras de elevación orbital más frecuentes, consumiendo combustible precioso. Para satélites sin propulsión, como muchos CubeSats, una tormenta geomagnética severa puede acelerar significativamente su reingreso. Un caso notable lo protagonizó SpaceX en febrero de 2022, cuando 38 de 49 satélites Starlink recién desplegados reentró a la atmósfera tras una tormenta geomagnética moderada que elevó la densidad atmosférica en sus órbitas bajas de inserción.',
      },
      {
        heading: 'Seguimiento de Desechos Espaciales',
        body: 'Las redes de vigilancia espacial, como la Red de Vigilancia Espacial de EE.UU., rastrean más de 25.000 objetos en órbita. Cuando una tormenta geomagnética modifica las órbitas de todos estos objetos simultáneamente, se generan grandes incertidumbres en la predicción de sus posiciones. Esto complica el análisis de conjunción (evaluación de riesgo de colisión) y puede obligar a los operadores de satélites activos a ejecutar maniobras de evasión innecesarias, o peor, a no detectar acercamientos realmente peligrosos.',
      },
    ],
  },
]

// ────────────────────────────────────────────────────
//  FENÓMENOS
// ────────────────────────────────────────────────────

export const PHENOMENA: SpaceWeatherArticle[] = [
  {
    slug: 'aurora',
    title: 'Aurora',
    summary:
      'Las luces polares: cómo las partículas del viento solar crean espectaculares exhibiciones de luz.',
    sections: [
      {
        body: 'La aurora (boreal en el hemisferio norte, austral en el sur) es una de las manifestaciones más visibles del clima espacial. Se produce cuando partículas cargadas del viento solar —principalmente electrones— son aceleradas a lo largo de las líneas del campo magnético terrestre hacia las regiones polares, donde colisionan con átomos y moléculas de la atmósfera superior.',
      },
      {
        heading: 'Mecanismo de Emisión',
        body: 'Las colisiones entre las partículas energéticas y los gases atmosféricos excitan los átomos a estados de mayor energía. Al regresar a su estado fundamental, emiten fotones de colores específicos. El oxígeno atómico produce los colores más comunes: verde (557.7 nm) a altitudes de 100-300 km, y rojo (630.0 nm) a altitudes superiores a 300 km. El nitrógeno molecular produce tonos azules y violetas. La forma y estructura de la aurora (arcos, cortinas, rayos) depende de la configuración del campo magnético y de los procesos de aceleración de partículas.',
      },
      {
        heading: 'El Óvalo Auroral',
        body: 'La aurora típicamente se observa en un anillo ovalado centrado en los polos magnéticos, conocido como el óvalo auroral, situado normalmente entre los 65° y 72° de latitud geomagnética. Durante tormentas geomagnéticas, el óvalo se expande hacia latitudes más bajas, permitiendo que la aurora sea visible desde regiones donde normalmente no se observa. En tormentas extremas (como la del evento Carrington de 1859), la aurora se ha observado hasta en latitudes tropicales.',
      },
      {
        heading: 'Relación con el Viento Solar',
        body: 'La intensidad de la aurora está directamente relacionada con las condiciones del viento solar y la orientación del campo magnético interplanetario (CMI). Cuando el componente Bz del CMI es negativo (apuntando hacia el sur), se produce una reconexión magnética eficiente en la magnetopausa, inyectando energía y partículas en la magnetósfera que eventualmente causan actividad auroral. El índice Kp y el índice AE son indicadores cuantitativos de esta actividad.',
      },
    ],
  },
  {
    slug: 'coronal-holes',
    title: 'Agujeros Coronales',
    summary:
      'Regiones oscuras en la corona solar que emiten corrientes de viento solar rápido.',
    sections: [
      {
        body: 'Los agujeros coronales son regiones extensas de la corona solar donde las líneas del campo magnético se abren hacia el espacio interplanetario en lugar de cerrarse de vuelta a la superficie solar. Estas regiones aparecen como áreas oscuras en las imágenes de rayos X y ultravioleta extremo, ya que tienen menor densidad y temperatura que la corona circundante.',
      },
      {
        heading: 'Viento Solar Rápido',
        body: 'Las líneas de campo magnético abiertas de los agujeros coronales permiten que el plasma solar escape más fácilmente al espacio, generando corrientes de viento solar rápido (600-800 km/s, comparado con los 300-400 km/s del viento lento). Cuando una corriente de viento rápido alcanza la Tierra, puede comprimir la magnetósfera y provocar actividad geomagnética moderada, especialmente si la orientación del campo magnético interplanetario es favorable.',
      },
      {
        heading: 'Regiones de Interacción Corrotantes',
        body: 'Donde una corriente de viento solar rápido alcanza al viento lento que la precede, se forma una Región de Interacción Corrotante (CIR). En esta zona se genera una onda de compresión con campo magnético intensificado que puede ser geoefectiva. Los CIR producen tormentas geomagnéticas menores a moderadas, pero con una recurrencia predecible vinculada al período de rotación solar de aproximadamente 27 días.',
      },
      {
        heading: 'Observación y Predicción',
        body: 'Los agujeros coronales son bien visibles en imágenes del instrumento SUVI a bordo de los satélites GOES y en el Observatorio de Dinámica Solar (SDO). Como son estructuras relativamente estables que pueden persistir durante varias rotaciones solares, una vez identificado un agujero coronal geoefectivo, se puede anticipar su retorno cada ~27 días. Esto proporciona una de las predicciones más confiables en meteorología espacial.',
      },
    ],
  },
  {
    slug: 'coronal-mass-ejections',
    title: 'Eyecciones de Masa Coronal (CME)',
    summary:
      'Enormes expulsiones de plasma y campo magnético desde la corona solar hacia el espacio interplanetario.',
    sections: [
      {
        body: 'Las Eyecciones de Masa Coronal (CME, por sus siglas en inglés) son liberaciones masivas de plasma y campo magnético desde la corona solar. Una CME típica expulsa entre 10¹¹ y 10¹³ kg de material solar a velocidades de 250 a más de 3000 km/s. Son los eventos más energéticos del clima espacial y la principal causa de las tormentas geomagnéticas severas.',
      },
      {
        heading: 'Origen y Estructura',
        body: 'Las CME se originan en regiones de campo magnético intenso y complejo, frecuentemente asociadas con manchas solares y fulguraciones. Se cree que se producen cuando la energía almacenada en campos magnéticos retorcidos (tubos de flujo magnético) se libera catastróficamente. La estructura típica de una CME interplanetaria incluye una onda de choque frontal, una vaina de plasma comprimido, y un núcleo de tubo de flujo magnético con campo magnético intenso y rotante.',
      },
      {
        heading: 'Tiempo de Tránsito',
        body: 'El tiempo que tarda una CME en alcanzar la Tierra varía enormemente según su velocidad. Las CME lentas (~300 km/s) pueden tardar 4-5 días, mientras que las más rápidas (~3000 km/s) pueden llegar en menos de 15 horas. La CME asociada al evento Carrington de 1859 alcanzó la Tierra en apenas 17.6 horas. Los modelos de predicción de tiempo de llegada, como el modelo WSA-ENLIL del SWPC, combinan observaciones coronográficas con simulaciones del medio interplanetario.',
      },
      {
        heading: 'Geoefectividad',
        body: 'No todas las CME que alcanzan la Tierra producen tormentas geomagnéticas significativas. La geoefectividad depende principalmente de la orientación del campo magnético dentro de la CME. Si el componente Bz es fuertemente negativo (sur), la reconexión con el campo geomagnético es eficiente y se transfiere mucha energía a la magnetósfera. La velocidad y densidad del plasma también influyen en la intensidad de la perturbación.',
      },
      {
        heading: 'Detección',
        body: 'Las CME se detectan inicialmente mediante coronógrafos, instrumentos que bloquean el disco solar brillante para revelar la tenue corona. Los coronógrafos LASCO a bordo de SOHO y los coronógrafos del satélite STEREO son los principales instrumentos de detección. Los coronógrafos CCOR a bordo de los satélites GOES de nueva generación proporcionarán capacidades de detección operacionales continuas.',
      },
    ],
  },
  {
    slug: 'earths-magnetosphere',
    title: 'Magnetósfera Terrestre',
    summary:
      'El escudo magnético de la Tierra que nos protege del viento solar y las partículas cósmicas.',
    sections: [
      {
        body: 'La magnetósfera es la región del espacio dominada por el campo magnético de la Tierra. Actúa como un escudo que desvía la mayor parte del viento solar y las partículas energéticas, protegiendo la atmósfera y la superficie terrestre. Sin la magnetósfera, el viento solar erosionaría gradualmente nuestra atmósfera, como probablemente ocurrió en Marte.',
      },
      {
        heading: 'Estructura',
        body: 'La magnetósfera tiene una forma asimétrica: comprimida del lado diurno (donde el viento solar la empuja) y estirada en una larga cola magnética del lado nocturno. La magnetopausa —el límite exterior— se encuentra típicamente a unas 10 radios terrestres (Re) del lado diurno. Frente a la magnetopausa se forma un arco de choque donde el viento solar supersónico se desacelera abruptamente. Dentro de la magnetósfera se encuentran los cinturones de radiación de Van Allen, la plasmasfera, y la lámina de plasma de la cola magnética.',
      },
      {
        heading: 'Reconexión Magnética',
        body: 'El proceso clave que controla la transferencia de energía del viento solar a la magnetósfera es la reconexión magnética. Cuando el campo magnético interplanetario (CMI) tiene un componente sur (Bz negativo), se acopla con el campo geomagnético del lado diurno, abriendo líneas de campo que son arrastradas hacia la cola nocturna. La energía se acumula en la cola magnética y eventualmente se libera de forma explosiva (subtormentas), inyectando partículas energéticas hacia la Tierra y generando auroras.',
      },
      {
        heading: 'Los Cinturones de Radiación',
        body: 'Los cinturones de radiación de Van Allen son dos regiones toroidales de partículas atrapadas por el campo geomagnético. El cinturón interno (1.2-3 Re) contiene principalmente protones de alta energía, mientras que el externo (3-7 Re) está dominado por electrones relativistas. Las tormentas geomagnéticas pueden alterar dramáticamente estos cinturones, intensificando o vaciando las poblaciones de partículas, lo que representa un riesgo significativo para los satélites que transitan estas regiones.',
      },
    ],
  },
  {
    slug: 'f107-radio-emissions',
    title: 'Emisiones de Radio F10.7 cm',
    summary:
      'Un indicador clave de la actividad solar medido desde la superficie terrestre.',
    sections: [
      {
        body: 'El flujo de radio solar a 10.7 cm de longitud de onda (2800 MHz), conocido como el índice F10.7, es uno de los indicadores más importantes y longevos de la actividad solar. Se ha medido diariamente desde 1947 en Canadá y constituye la serie temporal continua más larga de observaciones de actividad solar.',
      },
      {
        heading: 'Origen de la Emisión',
        body: 'La emisión a 10.7 cm proviene de la corona solar baja y la cromósfera superior. Tiene tres componentes: un nivel basal constante asociado al Sol en calma, un componente que varía lentamente vinculado a las regiones activas (manchas solares y plage), y brotes cortos asociados con fulguraciones solares. El componente que varía lentamente es el dominante y correlaciona estrechamente con el número de manchas solares y la emisión de ultravioleta extremo (EUV) solar.',
      },
      {
        heading: 'Importancia como Proxy',
        body: 'El índice F10.7 es valioso porque puede medirse fácilmente desde la superficie terrestre en todo tipo de condiciones meteorológicas (la radio a 10.7 cm no es afectada por las nubes). Dado que correlaciona bien con la emisión EUV solar —que sí es absorbida por la atmósfera y solo puede medirse desde el espacio—, el F10.7 se usa ampliamente como proxy de la irradiancia EUV en modelos de la ionósfera y la termósfera. Valores típicos varían entre ~65 unidades de flujo solar (sfu) en el mínimo solar hasta ~250+ sfu en el máximo.',
      },
      {
        heading: 'Aplicaciones',
        body: 'El F10.7 se utiliza como entrada en modelos de densidad atmosférica para predicción de arrastre satelital, modelos ionosféricos para corrección de señales GPS, modelos de propagación de radio HF, y como indicador general del nivel de actividad del ciclo solar. Su medición regular y confiable lo convierte en una piedra angular de la meteorología espacial operacional.',
      },
    ],
  },
  {
    slug: 'galactic-cosmic-rays',
    title: 'Rayos Cósmicos Galácticos',
    summary:
      'Partículas de altísima energía originadas fuera del sistema solar y su modulación por la actividad solar.',
    sections: [
      {
        body: 'Los Rayos Cósmicos Galácticos (GCR, por sus siglas en inglés) son partículas cargadas de alta energía que se originan fuera del sistema solar, principalmente de remanentes de supernovas en nuestra galaxia. Están compuestos principalmente por protones (~87%), partículas alfa (~12%) y una pequeña fracción de núcleos pesados e electrones. Sus energías van desde cientos de MeV hasta más de 10²⁰ eV.',
      },
      {
        heading: 'Modulación Solar',
        body: 'La intensidad de los GCR en el sistema solar interior está inversamente relacionada con la actividad solar. Durante los máximos solares, el campo magnético interplanetario más intenso y las frecuentes CME dispersan y desvían los GCR, reduciendo su flujo en la Tierra (efecto Forbush para reducciones transitorias). Durante los mínimos solares, el flujo de GCR alcanza su máximo. Esta modulación sigue el ciclo solar de ~11 años.',
      },
      {
        heading: 'Efectos en la Tecnología',
        body: 'Los GCR representan un riesgo para la electrónica de satélites a través de los Eventos de Partícula Única (SEE). Cuando un ion pesado de GCR atraviesa un circuito integrado, puede depositar suficiente carga como para cambiar el estado de un bit de memoria (Single Event Upset, SEU), causar un latch-up destructivo, o dañar permanentemente un componente. Paradójicamente, el riesgo de SEE por GCR aumenta durante el mínimo solar, cuando el flujo de GCR es mayor.',
      },
      {
        heading: 'Riesgo de Radiación para Tripulaciones Aéreas y Astronautas',
        body: 'Los GCR contribuyen significativamente a la dosis de radiación recibida por las tripulaciones de aviones comerciales en rutas de gran altitud y latitudes altas, así como por los astronautas en la Estación Espacial Internacional y futuras misiones a la Luna y Marte. La exposición crónica a GCR representa uno de los principales desafíos para las misiones espaciales de larga duración, ya que las partículas más energéticas son extremadamente difíciles de blindar.',
      },
    ],
  },
  {
    slug: 'geomagnetic-storms',
    title: 'Tormentas Geomagnéticas',
    summary:
      'Perturbaciones globales del campo magnético terrestre causadas por el viento solar y las CME.',
    sections: [
      {
        body: 'Una tormenta geomagnética es una perturbación temporal importante del campo magnético de la Tierra, causada por la interacción con estructuras del viento solar, principalmente Eyecciones de Masa Coronal (CME) y corrientes de viento solar rápido de agujeros coronales. Las tormentas geomagnéticas son el tipo de evento de clima espacial con mayor impacto potencial en los sistemas tecnológicos terrestres.',
      },
      {
        heading: 'Fases de la Tormenta',
        body: 'Una tormenta geomagnética típica tiene tres fases. La fase inicial comienza con una Compresión Súbita (SSC) cuando una CME o frente de presión del viento solar comprime la magnetósfera. La fase principal se caracteriza por una caída pronunciada del índice Dst (o su equivalente moderno SYM-H) debido a la intensificación de la corriente anular —un flujo de iones energéticos que circula alrededor de la Tierra a distancias de 3-8 Re. La fase de recuperación, que puede durar días, refleja la gradual disipación de la corriente anular.',
      },
      {
        heading: 'Escala de Tormentas Geomagnéticas',
        body: 'El SWPC utiliza la escala G1-G5 basada en el índice Kp (un indicador global de la actividad geomagnética medido cada 3 horas). G1 (Menor, Kp=5) puede causar fluctuaciones débiles en la red eléctrica y efectos menores en satélites. G5 (Extrema, Kp=9) puede provocar apagones masivos, daños a transformadores, pérdida de comunicaciones por radio y satélite, y extensión de la aurora hasta los trópicos.',
      },
      {
        heading: 'Frecuencia',
        body: 'Las tormentas G1 ocurren unas 900 veces por ciclo solar (~11 años), las G2 unas 360 veces, G3 unas 130 veces, G4 unas 60 veces, y las G5 solo 4 veces en promedio por ciclo. La tormenta geomagnética más intensa registrada instrumentalmente fue la asociada al evento Carrington de septiembre de 1859, que si ocurriera hoy causaría daños estimados en billones de dólares a nivel global.',
      },
    ],
  },
  {
    slug: 'ionosphere',
    title: 'Ionósfera',
    summary:
      'La capa ionizada de la atmósfera terrestre que afecta las comunicaciones y la navegación.',
    sections: [
      {
        body: 'La ionósfera es la porción ionizada de la atmósfera superior terrestre, extendiéndose desde aproximadamente 60 km hasta más de 1000 km de altitud. Se forma por la ionización de los gases atmosféricos por la radiación solar ultravioleta y rayos X. La ionósfera es fundamental para las comunicaciones por radio, la navegación por satélite y los sistemas de radar, y es una de las regiones más directamente afectadas por el clima espacial.',
      },
      {
        heading: 'Capas de la Ionósfera',
        body: 'La ionósfera se divide en capas según la densidad electrónica. La capa D (60-90 km) existe solo durante el día y absorbe las señales de radio HF. La capa E (90-150 km) participa en la refracción de las señales de radio de frecuencia media. La capa F es la más densa y importante: durante el día se subdivide en F1 (150-220 km) y F2 (220-800+ km), mientras que por la noche se fusionan en una sola capa F. La capa F2 alcanza la máxima densidad electrónica y es la principal responsable de la refracción de las señales HF de largo alcance.',
      },
      {
        heading: 'Variabilidad de la Ionósfera',
        body: 'La ionósfera varía en múltiples escalas temporales: diurna (ciclo día/noche), estacional, con el ciclo solar de 11 años, y durante eventos de clima espacial. Las tormentas geomagnéticas pueden causar perturbaciones ionosféricas positivas (aumento de densidad) o negativas (disminución), dependiendo de la fase de la tormenta, la hora local y la latitud. Estas perturbaciones afectan la propagación de radio, la precisión del GPS y las operaciones de radar.',
      },
      {
        heading: 'Anomalías Ionosféricas',
        body: 'La ionósfera presenta varias anomalías respecto al modelo simple de capas. La anomalía ecuatorial (o fuente ecuatorial) produce dos crestas de ionización intensificada a ±15-20° del ecuador magnético, donde el centelleo ionosférico es más severo. La anomalía de invierno (o anomalía estacional) hace que la ionización de latitudes medias sea mayor en invierno que en verano, contraintuitivamente. Estas anomalías son importantes para entender los patrones de propagación de radio y los errores del GPS.',
      },
    ],
  },
  {
    slug: 'ionospheric-scintillation',
    title: 'Centelleo Ionosférico',
    summary:
      'Fluctuaciones rápidas de las señales satelitales causadas por irregularidades en la ionósfera.',
    sections: [
      {
        body: 'El centelleo ionosférico es la fluctuación rápida de la amplitud y fase de las señales de radio que pasan a través de la ionósfera, causada por irregularidades a pequeña escala en la densidad electrónica. Es el equivalente ionosférico del centelleo de las estrellas causado por la turbulencia atmosférica. El centelleo afecta a todas las frecuencias trans-ionosféricas, aunque con mayor intensidad a frecuencias más bajas.',
      },
      {
        heading: 'Mecanismo Físico',
        body: 'Las irregularidades de densidad electrónica actúan como una pantalla de difracción para las señales de radio. A medida que la señal se propaga más allá de esta pantalla, los patrones de difracción se superponen creando fluctuaciones complejas de amplitud y fase. Las irregularidades responsables tienen escalas desde centenas de metros hasta algunos kilómetros y pueden ser generadas por inestabilidades del plasma (como la inestabilidad de Rayleigh-Taylor en la región ecuatorial) o por precipitación de partículas en regiones aurorales.',
      },
      {
        heading: 'Índices de Centelleo',
        body: 'La intensidad del centelleo se cuantifica mediante el índice S4 (para fluctuaciones de amplitud) y el índice σφ (para fluctuaciones de fase). S4 es la desviación estándar de la intensidad normalizada de la señal; valores menores a 0.3 indican centelleo débil, 0.3-0.6 moderado, y mayores a 0.6 centelleo fuerte. Un S4 superior a 1 indica centelleo saturado, donde la señal puede perderse completamente durante intervalos.',
      },
      {
        heading: 'Distribución Geográfica y Temporal',
        body: 'El centelleo es más severo en dos regiones: la zona ecuatorial/tropical (±20° del ecuador magnético), especialmente entre el atardecer y la medianoche local, y las regiones aurorales durante actividad geomagnética. En las latitudes ecuatoriales, la mayor actividad post-atardecer se debe a las "burbujas de plasma" que se forman cuando la ionización decae rápidamente. En las regiones polares, el centelleo está asociado con parches de ionización y arcos aurorales. Las latitudes medias generalmente experimentan centelleo débil, excepto durante tormentas geomagnéticas severas.',
      },
    ],
  },
  {
    slug: 'radiation-belts',
    title: 'Cinturones de Radiación',
    summary:
      'Las regiones toroidales de partículas atrapadas por el campo magnético terrestre.',
    sections: [
      {
        body: 'Los cinturones de radiación de Van Allen son dos regiones con forma de dona (toroide) de partículas energéticas atrapadas por el campo magnético de la Tierra. Fueron descubiertos en 1958 por James Van Allen utilizando datos del satélite Explorer 1. Representan uno de los entornos de radiación más intensos del sistema solar interior y suponen un desafío considerable para los satélites y las misiones tripuladas.',
      },
      {
        heading: 'Cinturón Interno',
        body: 'El cinturón de radiación interno se extiende desde aproximadamente 1.2 hasta 3 radios terrestres (Re) del centro de la Tierra. Está dominado por protones de alta energía (10-100+ MeV), producidos principalmente por el decaimiento de neutrones generados cuando los rayos cósmicos interactúan con la atmósfera (proceso CRAND). El cinturón interno es relativamente estable y cambia poco durante las tormentas geomagnéticas. Sin embargo, la radiación de protones que contiene es extremadamente penetrante y representa un riesgo significativo para los satélites y astronautas que transitan por esta región.',
      },
      {
        heading: 'Cinturón Externo',
        body: 'El cinturón externo se extiende aproximadamente de 3 a 7 Re y está dominado por electrones energéticos (0.1-10 MeV). A diferencia del cinturón interno, el externo es altamente dinámico y varía enormemente con las condiciones del clima espacial. Las tormentas geomagnéticas pueden vaciarlo casi completamente o incrementar las poblaciones de electrones en varios órdenes de magnitud en cuestión de horas a días. Los mecanismos de aceleración incluyen la difusión radial impulsada por fluctuaciones en el campo electromagnético y la aceleración local por ondas electromagnéticas (ondas coro y ondas EMIC).',
      },
      {
        heading: 'Impacto en los Satélites',
        body: 'Los electrones relativistas del cinturón externo (conocidos como "electrones asesinos") representan un peligro particular para los satélites en órbitas medias y geoestacionarias. Pueden penetrar el blindaje del satélite y acumular carga eléctrica en los componentes internos (carga interna profunda), lo que eventualmente provoca descargas electrostáticas que dañan la electrónica. Numerosas anomalías satelitales y fallos completos se han atribuido a este mecanismo, especialmente durante los días posteriores a tormentas geomagnéticas cuando el flujo de electrones relativistas alcanza su máximo.',
      },
    ],
  },
  {
    slug: 'solar-euv-irradiance',
    title: 'Irradiancia Solar EUV',
    summary:
      'La radiación ultravioleta extrema del Sol y su papel fundamental en la ionósfera terrestre.',
    sections: [
      {
        body: 'La irradiancia solar en el ultravioleta extremo (EUV, longitudes de onda entre 10 y 121 nm) es la principal fuente de ionización de la atmósfera superior terrestre y el principal controlador de la ionósfera y la termósfera. Aunque representa una fracción diminuta de la energía total del Sol, la radiación EUV tiene un impacto enorme en el entorno espacial cercano a la Tierra.',
      },
      {
        heading: 'Variabilidad',
        body: 'A diferencia de la irradiancia total del Sol (que varía menos del 0.1% a lo largo del ciclo solar), la emisión EUV varía enormemente: típicamente por un factor de 2-3 entre mínimo y máximo solar para longitudes de onda más largas, y hasta un factor de 10 o más para las longitudes de onda más cortas. Las fulguraciones solares pueden aumentar la emisión EUV en ciertas líneas espectrales por factores de centenares en cuestión de minutos.',
      },
      {
        heading: 'Efecto en la Ionósfera y la Termósfera',
        body: 'La radiación EUV ioniza los gases atmosféricos (principalmente O, N₂ y O₂) creando la ionósfera. Un aumento de la emisión EUV produce mayor ionización, lo que incrementa la densidad electrónica de la ionósfera (afectando las comunicaciones y el GPS) y calienta la termósfera (aumentando la densidad atmosférica a altitudes orbitales y el arrastre satelital). Durante las fulguraciones, el aumento repentino de la ionización por EUV y rayos X es lo que causa los apagones de radio en el lado diurno.',
      },
      {
        heading: 'Medición y Proxies',
        body: 'La radiación EUV es completamente absorbida por la atmósfera terrestre, por lo que solo puede medirse desde el espacio. Los instrumentos EUVS a bordo de los satélites GOES y el instrumento EVE del SDO proporcionan mediciones continuas. Dado que las mediciones espaciales directas son relativamente recientes y a veces presentan interrupciones, se utilizan proxies basados en tierra como el índice F10.7 cm y el índice Mg II para estimar la emisión EUV a largo plazo.',
      },
    ],
  },
  {
    slug: 'solar-flares',
    title: 'Fulguraciones Solares',
    summary:
      'Explosiones repentinas de energía electromagnética en la superficie del Sol.',
    sections: [
      {
        body: 'Las fulguraciones solares son liberaciones súbitas e intensas de energía electromagnética en la atmósfera solar, producidas por la reconexión magnética en regiones de campo magnético complejo. En cuestión de minutos, una fulguración puede liberar una energía equivalente a miles de millones de bombas de hidrógeno, emitiendo radiación a lo largo de todo el espectro electromagnético, desde ondas de radio hasta rayos gamma.',
      },
      {
        heading: 'Clasificación',
        body: 'Las fulguraciones se clasifican según el flujo máximo de rayos X (en la banda de 1-8 Å) medido por los satélites GOES: A (< 10⁻⁷ W/m²), B (10⁻⁷ a 10⁻⁶), C (10⁻⁶ a 10⁻⁵), M (10⁻⁵ a 10⁻⁴) y X (> 10⁻⁴). Cada clase es 10 veces más potente que la anterior. Dentro de cada clase, un número del 1 al 9 indica la intensidad (por ejemplo, X2.5 es 2.5 veces más intensa que X1). Las fulguraciones clase M y X son las más geoefectivas.',
      },
      {
        heading: 'Efectos en la Tierra',
        body: 'Los efectos más inmediatos de una fulguración son los apagones de radio en el lado diurno de la Tierra, causados por la ionización súbita de la capa D de la ionósfera. La radiación viaja a la velocidad de la luz, por lo que el efecto se produce solo 8 minutos después de la fulguración. Las fulguraciones también pueden estar asociadas con la emisión de partículas energéticas solares (SEP) y Eyecciones de Masa Coronal (CME), que llegan horas a días después con efectos adicionales.',
      },
      {
        heading: 'Ciclo de Actividad',
        body: 'La frecuencia de las fulguraciones sigue el ciclo solar de ~11 años. Durante el mínimo solar, las fulguraciones son raras y típicamente débiles (clase A o B). Durante el máximo, pueden ocurrir múltiples fulguraciones clase M por día y varias clase X por mes. El número y la intensidad de las fulguraciones se utilizan como uno de los indicadores principales del nivel de actividad solar.',
      },
    ],
  },
  {
    slug: 'solar-radiation-storm',
    title: 'Tormenta de Radiación Solar',
    summary:
      'Lluvia de protones y partículas energéticas solares que pueden afectar a astronautas y satélites.',
    sections: [
      {
        body: 'Una tormenta de radiación solar ocurre cuando el Sol emite grandes cantidades de partículas energéticas, principalmente protones, que alcanzan la Tierra en tiempos que van desde minutos hasta horas dependiendo de su energía. Estos eventos, también llamados Eventos de Partículas Energéticas Solares (SEP), son generados por las ondas de choque de las CME rápidas y/o por los procesos de reconexión magnética en las fulguraciones solares.',
      },
      {
        heading: 'Escala de Tormentas de Radiación Solar',
        body: 'El SWPC clasifica las tormentas de radiación solar en una escala de S1 a S5, basada en el flujo de protones con energía ≥10 MeV medido por los satélites GOES. S1 (Menor, 10 pfu) tiene efectos biológicos insignificantes. S5 (Extrema, 100.000 pfu) puede causar dosis de radiación peligrosas para astronautas, daño permanente a componentes electrónicos de satélites, apagón completo de HF en las regiones polares y errores de navegación.',
      },
      {
        heading: 'Riesgo para Astronautas',
        body: 'Las tormentas de radiación solar representan uno de los mayores riesgos para los astronautas en el espacio. Fuera de la protección de la magnetósfera (por ejemplo, en misiones a la Luna o Marte), un evento severo puede entregar dosis de radiación letales en cuestión de horas. Incluso en la Estación Espacial Internacional, que está parcialmente protegida por la magnetósfera, los astronautas deben refugiarse en áreas más blindadas durante eventos intensos.',
      },
      {
        heading: 'Efectos en Satélites y Aviación',
        body: 'Los protones energéticos pueden penetrar los blindajes de los satélites, causando degradación de paneles solares, corrupción de memorias electrónicas y daño acumulativo a sensores ópticos como las cámaras CCD. Para la aviación, los eventos de partículas solares aumentan la dosis de radiación para las tripulaciones y pasajeros en rutas polares de gran altitud. Las aerolíneas pueden verse obligadas a redirigir vuelos a altitudes menores o rutas de menor latitud durante eventos severos, con costos significativos.',
      },
    ],
  },
  {
    slug: 'solar-wind',
    title: 'Viento Solar',
    summary:
      'El flujo continuo de plasma que emana del Sol y llena el espacio interplanetario.',
    sections: [
      {
        body: 'El viento solar es un flujo continuo de plasma (gas ionizado) que emana de la corona solar y se extiende por todo el sistema solar. Fue predicho teóricamente por Eugene Parker en 1958 y confirmado observacionalmente poco después por las primeras sondas espaciales. El viento solar arrastra consigo el campo magnético solar, llamado Campo Magnético Interplanetario (CMI), y es el medio a través del cual el Sol influye en los entornos magnéticos y atmosféricos de los planetas.',
      },
      {
        heading: 'Propiedades',
        body: 'En la distancia de la Tierra (1 UA), el viento solar típicamente tiene velocidades de 300-800 km/s, densidades de 1-20 partículas por cm³, y temperaturas de 50.000-200.000 K. El campo magnético interplanetario tiene una intensidad de unos 5 nT. Existen dos regímenes principales: el viento lento (~300-400 km/s), asociado con la banda ecuatorial de corrientes y streamers coronales; y el viento rápido (~600-800 km/s), que emana de los agujeros coronales.',
      },
      {
        heading: 'Medición en el Punto L1',
        body: 'Las propiedades del viento solar se monitorean continuamente mediante satélites en el punto de Lagrange L1, ubicado a 1.5 millones de km de la Tierra en dirección al Sol. Actualmente, el satélite DSCOVR (Deep Space Climate Observatory) de la NOAA es el monitor principal, con datos complementarios de la sonda ACE de la NASA. Las mediciones en L1 proporcionan un tiempo de anticipación de 15 a 60 minutos (dependiendo de la velocidad del viento) antes de que las estructuras del viento solar alcancen la magnetósfera terrestre.',
      },
      {
        heading: 'Influencia en la Tierra',
        body: 'El viento solar es el agente de conexión entre la actividad solar y las perturbaciones geomagnéticas. Los parámetros clave que determinan la geoefectividad son: la velocidad (mayor velocidad = mayor presión dinámica sobre la magnetósfera), la densidad (afecta la posición de la magnetopausa), y especialmente la orientación del campo magnético (un componente Bz sur favorece la reconexión magnética y la transferencia de energía a la magnetósfera). El monitoreo del viento solar en L1 es la base de la predicción del clima espacial a corto plazo.',
      },
    ],
  },
  {
    slug: 'sunspots-solar-cycle',
    title: 'Manchas Solares y Ciclo Solar',
    summary:
      'Las regiones oscuras del Sol y el ciclo de ~11 años que controla la actividad solar.',
    sections: [
      {
        body: 'Las manchas solares son regiones temporales de la fotósfera solar (la superficie visible del Sol) que aparecen oscuras porque son más frías que su entorno (~3500-4500 K comparado con ~5800 K del Sol en calma). Esta menor temperatura se debe a la intensa concentración de campo magnético (1000-4000 gauss) que inhibe la convección, principal mecanismo de transporte de energía en las capas externas del Sol.',
      },
      {
        heading: 'Estructura de las Manchas Solares',
        body: 'Una mancha solar típica consiste en una umbra central oscura rodeada por una penumbra más clara con estructura filamentaria. Las manchas pueden aparecer aisladas, pero frecuentemente se agrupan en regiones activas que contienen múltiples manchas con polaridades magnéticas opuestas. El tamaño varía enormemente: desde poros de apenas unos pocos kilómetros hasta manchas gigantes que superan varias veces el diámetro de la Tierra.',
      },
      {
        heading: 'El Ciclo Solar',
        body: 'El número de manchas solares varía en un ciclo de aproximadamente 11 años (ciclo de Schwabe). Cada ciclo comienza en un mínimo solar, cuando hay pocas o ninguna mancha, y progresa hacia un máximo solar con decenas a centenares de manchas visibles simultáneamente. Actualmente nos encontramos en el Ciclo Solar 25, que comenzó en diciembre de 2019 y se espera alcance su máximo alrededor de 2025. El ciclo magnético completo es de ~22 años, ya que la polaridad magnética del Sol se invierte en cada máximo.',
      },
      {
        heading: 'Importancia para el Clima Espacial',
        body: 'Las manchas solares y sus regiones activas asociadas son el origen de prácticamente toda la actividad solar geoefectiva: fulguraciones, CME, y tormentas de radiación solar. Las regiones activas con campo magnético más complejo y retorcido (clasificación magnética beta-gamma-delta) tienen mayor probabilidad de producir fulguraciones intensas. El número de manchas solares (índice SSN) es el indicador más antiguo y accesible del nivel de actividad solar, con registros continuos desde 1749.',
      },
    ],
  },
  {
    slug: 'total-electron-content',
    title: 'Contenido Total de Electrones (TEC)',
    summary:
      'La medida clave de la ionización atmosférica que afecta las señales de navegación.',
    sections: [
      {
        body: 'El Contenido Total de Electrones (TEC, por sus siglas en inglés) es la cantidad total de electrones libres integrados a lo largo de un camino vertical (o inclinado) a través de la ionósfera, desde la superficie terrestre hasta la altitud del satélite GPS (~20.200 km). Se expresa en unidades TEC (TECU), donde 1 TECU = 10¹⁶ electrones/m². Valores típicos varían de 5 a 150+ TECU dependiendo de la ubicación, hora del día, estación y fase del ciclo solar.',
      },
      {
        heading: 'Medición del TEC',
        body: 'El TEC se mide aprovechando la naturaleza dispersiva de la ionósfera: las señales de diferentes frecuencias experimentan diferentes retardos al atravesarla. Los receptores GPS de doble frecuencia comparan los tiempos de llegada de las señales L1 (1575.42 MHz) y L2 (1227.60 MHz) para calcular el TEC a lo largo de cada línea de visión satélite-receptor. Las redes globales de receptores GPS permanentes permiten crear mapas de TEC en tiempo real.',
      },
      {
        heading: 'Variabilidad del TEC',
        body: 'El TEC varía con el ciclo diurno (máximo alrededor de las 14:00 hora local, mínimo antes del amanecer), con las estaciones (máximos en los equinoccios), con el ciclo solar de 11 años, y con la latitud. Las perturbaciones del clima espacial pueden causar cambios dramáticos: las fulguraciones solares producen aumentos repentinos (conocidos como "TEC flare"), las tormentas geomagnéticas causan tanto aumentos como disminuciones dependiendo de la fase y la latitud, y las perturbaciones ionosféricas viajeras (TID) crean fluctuaciones ondulatorias.',
      },
      {
        heading: 'Importancia para la Navegación',
        body: 'El TEC es directamente proporcional al retardo ionosférico que sufren las señales GPS, con 1 TECU equivalente a un error de rango de aproximadamente 0.16 metros en la frecuencia L1. Para receptores de frecuencia simple, el error ionosférico puede alcanzar 10-30 metros en condiciones normales y mucho más durante perturbaciones. Los Sistemas de Aumentación Basados en Satélite (SBAS), como WAAS, estiman y corrigen el error ionosférico en tiempo real, pero pueden ser incapaces de proporcionar servicio durante eventos intensos de clima espacial cuando los gradientes de TEC exceden la capacidad del modelo.',
      },
    ],
  },
]

// ────────────────────────────────────────────────────
//  Lookups
// ────────────────────────────────────────────────────

export function findImpact(slug: string) {
  return IMPACTS.find((a) => a.slug === slug)
}

export function findPhenomenon(slug: string) {
  return PHENOMENA.find((a) => a.slug === slug)
}
