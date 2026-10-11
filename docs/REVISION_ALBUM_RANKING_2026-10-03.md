# Álbum y Ranking THC · 3 de octubre de 2026

Se renovaron inventario, mercado, sobres y la presentación del ranking con el estilo naranja, crema y negro del Inicio. La ruleta conserva su componente, opciones y comportamiento. DomeGallery y las transiciones generales no se modificaron.

## Inventario y navegación

- Se distinguen cromos distintos, primeras copias, repetidas, pegadas, disponibles y reservadas. La primera copia queda protegida incluso si todavía no se ha pegado.
- Búsqueda por nombre, identificador, categoría y nacionalidad, sin distinguir acentos; filtros combinables de estado y categoría, y orden por nombre, cantidad o disponibilidad.
- Se muestran 24 cromos por página. Cambiar de página lleva al inicio de los resultados y anuncia la nueva página.
- Los accesos al álbum, inventario y mercado permiten cambiar de apartado sin volver siempre a la ruleta. Hay estados vacíos con instrucciones y reintentos de lectura.
- Los registros duplicados se agrupan para presentar los datos sin perder copias. La migración SQL los detecta y se detiene para revisarlos; no modifica saldos duplicados por su cuenta.

## Intercambios

El botón anterior de aceptar no ejecutaba una transferencia. Ahora crear, aceptar y cancelar usan RPC del servidor y un resumen de «Tú entregas / Tú recibes» antes de confirmar. El buscador y los filtros «Puedo aceptar» y «Me faltan» ayudan a encontrar una oferta útil; el selector prioriza las faltantes y permite revisar o cambiar ambas elecciones.

El usuario confirmó que el mercado anterior descontaba la carta al publicar y la devolvía al cancelar. El mercado v2 reserva la copia sin descontarla físicamente de la fila: la resta de las disponibles y la muestra como reservada. Esto permite cancelar o vencer sin inventar devoluciones. Aceptar transfiere los dos cromos en una operación atómica. Hay dos ofertas activas por cuenta y tres días de vigencia.

Las solicitudes de mercado se guardan por cuenta en `sessionStorage` antes de enviarse. Una respuesta de red perdida conserva la solicitud y permite recuperar el mismo resultado. Mientras quede una confirmación pendiente se bloquea una operación nueva. El frontend comprueba la sesión actual, la versión, el identificador y el estado del recibo antes de anunciar éxito.

El mercado consulta hasta 200 ofertas recientes y lo indica si alcanza el límite; presenta 12 por página. La vigencia se actualiza cada 30 segundos y al volver a la ventana. Los diálogos tienen foco contenido, fondo inactivo y controles accesibles en una pantalla horizontal pequeña.

## Sobres y pegado

La apertura queda configurada en SQL con **5 cromos por sobre**, según la confirmación del usuario. Se conserva la distribución personalizada de `album_pesos`; el sorteo y la actualización del saldo ocurren en el servidor.

La solicitud de apertura se guarda por cuenta en `localStorage` antes de enviarse. Tras una desconexión, volver al apartado permite recuperar la misma apertura incluso si el saldo ya llegó a cero. Se valida el recibo antes de limpiar la solicitud. El saldo se vuelve a consultar para evitar que un recibo antiguo o una lectura atrasada sobrescriban el saldo real.

Las cartas nuevas y repetidas vienen identificadas por el servidor, también si aparece dos veces una misma carta en el sobre. Se pueden revelar una a una o todas, abrir otro sobre y pasar al inventario. Los botones de carta admiten teclado, el área completa se desplaza en móvil y las imágenes tienen un fallback acotado. Un fallo de lectura se presenta como saldo no disponible y ofrece reintento, sin afirmar que el usuario tiene cero sobres.

Pegar comprueba el resultado del servidor y conserva las copias repetidas del cromo. Cambiar de cuenta o salir del apartado descarta actualizaciones tardías. Lecturas y operaciones tienen un límite de espera de 20 segundos; una operación que pudo confirmarse en el servidor conserva su identificación para recuperarla.

## Ranking y animaciones

Se renovaron el encabezado, buscador, podio, selectores, tabla y estadísticas avanzadas. Las consultas de Supabase, límite de 50 jugadores, realtime, orden, filtros y fórmulas se conservaron. La tabla se desplaza dentro de su panel en móvil.

Las minianimaciones usan la preferencia común del Inicio. Pausarlas o activar movimiento reducido detiene adornos y confeti sin retirar las transiciones de navegación existentes. En TierList el envío comparte un identificador de aviso, evitando apilar el mismo error con cada intento.

## Supabase y Discord

[ComandosSQL.txt](../ComandosSQL.txt) contiene solo SQL: cuota de TierList, instalación del Álbum v2 y configuración de cinco cartas por sobre. [La guía de instalación](SQL_ALBUM_2026-10-03.md) explica el orden, la auditoría y la compatibilidad. Los contratos del cliente y del SQL usan las mismas cinco RPC v2.

**No se aplicó SQL a la base remota ni se ejecutó en PostgreSQL local.** La migración se detiene ante ofertas antiguas activas, duplicados, triggers desconocidos o funciones expuestas incompatibles. Las ofertas antiguas requieren revisar la función de cancelación y verificar su devolución antes de migrar; no se cancelan ni reembolsan de forma masiva. Las RLS reales se deben verificar con dos cuentas normales después de instalar.

El diagnóstico local encontró que falta `DISCORD_TIERLIST_WEBHOOK`. SQL instala la cuota, pero no configura el webhook privado. El script `scripts/configure-tierlist.ps1` permite introducirlo con entrada oculta en local; Vercel lo necesita como variable privada del servidor. [Guía de Discord](../supabase/functions/compartir-tierlist/README.md). No se envió ninguna imagen a Discord en esta revisión.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 111 pruebas aprobadas; incluye copias, reservas, filtros, recibos, almacenamiento, reintentos y timeout |
| `npm run lint` | Sin errores ni advertencias |
| `npm run build` | Compilación correcta; el bloque compartido mantiene el aviso de tamaño superior a 500 KB |
| Navegador 1280×800 y 320×640 | Inventario, sobres y ranking legibles, sin desbordamiento horizontal de página |
| Mercado 640×360 | Resumen desplazable y botón de confirmación accesible |
| Respuesta perdida de aceptación | La recuperación conserva una sola transferencia |
| Respuesta perdida de apertura y salida/entrada | Recupera el mismo sobre; saldo de 3 a 2, cinco cartas, dos nuevas y tres repetidas en la muestra |
| Crear y cancelar oferta | Reserva una repetida, limita a dos ofertas y libera la reserva al cancelar |
| Fallo de lectura del saldo | Error visible, apertura deshabilitada y reintento que recupera el saldo |
| Ranking | Buscar Lukk conserva ratio, contribuciones, goles por partido y MVP del conjunto de prueba |
| Ruleta | ArrowDown cambia la selección y actualiza el acceso al apartado |
| DomeGallery | Hash SHA-256 sin cambios: `E0A4F20D6B53C9F658BCB2F8F22FD10EFC312799408BB5CCAA6E19BBF385672F` |

Las comprobaciones de navegador usaron componentes reales y datos simulados con Supabase sustituido antes de montarlos. No prueban la autenticación o las políticas del proyecto remoto, ni todos los dispositivos físicos. La demo temporal y su servidor se retiraron al terminar; se conservaron únicamente las capturas.

## Capturas

- [Inventario móvil](capturas/album-inventario-movil-2026-10-03.png).
- [Confirmación de intercambio](capturas/album-intercambio-2026-10-03.png).
- [Sobres de escritorio](capturas/album-sobres-2026-10-03.png) y [móvil](capturas/album-sobres-movil-2026-10-03.png).
- [Ranking de escritorio](capturas/album-ranking-2026-10-03.png), [podio](capturas/album-ranking-podio-2026-10-03.png) y [móvil](capturas/album-ranking-movil-2026-10-03.png).
