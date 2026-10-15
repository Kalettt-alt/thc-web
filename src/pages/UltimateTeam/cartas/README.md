# Plantillas de cartas THC

Los cinco PNG de esta carpeta son las plantillas comunes de cada tipo. No se editan para cada jugador: la aplicación dibuja el GRL, posición, bandera, nombre, foto y estadísticas encima, ajustados a sus proporciones.

| Tipo en Supabase | Plantilla |
| --- | --- |
| `bronce` | `BRONCE_CARD.png` |
| `plata` | `SILVER_CARD.png` |
| `oro` | `GOLD_CARD.png` |
| `plus` | `PLUS_CARD.png` |
| `ultimate` | `ULTIMATE_CARD.png` |

Las cartas antiguas con `rareza = 'especial'` usan Plus visualmente; conservan su valor en la base de datos. El diseño no modifica el GRL: una carta Ultimate puede tener cualquier GRL válido, hasta 99.

Deja `diseno_url` vacío para elegir automáticamente la plantilla correspondiente. Puedes indicar otro archivo de esta carpeta si quieres un diseño específico. En `imagen_url` guarda el nombre de una foto local incluida en la carpeta, una URL HTTPS pública o una ruta pública que empiece por `/`. No uses rutas `C:\THC\...` en Supabase.

El sobre inicial entrega 23 jugadores distintos de un pool de 67 ficticios: 37 Bronce, 24 Plata, 5 Oro y 1 Plus. Contiene todas las posiciones para armar un once 4-3-3 y portero suplente, y usa las 20 nacionalidades suministradas. Primero se sortean las 23 calidades globalmente, con tasas base por carta 55% / 34,5% / 10% / 0,5%; después se eligen sus jugadores y se cubren las posiciones sin cambiar los tipos que salieron. Una calidad agotada se excluye del resto del sorteo. No se garantiza una proporción exacta por sobre ni una Plus. Los clubes anteriores conservan sus 23 jugadores originales, con sus IDs, nombres, GRL y estadísticas; no se cambia la plantilla que ya guardaron. No se les atribuyen fotos ni identidades de futbolistas reales.

Los dos porteros originales conservan su modelo antiguo PAC/SHO/PAS/DRI/DEF/PHY. Los nuevos porteros iniciales y los del catálogo usan DIV/HAN/KIC/REF/SPE/POS. No se inventan valores para datos ausentes.

Las 20 banderas suministradas en `Paises/` usan versiones WebP de 480 × 360 para evitar descargar los JPG de 5000 × 3750. Los originales permanecen intactos. Se admiten nombres, códigos de dos letras y aliases de tres letras, incluyendo EEUU, Feroe, Vaticano y San Marino. Otros países conocidos conservan su SVG local; los desconocidos muestran el nombre. El sobre utiliza el arte `SobreUT.png` con su derivado `SobreUT.webp`.

Ejecuta `ComandosSQL_CartasUT.txt` completo después del SQL inicial de Ultimate Team. Amplía los tipos permitidos, mantiene RLS y funciones existentes, y añade únicamente el país de las cartas iniciales que aún no tienen uno. No reparte sobres, no modifica saldos y no sube estadísticas.

Para activar el sorteo inicial ejecuta `ComandosSQL_SobreInicialUT.txt` después de la actualización de UT y Online. Ya viene al final del archivo combinado completo. El recibo privado se conserva al reiniciar el club: no se puede repetir el sorteo para conseguir otra plantilla. Sin esta actualización la web explica que el sobre necesita activación; no fabrica una entrega local.
