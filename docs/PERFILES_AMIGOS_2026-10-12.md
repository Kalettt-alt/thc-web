# Perfiles y amigos · 12 de octubre de 2026

Ejecuta **ComandosSQL_PerfilesAmigos.txt completo** en el SQL Editor de Supabase con el rol `postgres`. Es una copia exacta de `supabase/profile_social.sql`, integra apariencia y amistades en una sola transacción y puede repetirse. Publica también el frontend actualizado. No se ejecutó SQL contra el proyecto remoto.

El archivo requiere las tablas existentes `perfiles`, `amigos` y `notificaciones` del esquema compartido. Activa RLS en ellas. Conserva las políticas de perfiles existentes y agrega protecciones restrictivas de lectura/mutación en amigos y notificaciones para que políticas permisivas antiguas no expongan solicitudes. No cambia nombres de Discord, apodos, UUID, roles, inventarios ni saldos. La única actualización de apariencia retira `estadio` y lo convierte en `default`.

## Estilos y niveles

VIP (`nivel_rol >= 10`): Original (`default`), Agua (`twc`), Pixel Art (`pixel`), Club (`club`), Editorial (`editorial`), Aurora (`aurora`) y Terminal (`terminal`). VIP Trueno (`nivel_rol >= 15`) añade Vinilo, Eclipse, Prisma, Órbita, Circuito, Lienzo y Cromo, con IDs `vinilo`, `eclipse`, `prisma`, `orbita`, `circuito`, `lienzo`, `cromo`. Aurora está en ambos grupos porque hereda los estilos del VIP.

El trigger de apariencia reconoce los parches conocidos v1/v2/v3 y actualiza a v3, evitando que una whitelist v2 rechace los estilos nuevos. Usuarios con menos nivel pueden seguir editando los campos normales según sus políticas previas. Las ediciones de biografía o avatar no borran un estilo ya guardado si la cuenta pierde el rango. El propietario puede restaurar Original y el color canónico. El navegador no puede cambiar su UUID ni ascender su `nivel_rol`.

`ComandosSQL_PerfilesVIP.txt`, `ComandosSQL_Perfiles.txt` y `supabase/profile_appearance_guard.sql` contienen solo el guard v3. No hace falta ejecutarlos si ya ejecutaste el archivo completo de PerfilesAmigos. No vuelvas a aplicar copias viejas del guard o de `community_storage_hardening.sql` después del parche, porque reinstalarían políticas/índices antiguos.

Un CHECK personalizado de temas ajeno a estos scripts se conserva y se informa mediante NOTICE; podría bloquear nuevos IDs. Si el parche detecta una función de apariencia o un índice homónimo con una definición ajena, se detiene antes de reemplazarlos. Tras un error de transacción ejecuta `ROLLBACK;`, revisa el mensaje y reintenta el archivo completo.

## Amistades

Una pareja comparte una única solicitud activa aunque ambos pulsen Añadir a la vez. Un envío inverso deja la solicitud recibida pendiente hasta que su destinatario acepte. Las operaciones devuelven el estado confirmado de la base de datos y admiten reintentos; no se calculan desde un estado optimista del botón.

La columna nueva `amigos.thc_archivada` conserva IDs de solicitudes canceladas, rechazadas, amistades retiradas y filas duplicadas antiguas. No se borran esas filas: `notificaciones.enlace_id` sigue apuntando al historial correcto. La migración prioriza una amistad aceptada; en su defecto conserva la solicitud más antigua. El índice único anterior conocido se convierte en un índice parcial de filas activas. Las alertas históricas archivadas/aceptadas se marcan leídas.

Las listas públicas muestran únicamente amistades aceptadas de un perfil visible, filtrando datos de amigos con perfil privado. El dueño puede consultar sus propios amigos y solicitudes recibidas/enviadas; un tercero no obtiene esas solicitudes. La notificación y la nueva solicitud se crean en la misma transacción. Al aceptar/rechazar/cancelar se actualiza la alerta, y una notificación antigua nunca acepta una solicitud nueva de la misma pareja.

| RPC | Parámetros | Resultado |
| --- | --- | --- |
| `thc_perfil_amistad_estado` | `p_perfil_id uuid` | `{estado: none/sent/received/friends/self, solicitud_id: uuid/null}` |
| `thc_perfil_amigos` | `p_perfil_id uuid` | `{amigos: [], recibidas: [], enviadas: []}` |
| `thc_perfil_amistad_accion` | `p_perfil_id uuid`, `p_accion text` | Estado confirmado; acciones `enviar/cancelar/aceptar/rechazar/eliminar` |
| `thc_perfil_amistad_notificacion` | `p_solicitud_id uuid`, `p_accion text` | Estado confirmado; acciones `aceptar/rechazar` |

Entradas de listas: `id` del perfil, `nombre` visible, `discord_nombre`, `apodo`, `avatar_url`, `nivel_rol`; solicitudes incluyen `solicitud_id`. `friends` devuelve el ID de su fila aceptada en `solicitud_id`. Solo los RPC de mutación autenticados escriben amigos; se revocan también grants de columnas antiguos. Las notificaciones normales del foro conservan sus permisos de inserción existentes; el cliente no puede duplicar solicitudes de amistad directamente. Solo puede actualizar `leida` de sus propias alertas.

Los RPC usan `SECURITY DEFINER` para transacciones controladas y validan identidad/destinatario dentro de la función. Todos fijan `search_path = ''` y califican sus tablas por esquema, como recomienda la [documentación de funciones de Supabase](https://supabase.com/docs/guides/database/functions). Las políticas restrictivas se combinan con las existentes conforme a la [documentación de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Validación local

Pasaron 14 escenarios de apariencia y 19 de amistades en PostgreSQL aislado con PGlite. Cubren VIP 10/15, autoascenso bloqueado, conservar ediciones normales, duplicados, envío repetido/inverso, privacidad, aceptar/rechazar/cancelar/eliminar, notificaciones históricas, grants de columnas, restitución accidental de permisos amplios, índice anterior, reejecución y rollback atómico si falla la segunda mitad. El generador verifica que los archivos entregados coincidan con sus fuentes.

Comandos reproducibles, usando una instalación temporal local de `@electric-sql/pglite` como argumento si no está en `.qa/profile-social-runtime`:

```sh
node scripts/build-profile-social-sql.mjs --check
node scripts/test-profile-vip-sql.mjs RUTA_AL_RUNTIME_PGLITE
node scripts/test-profile-social-sql.mjs RUTA_AL_RUNTIME_PGLITE
```

PGlite usa una conexión: valida reglas de base de datos, pero no sustituye una prueba concurrente con múltiples clientes en Supabase. El bloqueo simétrico de pareja y el índice único protegen las operaciones concurrentes. No se inspeccionaron políticas/triggers ajenos del servidor real ni se cambiaron datos remotos.
