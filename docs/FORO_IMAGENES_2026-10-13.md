# Imágenes del Foro desde el PC

Publicaciones, comentarios y respuestas permiten seleccionar hasta cuatro imágenes PNG, JPEG, WebP o GIF, de hasta 5 MiB cada una. Se verifica la firma del archivo además de su tipo. El borrador muestra vistas previas, permite quitar imágenes y conserva los archivos ya subidos al reintentar un envío.

Ejecuta **ComandosSQL_ImagenesForo.txt** completo en el SQL Editor de Supabase y publica el frontend actualizado. Es el mismo contenido que `supabase/forum_image_storage.sql`. Requiere las tablas existentes del Foro y sus RLS activos. No reemplaza el esquema ni cambia nombres, roles o datos de perfiles.

El bucket público `foro_media` sirve las imágenes por URL. Subidas y borrados requieren sesión y una ruta propia `<auth.uid()>/foro/<uuid>.<ext>`. Las políticas restrictivas impiden que una política amplia anterior habilite archivos ajenos o sobrescrituras; los demás buckets conservan sus permisos. Los permisos de publicaciones y comentarios mantienen la autoría propia. El SQL puede ejecutarse otra vez.

Cada borrador conserva un UUID. Si una respuesta se pierde después de guardar, el reintento recupera esa fila en lugar de publicar dos veces. Una cancelación borra únicamente archivos del borrador que no se hayan publicado. Si la confirmación de la base es incierta, se conservan los archivos para evitar romper una publicación ya guardada.

Verificación: nueve pruebas unitarias del manejo de imágenes y contrato SQL; 17 comprobaciones PostgreSQL/RLS locales con PGlite, incluyendo instalación repetida, permisos propios, rechazo de archivos ajenos, políticas amplias anteriores y compatibilidad con otros buckets. La revisión del navegador utilizó archivos locales y servicios simulados; no realizó publicaciones ni subidas en producción.

Para repetir los permisos: `node scripts/test-forum-image-storage-sql.mjs RUTA_AL_RUNTIME_PGLITE`.
