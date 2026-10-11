# Perfiles y Álbum · continuación del 3 de octubre de 2026

Se priorizó el perfil y después el inventario y el mercado. La rueda del menú de Álbum, la apertura de cinco cromos, las funciones de intercambio y las transiciones existentes se conservan. Esta revisión no ejecutó SQL remoto, abrió sobres reales ni creó intercambios reales.

## Siete perfiles

| Estilo | Distribución y presentación | Captura local |
| --- | --- | --- |
| Original | Identidad a la izquierda, paneles oscuros y destacados amplios | [Original](capturas/perfil-original-2026-10-03.png) |
| Agua | Identidad a la derecha, tablero a la izquierda, marcos azules | [Agua](capturas/perfil-agua-2026-10-03.png) |
| Pixel Art | Tipografía de juego, avatar cuadrado, bordes y sombras del color personal | [Pixel Art](capturas/perfil-pixel-2026-10-03.png) |
| Club | Ficha deportiva horizontal, escudo, estado lateral y destacados en columnas | [Club](capturas/perfil-club-2026-10-03.png) |
| Editorial | Fondo claro, retrato vertical y títulos de portada | [Editorial](capturas/perfil-editorial-2026-10-03.png) |
| Aurora | Identidad centrada, panel suave y destacados debajo | [Aurora](capturas/perfil-aurora-2026-10-03.png) |
| Terminal | Cuadrícula compacta, letras monoespaciadas e identificador del jugador | [Terminal](capturas/perfil-terminal-2026-10-03.png) |

La selección permite previsualizar, cancelar y guardar expresamente. No escribe al previsualizar. El guardado comprueba sesión actual, propietario, nivel VIP existente y la fila devuelta. El estilo confirmado se aplica a la vista pública; los visitantes no disponen de controles privados. Los IDs `default`, `twc` y `pixel` se mantienen para perfiles anteriores. Los comentarios reutilizan el componente existente y adoptan los colores del tema.

El editor se divide en Identidad, Imágenes y Destacados, con vista previa del borrador. Elegir un estilo conserva los otros cambios pendientes; guardar el formulario no sobrescribe el estilo recién elegido. Los fallos conservan el borrador y muestran un aviso. Encuadres inválidos se acotan; Spotify admite enlaces oficiales localizados y rechaza hosts falsos; imágenes y colores evitan protocolos activos e inyección en estilos. Selector y pestañas admiten teclado, y el selector bloquea el contenido de fondo y recupera el foco al cerrarse.

## Inventario e intercambios

Se retiró la barra de navegación entre secciones de todo Álbum; queda Volver. Inventario elimina los cuatro bloques estadísticos, textos de presentación, explicación repetida en cada carta y enlaces finales. Conserva búsqueda, categorías, orden, cinco filtros y paginación de 24 cromos. Los nombres ausentes muestran el ID. Cantidad, estado pegado y copias para cambiar siguen visibles con letras más grandes.

Mercado muestra las cartas Das → Recibes, acciones, disponibilidad y vencimiento. Crear una oferta usa dos huecos visuales con selección de cartas y una confirmación. Se conservan las comprobaciones de copia disponible, reservas, primera copia, límite de dos ofertas, expiración, RPC y recuperación de solicitudes pendientes. Las modificaciones de esta continuación son de presentación; las operaciones económicas siguen en las funciones del servidor ya instaladas.

[Inventario](capturas/inventario-limpio-2026-10-03.png) · [Mercado](capturas/intercambios-visual-2026-10-03.png) · [Oferta](capturas/oferta-visual-2026-10-03.png) · [Vista pública del perfil](capturas/perfil-vista-publica-2026-10-03.png).

## Comprobaciones

- `npm test`: 120 pruebas pasan. Se añadieron nueve pruebas de temas, recibos de guardado, sesión y nivel, encuadres, límites, imágenes y Spotify.
- `npm run lint`: sin errores ni advertencias.
- `npm run build`: producción compilada. Continúa el aviso del bloque compartido de 630,79 KB, anterior a esta revisión; los perfiles se cargan por separado.
- Navegador con componentes reales y Supabase simulado: siete estilos, previsualizar/cancelar sin escritura, guardar, vista del visitante, recuperación del borrador tras un fallo y conservación del borrador al cambiar el estilo desde el editor.
- Escritorio 1280 px, móvil 320×640 y selector 640×360: botones accesibles, sin desbordamiento horizontal del contenido. Los filtros del inventario pueden deslizarse horizontalmente.
- Inventario: búsqueda de un ID, filtro de repetidas y segunda página. Mercado: elegir carta ofrecida y solicitada, comprobar el resumen y adaptar el diálogo al móvil.

Las capturas muestran datos de prueba. Estas comprobaciones no validan las políticas remotas, el login real, Storage ni una transacción económica real. La demo temporal y su servidor local se retiraron al terminar.

## SQL separado

Ya aplicaste los comandos anteriores. [ComandosSQL_Perfiles.txt](../ComandosSQL_Perfiles.txt) contiene solo el nuevo trigger propuesto; no reinstala el mercado ni asigna sobres. [La guía](SQL_PERFILES_2026-10-03.md) explica su alcance y cómo sumar sobres manualmente desde Supabase. El parche se revisó estáticamente; su instalación y prueba con dos cuentas quedan pendientes en el servidor.
