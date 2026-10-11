# Inicio, navbar, Fantasy y envío a Discord · 2 de octubre de 2026

Esta revisión continúa los cambios de [DT Fantasy y diseño THC](REVISION_DT_2026-10-01.md) y la [revisión inicial](../REVISION.md). Los cambios están guardados en el proyecto. No se desplegó la web, no se aplicó SQL remoto y no se enviaron imágenes reales a Discord.

## Inicio y navegación

El Inicio tiene una nueva composición naranja, negra y crema: título principal grande, imagen de Haxball de la comunidad, emblema THC, franja animada, tarjetas de los tres juegos, accesos comunitarios, guía de tres pasos y seis preguntas frecuentes. El pie de página acompaña el mismo estilo. Se retiró el apartado TWC. Las animaciones incluyen apariciones al entrar en pantalla, movimientos decorativos suaves y estados de interacción; la franja se puede pausar y el nuevo Inicio respeta la preferencia de movimiento reducido.

Se corrigió la importación de `Inicio.css` creando la hoja de estilos que faltaba. Las referencias de diseño fueron la escala tipográfica y la navegación de [NYNJ 2026](https://nynjfwc26.com/), adaptadas a la identidad y a los apartados existentes de THC.

El navbar conserva el botón que abre las categorías **Diversión, Comunidad e Información**, con entrada escalonada de 0,1 segundos entre grupos y animación de apertura/cierre de 0,3 segundos. Tiene el logo centrado, controles de mensajes/notificaciones/perfil y un estilo más integrado con el Inicio. Escape cierra el panel y devuelve el foco al botón; en móvil las categorías se apilan y se pueden desplazar. Se conservaron la transición naranja/negra entre categorías y la entrada propia de Ultimate Team.

El contador consulta `perfiles` con `count: 'exact'` y `head: true`. Informa los **perfiles visibles para la cuenta según las RLS**, no el total privado de `auth.users`. Durante la carga no inventa una cifra; cuando falla, muestra un estado de error y permite reintentar. No se modificaron las políticas remotas para obtener un total global.

## DT Fantasy

- El partido se abre en una previa: el reloj, la IA y la stamina permanecen detenidos hasta pulsar **Comenzar partido**. Se puede revisar la alineación antes del saque.
- Después de la celebración de gol de 2 segundos, los jugadores vuelven a sus posiciones durante 1 segundo. El equipo que recibió el gol saca desde el centro; el reloj y la fatiga permanecen congelados durante el regreso.
- El panel permite intercambiar puestos arrastrando o seleccionando un jugador, activando **Mover de puesto** y eligiendo el destino. También admite M, flechas y Enter. Mantiene la identidad, energía y estadísticas de cada jugador, junto con la penalización existente por jugar fuera de posición.
- El GRL efectivo influye en velocidad, desgaste, precisión de pase, reacción y control. No se añadieron atributos individuales nuevos. La stamina y el rol siguen condicionando el rendimiento.
- La configuración del menú y la pestaña **Cancha** permiten desactivar el estadio decorativo y el radar. La cancha básica elimina tribunas, luces, textura y sombras; conserva la geometría, controles y simulación. Estas preferencias se guardan solo en el dispositivo. No se midió una mejora numérica de FPS.

## Discord: implementación preparada, activación pendiente

El botón usa ahora `/api/compartir-tierlist`, atendido por un servidor local de Vite o una función de Vercel. No requiere comprar un dominio. Para otro proveedor con alojamiento estático se conserva la alternativa de Edge Function de Supabase.

El servidor verifica la sesión con Supabase Auth, permite orígenes exactos, valida estructura/dimensiones/tamaño del PNG y reserva una cuota persistente antes de contactar Discord. El webhook se queda en el servidor; las respuestas al navegador no incluyen secretos ni detalles internos. El cliente comprueba la configuración antes de capturar el tablero y diferencia errores de sesión, origen, cuota, imagen, conexión y canal.

**Falta configurar un webhook nuevo privado y ejecutar `supabase/tierlist_rate_limit.sql` en el proyecto de Supabase.** En este equipo solo se dispone de la configuración pública de Supabase. Las instrucciones concretas para local, Vercel y otro hosting están en [la guía de activación](../supabase/functions/compartir-tierlist/README.md). No se comprobó un envío real ni el login real de Discord.

## Limpieza comprobada

Solo se retiraron estos archivos tras comprobar referencias de imports, URLs y cargas dinámicas:

| Archivo | Motivo |
| --- | --- |
| `public/VideoInicio.mp4` | El Inicio nuevo ya no carga el vídeo de 64.417.566 bytes. |
| `src/components/InfiniteSpiral.jsx` | El componente del Inicio anterior ya no tiene importaciones. |
| `public/favicon.svg` | Se reemplazó el favicon de 10.194.386 bytes por el `LogoTHC.png` existente. |

Se conservaron `VideoUT.mp4`, `UTSpiral.png`, `FondoInicio.jpg` y las imágenes usadas por glob. Los archivos temporales de revisión visual se eliminaron después del QA y no forman parte de la aplicación. La compilación final regeneró `dist`.

## Verificación final

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 91 pruebas pasan, sin fallos ni pruebas omitidas. |
| `npm run lint` | Sin errores ni advertencias. |
| `npm run build` | Correcta. Bloque compartido de 609,22 KB, 182,95 KB gzip; permanece la advertencia de Vite por superar 500 KB. |
| Inicio y navbar | Revisados en 1280×720, 360×640 y 320×640; menú por categorías, cierre con Escape, preguntas frecuentes y error/reintento del contador. Sin desbordamiento horizontal a 320 px. |
| Fantasy | Previa en escritorio/móvil, revisión de alineación sin avanzar el reloj, intercambio de centrales manteniendo energía, cambio a cancha básica/radar apagado y comienzo manual. Preferencias conservadas al recargar. |
| Discord | Cliente, handler y adaptación HTTP local probados con servicios simulados. No hay envío real ni despliegue remoto. |
| Endpoint local real | GET devuelve `503 / SERVER_NOT_CONFIGURED`: la ruta está conectada, pero falta el webhook privado. No contacta Discord. |

Las revisiones de navegador utilizaron los componentes reales con plantillas locales y un contador de ejemplo claramente identificado, sin consultas ni escrituras de Supabase. El equilibrio del partido y el comportamiento en otros dispositivos requieren juego real; estas comprobaciones no garantizan todas las resoluciones o niveles de zoom.

Capturas: [Inicio](capturas/inicio-thc-2026-10-02.png), [categorías del navbar](capturas/navbar-categorias-thc.png), [Inicio móvil](capturas/inicio-thc-movil.png), [comunidad](capturas/inicio-comunidad-thc.png), [previa Fantasy](capturas/fantasy-previa-thc.png), [previa móvil](capturas/fantasy-previa-movil-thc.png), [intercambio de puestos](capturas/fantasy-posiciones-thc.png) y [cancha básica](capturas/fantasy-cancha-basica-thc.png).
