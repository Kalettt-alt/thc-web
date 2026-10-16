# Entrada cinematográfica de DT Fantasy

Estado actualizado el **15 de octubre de 2026**. Este documento sustituye la descripción anterior de la entrada con pizarra y de las opciones para activar animaciones.

## Pantalla inicial

La entrada muestra un estadio nocturno animado, el título **THC: DT FANTASY** y **«Presiona cualquier tecla para iniciar»**. Se puede continuar con teclado, clic o toque; «Regresar» permanece arriba. La pizarra ya no es la composición principal de esta pantalla. El aviso previo a la carrera conserva su aceptación y la opción de no volver a mostrarlo.

La presentación visual utiliza negro, gris oscuro y naranja. El estadio se dibuja con los recursos del componente `FantasyStadium`; no depende de cargar el antiguo estadio 3D. Las carreras existentes conservan su progreso y su recorrido hacia el menú de carrera.

## Introducción

La introducción dura **40 segundos** y tiene seis planos: salida del DT por el túnel, colores de los clubes, preparación táctica en la mesa, jugada en el campo, celebración y título final. Sus inicios están programados en 0, 6,2, 12,9, 19,6, 26,5 y 33,4 segundos. Las escenas usan movimiento de cámara, barridos y cortes; los textos son rótulos breves.

Las animaciones de esta presentación están activadas siempre, sin pedir que el usuario las habilite y sin botones de «Activar animaciones» o «Reducir movimiento». **«Saltar intro»** sigue disponible en el pie. Saltar o completar el reloj termina una sola vez; salir de la pantalla cancela los temporizadores.

Los marcadores de la jugada de demostración y de la celebración muestran **LogoTHC en ambos lados**. El resultado de ejemplo no atribuye una victoria a River, Boca ni a otro club real. La escena de colores conserva una muestra de varios clubes, distinta de esos marcadores de demostración.

## Selección, contrato y entrada a la carrera

La selección permite buscar un club y filtrar por país. «Dirigir este club» confirma la elección; se conservan los equipos, sus ligas, presupuestos y plantillas.

El contrato mantiene colores naturales: piel del director, traje, escritorio de madera, papel claro, tinta y sello. El naranja se utiliza como acento. La oferta del documento tiene una preparación de **1,65 segundos** antes de habilitar «Firmar contrato».

Al firmar se dibuja la firma, se coloca el sello y aparece una transición con el escudo y el nombre del club hacia el menú de carrera. El sello comienza a los 1,15 segundos desde la firma; la transición, a los 2,15; el callback que continúa la carrera se ejecuta a los 3,3 segundos. Repetir el clic no crea varias firmas, y desmontar la pantalla cancela la secuencia.

## Verificación y SQL

Las siete pruebas de `fantasy-entry-timeline.test.mjs` cubren la duración completa, los cambios de escena, el salto, la cancelación y la firma con transición única. La revisión global del 15 de octubre terminó con **306 pruebas aprobadas**, ESLint y build de producción correctos.

La entrada y sus animaciones no necesitan una migración SQL. El nuevo ranking TOPS sí utiliza su archivo independiente: véase [la revisión de DT y UT](REVISION_DT_UT_2026-10-15.md).
