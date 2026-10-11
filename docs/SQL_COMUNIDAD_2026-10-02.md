# Supabase: mejoras de Foro y Muro con RLS activo

Estos comandos están preparados para el esquema compartido el 2 de octubre de 2026. No se han ejecutado en tu Supabase. El SQL de tablas no incluye tus políticas, grants, índices ni triggers actuales; la auditoría permite comprobarlos antes de añadir nada. El rediseño de la página funciona con las consultas existentes.

## Orden en el SQL Editor

1. Abre una consulta nueva y ejecuta [community_design_audit.sql](../supabase/community_design_audit.sql). Solo hace `SELECT`: muestra RLS, políticas, permisos de tablas y columnas, triggers, índices, votos duplicados, la FK de votos y el bucket `muro_media`.
2. Revisa si ya tienes índices equivalentes con otros nombres. Si es así, puedes omitir sus correspondientes `CREATE INDEX` del siguiente archivo; `IF NOT EXISTS` comprueba el nombre, no toda la definición.
3. Ejecuta completo [community_design_support.sql](../supabase/community_design_support.sql). Trabaja en una transacción y exige RLS activo en las siete tablas de comunidad. No modifica políticas, grants, perfiles, publicaciones, puntuaciones ni archivos de Storage. Si falta una tabla, RLS está desactivado, hay votos duplicados o la definición del índice único conocido es incompatible, aborta sin aplicar cambios.
4. Si al borrar una publicación del Muro con votos aparece un error de clave foránea, ejecuta la corrección opcional [muro_vote_delete_cascade.sql](../supabase/muro_vote_delete_cascade.sql), descrita más abajo.
5. Si necesitas reforzar la propiedad de los votos, revisa la sección de RLS opcional y ejecuta completo [community_vote_owner_guard.sql](../supabase/community_vote_owner_guard.sql). Es independiente de los índices y de la FK; no lo apliques si tus moderadores autenticados deben editar votos ajenos directamente.
6. Prueba el Foro y el Muro con dos cuentas reales: publicar, responder, votar, cambiar de voto, retirar voto y borrar una publicación propia. Desde la otra cuenta, editar o borrar contenido ajeno y modificar votos ajenos debe estar denegado. Ejecutar una consulta como administrador del SQL Editor no verifica los permisos del navegador.

Si una transacción informa un error, no borres datos para forzarla. Ejecuta `ROLLBACK;` en la sesión de esa consulta si sigue abierta y revisa la causa. Los límites de espera son 5 segundos para obtener locks y 90 segundos por sentencia. Crear índices normales permite lecturas, pero puede bloquear escrituras durante su construcción; usa un momento de poca actividad. Las tablas grandes pueden necesitar una migración con índices concurrentes, que requiere otro procedimiento fuera de esta transacción. [Referencia de PostgreSQL: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html).

## Consulta corta para copiar primero

Esto comprueba RLS y muestra las políticas actuales sin alterarlas. La auditoría completa del primer paso añade grants, triggers, índices y Storage.

```sql
select c.relname as tabla, c.relrowsecurity as rls_activo
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'perfiles', 'foro_publicaciones', 'foro_comentarios',
    'votos_publicaciones', 'votos_comentarios',
    'muro_publicaciones', 'muro_votos'
  )
  and c.relkind in ('r', 'p')
order by c.relname;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'perfiles', 'foro_publicaciones', 'foro_comentarios',
    'votos_publicaciones', 'votos_comentarios',
    'muro_publicaciones', 'muro_votos'
  )
order by tablename, policyname;
```

RLS y los privilegios de la tabla se complementan: que aparezca `rls_activo = true` no demuestra que las políticas de escritura sean correctas. Para cambiar un voto, el cliente también necesita poder leer ese registro. [Guía oficial de Supabase sobre RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Índices que añade el archivo principal

| Índice | Consulta que acompaña |
| --- | --- |
| `thc_foro_feed_v2` | Publicaciones por estado, fecha e ID; admite desempatar páginas con fechas iguales. |
| `thc_foro_popular` | Destacados por estado, puntuación, fecha e ID. |
| `thc_foro_comments_active` | Comentarios de una publicación por estado y fecha. |
| `thc_foro_author` | Publicaciones por autor y comprobaciones de propiedad. |
| `thc_foro_comments_author` | Comentarios por autor y comprobaciones de propiedad. |
| `thc_foro_votes_user` | Votos de publicaciones de la cuenta actual. |
| `thc_foro_comment_votes_user` | Votos de comentarios de la cuenta actual. |
| `thc_muro_feed` | Momentos por fecha e ID. |
| `thc_muro_author` | Momentos por autor y comprobaciones de propiedad. |
| `thc_muro_votes_user` | Votos del Muro de la cuenta actual. |

No se duplican las claves primarias de los votos del Foro: ya empiezan por publicación o comentario; los índices nuevos empiezan por usuario. Se conservan `thc_foro_feed` y `thc_foro_comentarios_post` si se aplicaron las propuestas anteriores. El planificador decidirá qué índice usar según consulta y datos; no se ha medido tu base remota.

El Muro necesita además una combinación única `(publicacion_id, usuario_id)`. El script reutiliza `thc_muro_vote_unique` de la propuesta anterior o detecta un índice único válido equivalente, incluso con otro nombre u orden de esas dos columnas. Si no existe, lo crea. Exige que ambas columnas conserven `NOT NULL`. La base pasa a rechazar un segundo voto para la misma cuenta y publicación, también si se envía desde dos pestañas a la vez.

Si la auditoría devuelve votos duplicados, se conserva todo y la migración aborta. Hay que decidir qué voto representa la intención de esa cuenta antes de corregirlo; no se ejecuta una limpieza automática ni se recalculan puntuaciones. Tampoco se sustituyen los triggers actuales del Foro: deben seguir actualizando `puntuacion` al insertar, cambiar o borrar votos. La propuesta antigua [forum_profile_hardening.sql](../supabase/forum_profile_hardening.sql) contiene un cambio completo de permisos y triggers; no la mezcles automáticamente con este paquete.

## Corrección opcional: borrar un momento que ya tiene votos

El esquema entregado utiliza una FK con la acción de borrado por defecto. Esto puede impedir borrar una publicación que tenga votos. [muro_vote_delete_cascade.sql](../supabase/muro_vote_delete_cascade.sql) cambia solamente esa relación a `ON DELETE CASCADE`: cuando una eliminación de la publicación está autorizada por sus permisos y RLS, sus votos se eliminan en la misma operación. La app sigue enviando una sola petición de borrado de publicación. [PostgreSQL: claves foráneas y acciones de borrado](https://www.postgresql.org/docs/current/ddl-constraints.html).

El archivo verifica la relación exacta `muro_votos.publicacion_id → muro_publicaciones.id`, exige RLS activo y tablas normales, y no cambia nada si ya está en cascada. Conserva el nombre, la acción `ON UPDATE`, el tipo `MATCH`, los atributos `DEFERRABLE` y el comentario de la FK. Si hay varias FK sobre esa columna, una relación distinta, una FK sin validar o atributos especiales, aborta para revisión manual. No borra ninguna fila durante la migración.

Después de aplicarlo, eliminar un momento elimina permanentemente también sus votos; otros momentos se conservan. Este script no vuelve correcta una política `DELETE` demasiado amplia: confirma en la auditoría que una cuenta solo puede eliminar sus propias publicaciones, salvo los roles de moderación que hayas autorizado. Tampoco añade borrado automático de la imagen en Storage; esa es una operación distinta.

## Opción de RLS: impedir escrituras de votos ajenos

El archivo [community_vote_owner_guard.sql](../supabase/community_vote_owner_guard.sql) es opcional y está listo para copiar completo al SQL Editor. Úsalo después de revisar tus políticas si quieres añadir una barrera explícita de propiedad a los votos. No concede permisos nuevos y no cambia `SELECT`, necesario para los contadores del Muro. Añade condiciones restrictivas a `INSERT`, `UPDATE` y `DELETE`: el usuario del voto debe ser la cuenta autenticada. Una política permisiva existente sigue siendo necesaria para que la operación esté permitida. [PostgreSQL: combinación de políticas permisivas y restrictivas](https://www.postgresql.org/docs/current/sql-createpolicy.html).

No uses este archivo si tus moderadores autenticados deben modificar directamente votos de otras cuentas; esas operaciones deberán tener un procedimiento autorizado en el servidor. Es compatible con los votos que envía este frontend, que usa siempre `session.user.id`. Si alguno de los nombres ya existe, aborta sin sustituirlo: revisa su definición antes de repetir la ejecución. La transacción crea nueve políticas: tres operaciones en cada una de `votos_publicaciones`, `votos_comentarios` y `muro_votos`.

Esta barrera solo protege la propiedad de los votos. Los permisos de `puntuacion`, roles, sobres, monedas, cartas y los procedimientos del servidor requieren su revisión específica. Para UT/Fantasy se mantiene la guía existente [UT_FANTASY_SECURITY.md](../supabase/UT_FANTASY_SECURITY.md); aplicar índices de comunidad no cambia esa configuración.

## Validación disponible

Se revisaron nombres de tablas y columnas contra el esquema compartido, las consultas del frontend y las propuestas SQL existentes. Los archivos se prepararon sin comentarios de código y sin cambiar credenciales, RLS ni datos remotos. No hay una instancia local de PostgreSQL disponible, por lo que estas migraciones no tienen una ejecución de prueba en este entorno. Las pruebas de JavaScript de la aplicación no sustituyen esa validación de base de datos.
