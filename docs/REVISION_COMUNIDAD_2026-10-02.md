# Revisión de Inicio, Foro y Muro THC · 2 de octubre de 2026

El Foro y el Muro siguen el estilo naranja, crema y negro del Inicio. Se conservan los manejadores de datos y las interacciones de DomeGallery. Los archivos SQL se entregan aparte para revisar en Supabase; no se ejecutaron en la base remota.

## Diseño aplicado

- Inicio: retirado el medallón del logo y su etiqueta superpuestos sobre el título gigante THC. Se retiraron sus reglas CSS y su animación; las demás presentaciones, las transiciones de rutas y las letras interactivas del footer se conservan.
- Foro: cabecera grande, cinta naranja, tarjetas con puntuación visible, filtros animados, guía de participación y acceso al Muro. Las tarjetas y los títulos reaparecen al volver a entrar en pantalla. El formulario, el detalle y los comentarios comparten la nueva identidad.
- Muro: cabecera, guía de uso y botón de publicación renovados. El detalle tiene panel lateral en escritorio y panel inferior en móvil, con la imagen encima. Los votos muestran selección y contadores con botones más legibles.
- Formularios: etiquetas, tamaños de texto, foco y estados de guardado visibles. Se mantienen los límites y validaciones existentes. La vista previa del Muro revoca sus URL temporales al cambiar de archivo o desmontarse.
- Animaciones de presentación conectadas al control compartido del menú. Pausarlas deja todo el contenido visible. No se cambiaron las animaciones internas ni los parámetros de DomeGallery.

## Errores corregidos en el Muro

1. Salir a otra página con una imagen abierta podía dejar `body.style.overflow` bloqueado. El wrapper restaura el valor anterior al desmontarse.
2. El teclado podía recorrer tarjetas detrás del detalle. Ahora se aplica `inert` únicamente a la esfera y Tab queda dentro del panel. Al cerrar, vuelve al elemento visible que lo abrió o al enlace de Inicio, sin desplazar la página.
3. Las tarjetas decorativas se ocultaron a lectores de pantalla y al recorrido de Tab. Los momentos reales tienen nombre accesible y foco naranja.
4. Abrir por teclado en paisaje podía desplazar un contenedor oculto y mandar la imagen ampliada fuera de la pantalla. Los contenedores usan `overflow: clip`; la prueba de 640 × 360 confirmó scroll interno cero e imagen visible.
5. En pantallas bajas, cabecera y controles se compactan para dejar espacio a la galería. Los formularios y el detalle conservan desplazamiento interno para acceder a sus controles.
6. Al reabrir un borrador con una imagen seleccionada, el input de archivo no exige volver a seleccionar el mismo archivo. Título, descripción y vista previa se conservan si falla la publicación.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 91 pruebas aprobadas, 0 fallos. Incluyen Fantasy, bot de entrenamiento, reproductor, validaciones y servidor de Discord. |
| `npm run lint` | Sin errores. |
| `npm run build` | Compilación completada. |
| Comparación de funciones y efectos originales | 23 funciones y 5 efectos contrastados en seis componentes; ninguna modificación detectada en esos manejadores o efectos. |
| DomeGallery y utilidades de votos del Foro | SHA-256 idénticos a los archivos previos al rediseño. |
| Navegador | Revisión de escritorio 1280 × 800, móvil 320 × 640, pantalla baja 320 × 480 y paisaje 640 × 360. |
| Limpieza | Fixture, servidor de prueba, baselines y comprobador temporal retirados. Tamaño del navegador restaurado. |

La compilación conserva el aviso de un bundle principal mayor de 500 kB: 630,56 kB, 190,71 kB con gzip. Foro, detalle y Muro siguen en módulos de carga diferida. No se hizo una medición de FPS en dispositivos físicos ni del rendimiento de la base remota.

La comparación de código no sustituye una prueba funcional. En navegador se comprobó además: votar y retirar voto en el Foro; cambiar, retirar y seleccionar voto en el Muro; filtro de populares; error de carga y reintento; error de publicación con borrador conservado y publicación posterior; comentario, edición, borrado confirmado y respuesta anidada; arrastre de la esfera; selección de imagen y vista previa; cierre/reapertura del formulario; ciclo de foco del detalle; salida al Inicio con scroll restaurado; pausa y reactivación de las animaciones.

Estas pruebas de interfaz utilizaron un fixture temporal con sesión, tablas y Storage simulados. No publicaron contenido, imágenes, votos ni mensajes en Supabase o Discord. Las capturas contienen datos de demostración y una barra de revisión que no forma parte de la aplicación. La paginación existente se conservó en la comparación de código; el fixture tenía tres debates y no ejercitó el cambio de página.

## Capturas

- [Inicio sin medallón](capturas/inicio-sin-medallon-2026-10-02.png).
- [Portada del Foro](capturas/foro-portada-2026-10-02.png).
- [Lista de conversaciones](capturas/foro-lista-2026-10-02.png).
- [Detalle del debate](capturas/foro-detalle-2026-10-02.png).
- [Detalle del Foro en móvil](capturas/foro-detalle-movil-2026-10-02.png).
- [DomeGallery del Muro](capturas/muro-galeria-2026-10-02.png).
- [Detalle del Muro](capturas/muro-detalle-2026-10-02.png).
- [Votos del Muro en móvil](capturas/muro-movil-2026-10-02.png).
- [Imagen del Muro en paisaje](capturas/muro-paisaje-2026-10-02.png).

## SQL y configuración pendiente

La [guía de SQL de comunidad](SQL_COMUNIDAD_2026-10-02.md) separa auditoría, índices, protección opcional de propiedad de los votos y corrección opcional de la clave foránea al borrar un momento con votos. El paquete no reemplaza tus RLS ni borra duplicados para forzar una migración. Hay que revisar las políticas reales y verificar desde dos cuentas del navegador; el esquema entregado no contiene esas políticas.

No se dispone de PostgreSQL local ni de una conexión administrativa a Supabase. Los scripts tienen revisión estática contra el esquema y las consultas existentes, pero ninguna ejecución de prueba en una base. El envío de Discord sigue requiriendo los secretos privados del servidor y la cuota descritos en su guía existente. El webhook no vuelve al código del navegador.
