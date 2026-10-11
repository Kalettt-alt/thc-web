# Revisión de THC · 30 de septiembre de 2026

La última continuación está en [Perfiles y Álbum · 3 de octubre](docs/REVISION_PERFILES_ALBUM_2026-10-03.md): siete estilos distintos, editor con vista previa, inventario y mercado simplificados, navegación entre secciones retirada y 120 pruebas aprobadas. [ComandosSQL_Perfiles.txt](ComandosSQL_Perfiles.txt) añade únicamente la protección propuesta para perfiles; la [guía](docs/SQL_PERFILES_2026-10-03.md) incluye la asignación manual de sobres.

La continuación más reciente está en [Álbum y Ranking · 3 de octubre](docs/REVISION_ALBUM_RANKING_2026-10-03.md), con inventario, intercambios, sobres, capturas y 111 pruebas aprobadas. Los comandos están separados en [ComandosSQL.txt](ComandosSQL.txt) y su [guía de instalación](docs/SQL_ALBUM_2026-10-03.md). [Inicio animado, navbar y Tinder THC · 2 de octubre](docs/REVISION_INICIO_ANIMADO_2026-10-02.md) documenta las letras interactivas y presentaciones de scroll. [Fantasy y Discord](docs/REVISION_INICIO_FANTASY_2026-10-02.md) reúne la revisión anterior y la configuración pendiente del envío. Los resultados siguientes corresponden a la revisión inicial.

Se corrigieron errores de interfaz, guardado, sincronización y jugabilidad en el proyecto React/Vite. Se conservaron Discord como login, Supabase como persistencia, las carreras y clasificaciones, el orden del marcador y los textos del Reglamento. No se ejecutaron cambios en la base de datos remota ni se enviaron mensajes a Discord.

**Transiciones y diseño.** Se recuperó la transición original entre categorías: bloque naranja, bloque negro, logo THC, entrada de 0,5 segundos y salida iniciada a los 1,2 segundos. Se mantuvieron el vídeo y las fases de entrada de Ultimate Team, además de su transición naranja al cambiar de modo. Las capas decorativas no interceptan los botones. Reglamento ahora tiene navegación por artículos, tarjetas más legibles, márgenes para el navbar y mini animaciones. Sus cuatro reglas y tres mensajes mantienen exactamente el texto original.

**Notificaciones y persistencia.** Se añadió un sistema común de avisos de éxito, error y desconexión. Crear equipo, guardar plantilla, borrar club, modificar perfil, publicar, comentar y enviar mensajes comprueban la respuesta de Supabase antes de anunciar éxito. Se conservan los borradores cuando falla una escritura. Fantasy serializa sus guardados y evita escribir datos de una cuenta anterior o recrear una carrera después de borrarla. TierList guarda el último cambio al salir, incluso si quedaba pendiente el guardado por debounce. Solicitar amistad ahora proporciona el `enlace_id` obligatorio y distingue una solicitud creada de un aviso que falló.

**Música.** El reproductor visible fue retirado; quedan los controles de audio. El primer play se ejecuta desde el clic, conserva la petición anterior a `onReady` y no permite que los eventos iniciales de pausa la cancelen. Se admiten enlaces oficiales y los IDs/enlaces antiguos guardados; se sincronizan reproducción, pausa, buffering, final y errores desde YouTube. La instancia se conserva al cerrar los controles, y aparece «Activar música» si hay bloqueo o demora. El iframe oculto no recibe foco con Tab.

La reproducción oculta usa la API IFrame, sin descarga ni extracción de audio. YouTube restringe la reproducción cuando el player no se muestra, y el navegador puede bloquearla. La prueba local confirmó `PLAYING` con YouTube real y volumen cero, pero no garantiza ese comportamiento en todos los navegadores ni su disponibilidad futura. Referencias: [políticas de YouTube](https://developers.google.com/youtube/terms/developer-policies#i.-additional-prohibitions), [eventos del reproductor](https://developers.google.com/youtube/iframe_api_reference).

**DT Fantasy.** Se separaron las funciones de táctica, simulación y geometría para poder comprobarlas. Se corrigieron los roles invertidos del rival, la persecución del balón por todos los jugadores, la dependencia de los FPS y la puntería con zoom fijo. Hay un presionador por equipo, jugadores de apoyo, recepción de pases, separación entre compañeros y porteros que anticipan la trayectoria. La cancha y los gestos usan medidas reales del área de juego. Los turnos duran 4,5 segundos, con un máximo acumulado de 3 segundos para apuntar; los gestos antiguos se descartan. Funcionan la pausa, el descanso, el segundo tiempo y la entrega única del resultado. Se conserva la energía de la carrera y su penalización existente por posición. Los goles aportan el identificador original del goleador para el MVP; no se acreditan autogoles. También se corrigió la selección de clubes con IDs repetidos entre ligas.

**Rendimiento.** Los apartados se cargan por separado mediante imports dinámicos. El bloque inicial pasó de 1.686,27 KB a 614,05 KB minificados (de 526,73 KB a 183,48 KB con gzip); el tamaño total se distribuye entre los módulos que se abren. Vite todavía avisa que el bloque compartido supera 500 KB. El foro pagina de veinte en veinte; tarjetas, filas de playlist, filtros y colecciones evitan trabajo repetido, las imágenes se cargan según necesidad y TierList ya no convierte todas las imágenes incluidas a base64 al arrancar. Las animaciones limpian sus timers, RAF y recursos al salir.

**Seguridad del código.** Se validan formato, firma y peso de imágenes antes de subirlas, con nombres aleatorios y prefijos del usuario. Se restringen colores y temas interpolados en CSS, los enlaces de YouTube se comprueban por dominio real y la compilación rechaza claves privadas de Supabase en variables públicas. Rankings dejó de solicitar `auth_key`. El webhook de Discord expuesto se retiró del cliente y se preparó una función de servidor con sesión, origen, cuota y límites de entrada. Se actualizaron las dependencias transitivas vulnerables `nanoid` y `brace-expansion` dentro de sus rangos compatibles, sin ejecutar scripts de instalación.

Ya existen RLS en tu Supabase, según tu confirmación. El esquema pegado no incluye su contenido, los grants ni las RPC. Los scripts siguientes son propuestas para contrastar con esas reglas; no demuestran una exposición remota y no deben sustituirlas sin revisar la auditoría. El frontend por sí solo no puede impedir que alguien manipule sus propios atributos, monedas o resultados desde un cliente modificado: los premios y datos competitivos necesitan validación autoritativa en el servidor. [RLS y permisos de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Orden de revisión de los archivos de servidor:

1. `supabase/audit_security.sql`: consultas de políticas, permisos, funciones, triggers y buckets actuales.
2. `supabase/ut_fantasy_hardening.sql`: propiedad de filas, permisos mínimos, bono único y RPC de inicialización/reset atómico. Detalles en `supabase/UT_FANTASY_SECURITY.md`.
3. `supabase/forum_profile_hardening.sql`: protección de roles, propiedad de publicaciones y puntuación derivada de votos. Se detiene si detecta otros triggers de puntuación para evitar sumar dos veces.
4. `supabase/community_storage_hardening.sql`: chat, amistades, notificaciones respaldadas por acciones reales, votos del muro y archivos. Detalles en `supabase/COMMUNITY_SECURITY.md`.
5. `supabase/tierlist_rate_limit.sql` y `supabase/functions/compartir-tierlist/README.md`: cuota, regeneración del webhook, secretos y despliegue de la función.

Las propuestas se revisaron de forma estática y entre dos revisores; no se ejecutaron en PostgreSQL. Deben probarse con respaldo en un proyecto de prueba y con dos cuentas. Las políticas restrictivas antiguas pueden bloquear operaciones que las nuevas permiten. Los índices únicos se detienen si encuentran duplicados y no los eliminan automáticamente. Si `chat_media` sigue siendo público, las imágenes siguen accesibles para quien conozca su URL; la privacidad requiere migrar el frontend a URLs firmadas y el bucket a privado. El cooldown de apodos, los temas VIP y las RPC/tablas antiguas pendientes están descritos en los documentos de seguridad.

Verificación local:

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 46 pruebas pasan: persistencia, archivos, configuración, función Discord, YouTube y gameplay |
| `npm run lint` | Sin errores ni advertencias |
| `npm run build` | Compilación de producción correcta; advertencia de tamaño del bloque compartido |
| Auditoría de dependencias de npm | Cero vulnerabilidades tras actualizar las dos dependencias |
| Textos del Reglamento | Comparación AST: cuatro reglas y tres mensajes intactos |
| Foro 360×640 y 320×480 | Formulario y botón de envío dentro de la pantalla, sin desbordamiento horizontal; error visible y borrador conservado |
| Reglamento 1280×800 y 360×640 | Navbar separado del contenido; los enlaces dejan el artículo por debajo del navbar |
| Fantasy 360×640 y 640×360 | Cancha y controles adaptados; pausa y cambio de formación conservan el marcador |
| YouTube real en demo aislada | Primer play con dos canciones existentes llegó a `PLAYING`, sin añadir canción y con cero escrituras de BD |
| Transición de categoría | Bloques animados confirmados; ninguna capa intercepta clics; no se repite al entrar en un detalle del mismo foro |

Las pruebas de navegador usaron componentes reales con datos de demostración y Supabase simulado; no verificaron el login real de Discord ni los permisos reales de tu BD. Los tamaños reducidos comprueban el espacio disponible en CSS; no son una prueba de todos los dispositivos ni de cada nivel de zoom de cada navegador. La comodidad y equilibrio del gameplay deben afinarse jugando partidos reales.

Capturas: [Reglamento en escritorio](docs/capturas/reglamento-escritorio.png), [Reglamento móvil](docs/capturas/reglamento-movil.png), [error de foro móvil](docs/capturas/foro-movil-error.png), [música sin vídeo](docs/capturas/musica-sin-video.png), [partido móvil](docs/capturas/fantasy-movil.png), [transición](docs/capturas/transicion-categoria.png).

[Revisión de Foro, Muro e Inicio del 2 de octubre](docs/REVISION_COMUNIDAD_2026-10-02.md): diseño naranja y crema, DomeGallery conservado, correcciones de teclado/scroll/encuadre, 91 pruebas aprobadas y SQL separado para revisar con RLS activo.

Se eliminaron comentarios de implementación del código de la aplicación, conservando avisos de licencia y directivas técnicas. La limpieza de archivos siguió los imports desde `src/main.jsx`, incluyendo imports dinámicos literales y comprobación adicional de referencias. Se conservaron las imágenes cargadas por `import.meta.glob` y los archivos usados por rutas activas. Solo se retiraron estos 21 archivos sin uso:

```text
src/App.css
src/components/BounceCards.jsx
src/components/FloatingLines.jsx
src/components/ui/ConfiguracionModal.jsx
src/pages/Admin.jsx
src/pages/Noticias.jsx
src/pages/Perfil/PerfilTemaSelector.jsx
src/pages/THCFantasy/EntretiempoDF.jsx
src/pages/THCFantasy/FantasyLlaves.jsx
src/pages/THCFantasy/MotorPartidoDF.jsx
src/pages/UltimateTeam/AccordionGallery.jsx
src/pages/UltimateTeam/GradientWaves.jsx
src/pages/UltimateTeam/ReproductorTHC.jsx
src/pages/UltimateTeam/SkillMode/haxPhysics.js
src/pages/UltimateTeam/SkillMode/SkillLoadingScreen.jsx
src/pages/UltimateTeam/SkillMode/SkillMatch.jsx
src/utils/colores.js
src/assets/react.svg
src/assets/vite.svg
src/assets/hero.png
public/icons.svg
```
