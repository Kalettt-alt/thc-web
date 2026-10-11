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

Las 23 cartas del tutorial siguen con sus IDs, nombres, GRL y estadísticas originales. Son jugadores ficticios de la plantilla de bienvenida; se les asignó Perú (`PE`) como país de esa plantilla. No se les atribuyen fotos ni identidades de futbolistas reales. Las cartas de jugadores que añadas al catálogo usarán su propia `nacionalidad`.

Los dos porteros iniciales usan el modelo antiguo de seis estadísticas, por lo que conservan sus valores y etiquetas PAC/SHO/PAS/DRI/DEF/PHY. Las cartas de porteros del catálogo usan sus seis estadísticas específicas DIV/HAN/KIC/REF/SPE/POS. No se inventan valores para los datos ausentes.

La bandera usa un SVG local, sin consultar servicios externos. `nacionalidad` admite países por nombre, por código de dos letras (`PE`, `AR`, `BR`, etc.) y algunos códigos de tres letras. Si el país no está incluido, se conserva su nombre sin fabricar una bandera.

Ejecuta `ComandosSQL_CartasUT.txt` completo después del SQL inicial de Ultimate Team. Amplía los tipos permitidos, mantiene RLS y funciones existentes, y añade únicamente el país de las cartas iniciales que aún no tienen uno. No reparte sobres, no modifica saldos y no sube estadísticas.
