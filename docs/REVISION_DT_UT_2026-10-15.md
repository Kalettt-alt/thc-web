# Revisión DT Fantasy y Ultimate Team — 15 de octubre de 2026

## DT Fantasy

El menú de carrera conserva su identidad negra y naranja y reorganiza el contenido: próximo partido como acción principal, información de liga y noticias a su lado, accesos a plantilla y calendario, y el nuevo apartado **TOPS**. La recuperación de energía y el contrato tienen su espacio propio. La [entrada cinematográfica](DT_FANTASY_ENTRADA_2026-10-13.md) utiliza un título sencillo sobre el estadio, intro animada de 40 segundos con «Saltar intro», marcadores de demostración con LogoTHC y firma de contrato con colores naturales y transición hacia la carrera.

TOPS es una clasificación global por rayos. Cada resultado nuevo otorga **+2 al ganar, +1 al empatar y −1 al perder**, con la misma regla para todos los rangos. Se admiten saldos negativos. Rescindir o empezar otra carrera no borra los rayos, y las jornadas anteriores a la instalación no conceden puntos retroactivos.

El registro de resultados en Supabase evita conceder rayos varias veces por reintentos del mismo resultado. El motor de DT continúa ejecutándose en el navegador: este registro de recompensas **no convierte los marcadores en una simulación autoritativa ni constituye un sistema antitrampas**.

El partido incorpora esquinas al primer palo, segundo palo, corto y frontal, con recolocación animada. Las paradas y bloqueos pueden acabar en córner. Hay contras, centros, descargas al área, paredes, cambios de orientación, diagonales y desdoblamientos; el pivote ofrece salida cuando cierran el centro y los centrales conservan cobertura.

Agotar el turno permite al rival más cercano acercarse y robar el balón, en lugar de conceder un pase automático. Disparar, la flecha arriba y los gestos permiten rematar sin un cupo que obligue a pasar. Distancia, ángulo, GRL, presión y stamina afectan la precisión. El bot prioriza rematar cuando tiene un camino libre. Véanse las [reglas de jugadas](DT_Jugadas_2026-10-15.md).

## Ultimate Team

La selección de modo se rediseña con una presentación animada de Online, identidad del club, estado de búsqueda y población confirmada por el servidor. Offline conserva la elección de rival para practicar sin sumar estadísticas. Online mantiene un máximo de **3 GRL de diferencia**; la búsqueda no fuerza un rival fuera de ese margen.

Los partidos nuevos usan la simulación **v4**: cada mitad tiene **60 segundos nominales y 4–8 segundos añadidos**, más **12 segundos de descanso**. Se muestran 45+ y 90+ durante el añadido. El cierre se programa después de la última ocasión y su resolución —balón controlado, despeje o reinicio— para no cortar el remate al llegar al minuto nominal. Las versiones anteriores conservan su reloj compatible.

Hay **20 jugadas distintas** con rutas representadas en la cancha: paredes, pases filtrados, centros de ambos lados, desbordes y descargas, cambios de frente, contras centrales y por bandas, subidas de laterales, tres variantes de córner, tiro libre ensayado, presión alta, salida de presión, conducción y segunda jugada. Los ajustes de formación, mentalidad y los cinco cambios se mantienen. En Online, el servidor confirma los acontecimientos y el resultado.

El botón **Arenga** lanza confeti con los colores del equipo y tiene 15 segundos de espera entre usos. Es un efecto de ambiente; no modifica GRL, stamina ni resultados.

El sobre inicial entrega **23 jugadores distintos de un catálogo de 67**, con posiciones suficientes para formar el equipo. Incluye las banderas de los jugadores y el recurso de sobre optimizado, conservando los originales. El catálogo contiene 37 bronces, 24 platas, 5 oros y 1 plus; las estadísticas están ajustadas a cada calidad.

Las tasas base de extracción por carta son **55 % bronce, 34,5 % plata, 10 % oro y 0,5 % plus**. No representan un reparto garantizado dentro de cada sobre de 23. Se extrae sin repetir jugadores; cuando se agota una calidad disponible, se redistribuye entre las restantes. La entrega se registra en Supabase y los reintentos recuperan la misma entrega. Las cartas y plantillas existentes se conservan.

## Archivos para Supabase

Ejecutar cada archivo completo, de forma independiente, desde **Supabase → SQL Editor**. No se ejecutó SQL en el proyecto remoto desde esta revisión.

| Archivo | Contenido |
| --- | --- |
| [ComandosSQL_DTFantasyTOPS.txt](../ComandosSQL_DTFantasyTOPS.txt) | Migración completa de DT: Bebidas THC, guardado y energía, TOPS, registro de rayos y permisos. Reaplicable; conserva carreras y perfiles. |
| [ComandosSQL_ActualizacionUT.txt](../ComandosSQL_ActualizacionUT.txt) | Paquete completo de UT: club, cartas, sobres, Música, guardado de plantilla, Online v4, catálogo inicial y permisos RLS. Incluye las actualizaciones de UT anteriores; no hace falta ejecutar además cada módulo por separado. |
| [ComandosSQL_LimiteMuro.txt](../ComandosSQL_LimiteMuro.txt) | Archivo separado del Muro, si sigue pendiente: tres fotos activas por ciclo de siete días, borrado que libera cupo, fecha del servidor, permisos y Storage. Conserva las fotos históricas. |

Publicar también el frontend actualizado. Estos scripts requieren las tablas base existentes del proyecto; no sustituyen la creación de un proyecto Supabase vacío. TOPS y UT tienen migraciones independientes, por lo que no dependen del orden entre esos dos archivos.

## Verificación y alcance

La comprobación global terminó con **306/306 pruebas aprobadas**, **ESLint correcto** y **build de producción correcto**. Las pruebas incluyen controles del partido, reinicios, energía, guardado, rayos, sorteos, compatibilidad de versiones y la simulación UT. El build verifica la compilación local; no equivale a haber desplegado ni a haber realizado una prueba de carga de jugadores simultáneos en producción.
