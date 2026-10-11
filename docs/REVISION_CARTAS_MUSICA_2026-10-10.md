# Cartas, plantilla y música de Ultimate Team · 10 de octubre de 2026

Las cinco imágenes de `src/pages/UltimateTeam/cartas/` se usan como fondo original de cada carta. Los datos se superponen en los espacios de las referencias: GRL y posición arriba a la izquierda, bandera, nombre y dos columnas de tres estadísticas. Las cartas Bronce, Plata, Oro, Plus y Ultimate comparten el componente; el tipo antiguo `especial` conserva sus datos y se muestra con Plus.

Los 23 jugadores iniciales conservan sus IDs, estadísticas y GRL, cuyo máximo sigue siendo 77 en ese plantel. Se usa Perú como nacionalidad de ficción del tutorial; el catálogo real utiliza el país registrado. Las plantillas ya incluyen una silueta: no se inventaron fotografías. Para añadir un retrato, guarda su archivo o URL pública en `imagen_url`.

Al tocar un jugador se abre su carta en pantalla completa, con nombre completo, país, estadísticas y barras. Desde allí, «Intercambiar posición» permite elegir otro titular o suplente; el arrastre y la autoalineación siguen disponibles. Los nombres largos se distribuyen en dos líneas y reducen su tamaño dentro del espacio reservado.

La plantilla tiene el panel a la derecha, el escudo del club, un distintivo del GRL que cambia de color y un indicador del cambio al editar el once. La barra muestra el siguiente rango visual; no compra mejoras ni altera estadísticas. En móvil se conserva el escudo y una sola zona de desplazamiento.

Crear el club ahora devuelve la identidad confirmada por Supabase y la conserva durante el tutorial. La plantilla también carga el club en ese modo. Si falla una URL pública de escudo de `logos_clubes`, se intenta una URL firmada únicamente para el archivo del propietario, sin cambiar los permisos del bucket.

Música tiene portada, vinilo y controles más legibles. El widget permanece siete segundos, abre los controles al pulsarlo y se oculta sobre la plantilla. El vídeo de YouTube sigue fuera de la pantalla y se conserva su lógica de reproducción.

El botón de eliminar tenía un fallo de interfaz: su portal estaba dentro de `AnimatePresence` y la ventana de confirmación no se mostraba. Se corrigió la composición. El borrado comprueba la sesión, filtra por usuario e ID y exige una fila confirmada antes de retirar la canción de la interfaz. Una respuesta vacía, timeout o error conserva la lista visible y explica que hay que comprobar el resultado. Eliminar la canción actual pausa; eliminar una anterior conserva la selección que se estaba escuchando.

## SQL a ejecutar

Con la instalación anterior de Ultimate Team ya aplicada, ejecutar completos y por separado:

1. `ComandosSQL_CartasUT.txt`: permite Plus y Ultimate, establece el límite de GRL 99 y añade el país del plantel inicial al catálogo privado. Conserva RLS, funciones, estadísticas, saldos y sobres.
2. `ComandosSQL_MusicaUT.txt`: RLS de lectura, inserción, edición y borrado exclusivamente del propietario en `PlaylistUT`. Conserva las políticas ajenas y añade un límite restrictivo para impedir que una política antigua abierta permita acceder a otros usuarios.

No se ejecutó SQL en Supabase. Los scripts `.txt` son idénticos a sus archivos correspondientes en `supabase/`. Se pueden volver a ejecutar sin dar recompensas ni duplicar datos.

## Comprobación

- 188 casos JavaScript comprobados. La prueba de servidor local se repitió fuera de la restricción de red porque esta impedía conectar a su puerto; sus dos casos pasaron sin contactar Discord.
- 15 escenarios SQL base, 6 del parche de cartas y 7 de RLS de música comprobados con PostgreSQL local en memoria.
- ESLint y compilación de producción aprobados; permanece el aviso previo del bundle compartido superior a 500 kB.
- Componentes reales revisados con backend de prueba: cinco diseños, nombre largo, carta ampliada, escudo, intercambio, guardado, música, widget, borrado confirmado y respuesta sin fila eliminada. Plantilla comprobada a 320 px y música a 360 px.

Las capturas en `docs/capturas/` utilizan datos locales de prueba. El comportamiento remoto depende de aplicar los dos parches y de las políticas de Storage que ya tenga el proyecto.
