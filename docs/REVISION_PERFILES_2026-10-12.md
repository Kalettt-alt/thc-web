# Renovación de perfiles · 12 de octubre de 2026

Editorial tiene un banner visible como portada, con el encuadre del usuario. Terminal usa una composición de consola con barra de ventana, comandos y tipografía monoespaciada. El selector separa estilos por rango, admite vista previa y conserva el diseño al editar los datos del perfil.

VIP desde nivel 10: Original, Agua, Pixel Art, Club, Editorial, Aurora y Terminal. VIP Trueno desde nivel 15 añade Vinilo, Eclipse y los cinco estilos nuevos Prisma, Órbita, Circuito, Lienzo y Cromo. Estadio deja de aparecer. Aurora se mantiene en VIP porque figura en ambos grupos del pedido. El visitante ve el estilo autorizado por el rango del dueño; no depende del rango del visitante.

Aurora, Vinilo, Eclipse y los cinco nuevos tienen efectos propios de luz, disco, sombra, refracción, órbita, pulsos, tinta y reflejos. Todos respetan las preferencias de movimiento de THC y del sistema. El permiso se vuelve a comprobar en la base antes de guardar.

Amigos muestra el estado persistido al entrar: añadir, solicitud enviada/cancelar, recibida/aceptar/rechazar, amigos/eliminar. La lista de amistades aceptadas aparece en perfiles propios y ajenos visibles. Las solicitudes pendientes se consultan en el perfil propio. Las notificaciones usan la misma operación del servidor, y los enlaces nuevos de amigos y comentarios usan UUID. Se conserva la ruta antigua por nombre y `/perfil` para la cuenta propia.

## Activación

Ejecutar `C:/THC/ComandosSQL_PerfilesAmigos.txt` completo en el SQL Editor de Supabase y publicar el frontend actualizado. El archivo integra guardia v3 de estilos y RPC de amistades con RLS en una transacción. Conserva nombres de Discord, apodos, IDs, roles, saldos e inventarios; retira Estadio a Original y archiva amistades duplicadas sin borrar sus referencias. Guía: `docs/PERFILES_AMIGOS_2026-10-12.md`.

No se ejecutó SQL remoto ni se publicó la página durante esta revisión.

## Verificación

- `npm test`: 223 pruebas aprobadas.
- ESLint completo aprobado y compilación normal `npm run build` aprobada. Sigue el aviso existente sobre el tamaño del bundle compartido.
- 33 escenarios PostgreSQL locales con PGlite: 14 de permisos de apariencia y 19 de amistades, privacidad, reintentos, duplicados, notificaciones y RLS. PGlite usa una conexión; no se hicieron pruebas remotas de carga concurrente.
- Navegador con datos locales de prueba: Editorial, Terminal, guardado de Prisma, separación nivel 0/10/15, dueño/visitante, envío persistente al revisitar, cancelación, recepción y aceptación, lista pública y edición con Aurora.
- Los 14 estilos se revisaron a 360 px sin desbordamiento horizontal; también selector y modal de amigos. El navegador tenía movimiento reducido activo: se confirmó que todas las animaciones se desactivaban; las animaciones con movimiento habilitado se revisaron en sus reglas CSS.

Capturas locales:

- `docs/capturas/perfil-editorial-2026-10-12.png`
- `docs/capturas/perfil-terminal-2026-10-12.png`
- `docs/capturas/perfil-amigos-movil-2026-10-12.png`
- `docs/capturas/perfil-selector-movil-2026-10-12.png`
