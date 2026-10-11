# Propuestas para foro, perfiles, comunidad y archivos

Estos scripts no describen ni prueban la configuración remota actual. No se han ejecutado contra Supabase. Primero revisa los resultados de `audit_security.sql`, incluidos grants por columna, políticas existentes, funciones `SECURITY DEFINER`, triggers y el estado público de los buckets.

Orden de revisión en un proyecto de prueba con respaldo:

1. `forum_profile_hardening.sql`: permisos explícitos de perfiles, propiedad del foro y puntuaciones calculadas por triggers de votos. Detiene la transacción si detecta otros triggers que ya mantienen puntuaciones; hay que revisar esa implementación antes de reemplazarla.
2. `community_storage_hardening.sql`: propiedad de mensajes, solicitudes de amistad, notificaciones respaldadas por una actividad real, publicaciones/votos del muro y archivos con nombres que empiezan por el UUID del propietario seguido de `_` o `/`.
3. Repite la auditoría y prueba dos cuentas distintas: lectura privada, escrituras ajenas, aceptación de solicitudes y envío de imágenes.

Las revocaciones restablecen los privilegios de tabla y columna antes de conceder únicamente las operaciones usadas por la aplicación. PostgreSQL también revoca los privilegios de columna correspondientes al revocar los de la tabla. Ejecuta las propuestas como propietario y revisa otros grantors y roles heredados en la auditoría. Las políticas restrictivas se combinan con las existentes; una política restrictiva antigua puede impedir una operación válida y debe revisarse, sin desactivar RLS. Consulta [REVOKE en PostgreSQL](https://www.postgresql.org/docs/current/sql-revoke.html).

Los índices únicos nuevos requieren que no existan solicitudes duplicadas entre el mismo par de cuentas, votos del muro duplicados o notificaciones duplicadas del mismo evento. Si existen, la transacción se detendrá. Los scripts no eliminan esos datos; hay que decidir cómo conservarlos antes de aplicar los índices.

La validación de notificaciones comprueba votos, comentarios, respuestas, menciones o una solicitud pendiente. Una solicitud usa `enlace_id = amigos.id`. Los mensajes, nombres e imágenes siguen renderizados como texto/URL en React. Estas propuestas no implementan límites de frecuencia ni moderación del contenido.

## Imágenes del chat

Se conserva la propiedad `public` actual de cada bucket para no romper el uso existente de `getPublicUrl`. Si `chat_media` es público, quien conozca la URL puede descargar la imagen: las políticas de lectura no protegen las descargas públicas. Hacerlo privado requiere migrar también el frontend a descargas autenticadas o URLs firmadas; cambiar solo el bucket rompe las imágenes actuales. Consulta [buckets de Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals).

La política propuesta de lectura para un chat privado permite al propietario del archivo y al participante de un mensaje que lo adjunta. El archivo debe pertenecer al emisor del mensaje para que una URL inventada no conceda acceso a archivos de otra cuenta. Los permisos de escritura se limitan al prefijo UUID del usuario, a 5 MiB y a PNG/JPEG/WebP/GIF. El filtro MIME no sustituye una inspección del contenido del archivo en el servidor. Consulta [control de acceso a Storage](https://supabase.com/docs/guides/storage/security/access-control).

## Alcance pendiente de la auditoría remota

El plazo de cambio de apodo y los beneficios de temas VIP siguen dependiendo de la implementación actual; estos scripts no añaden reglas de servidor para ellos.

Estas propuestas no sustituyen una revisión de las RPC antiguas, membresías de roles, políticas de Realtime, comentarios/etiquetas de perfiles, estadísticas y otras tablas del esquema. Tampoco verifican las credenciales/configuración OAuth ni prueban que una vulnerabilidad exista en el proyecto remoto. Para eso hacen falta los resultados de auditoría y pruebas en el proyecto de prueba.

