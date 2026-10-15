# Perfiles y sobres manuales · 3 de octubre de 2026

Esta guía describe el parche histórico v2. Para la renovación del 12 de octubre usa [PERFILES_AMIGOS_2026-10-12.md](PERFILES_AMIGOS_2026-10-12.md) y ejecuta `ComandosSQL_PerfilesAmigos.txt` completo. Las copias actuales de apariencia se actualizaron a v3; Estadio se retiró y los estilos premium requieren nivel 15.

Ya aplicaste `ComandosSQL.txt`: conserva esa instalación del álbum. No es necesario repetirla para cambiar su diseño. La aplicación mantiene cinco cromos por sobre y consume el saldo existente; este cambio no concede sobres al entrar, registrarse ni cambiar de estilo.

## Nuevo parche de perfiles

`ComandosSQL_PerfilesVIP.txt` contiene el parche v2 de protección de apariencia. `ComandosSQL_Perfiles.txt` y `supabase/profile_appearance_guard.sql` son copias idénticas. Copia uno de esos archivos completo en el SQL Editor de Supabase y ejecútalo con el rol administrativo `postgres`; después recarga la página. Basta ejecutar una copia.

El campo existente `perfiles.tema_perfil` ya es `text` en tu esquema. No hacen falta columnas nuevas para los diez estilos: Original (`default`), Agua (`twc`), Pixel Art (`pixel`), Club (`club`), Editorial (`editorial`), Aurora (`aurora`), Terminal (`terminal`), Estadio (`estadio`), Vinilo (`vinilo`) y Eclipse (`eclipse`). Los tres últimos tienen animaciones que respetan la preferencia de movimiento reducido. Se mantienen los identificadores anteriores y los visitantes ven el estilo guardado del dueño del perfil.

El parche exige RLS activo y conserva las políticas, permisos de las tablas y demás triggers. Protege el ID y el rol frente a escrituras desde la sesión del navegador. Solo el propietario con `nivel_rol >= 10` puede elegir un tema o color; se validan los diez estilos, los colores hexadecimales y los encuadres. La edición normal del apodo, estado, avatar y su encuadre sigue disponible según las reglas existentes. El administrador puede seguir gestionando roles y sobres desde SQL Editor o `service_role`. El parche no actualiza perfiles existentes ni saldos.

El parche reconoce la función v1 instalada anteriormente y la sustituye por v2: cambia el requisito de nivel 15 a nivel 10 y añade los tres estilos nuevos. También permite volver a ejecutar v2 sin duplicar triggers ni modificar datos. Si la función existente tiene un marcador distinto o el trigger pertenece a otra función, se detiene para no reemplazar código ajeno. Si hay un CHECK que limita los estilos, muestra un aviso y lo conserva: habría que revisar ese CHECK concreto. Los otros triggers siguen ejecutándose y pueden imponer reglas adicionales. No se han inspeccionado las políticas ni los triggers del proyecto remoto.

La consulta al final devuelve el trigger instalado y `security_definer = false`. Si falla el bloque y el editor indica una transacción abortada, ejecuta `ROLLBACK;`, revisa el error y vuelve a ejecutar el archivo completo.

Se ejecutaron doce escenarios locales en PostgreSQL aislado con PGlite mediante `scripts/test-profile-vip-sql.mjs`. Cubren la actualización v1→v2, RLS activo, edición normal con nivel 9, rechazo de personalización y autoascenso sin VIP, protección de otros perfiles, los diez estilos con nivel 10, valores inválidos, lectura por visitantes, registro, administración del servidor, baja de VIP, acceso anónimo y repetición del parche. También pasaron las diez pruebas JavaScript de temas y configuración del perfil. No se ejecutó ningún SQL en tu Supabase remoto.

Si una cuenta pierde VIP, conserva la apariencia que ya tenía guardada, pero no puede elegir un estilo nuevo. El backend permite restaurar el tema `default` con el color canónico `#A855F7`; esta excepción no concede acceso al selector de estilos.

## Entregar sobres manualmente

En Table Editor → `perfiles`, localiza al usuario por `id` y cambia `sobres_disponibles`. Es el saldo total: escribir `3` deja tres sobres. Para sumar tres al saldo actual desde SQL Editor, sustituye `UUID_DEL_USUARIO` por el UUID real y ejecuta:

```sql
update public.perfiles
set sobres_disponibles = coalesce(sobres_disponibles, 0) + 3
where id = 'UUID_DEL_USUARIO'::uuid
returning id, discord_nombre, sobres_disponibles;
```

No incluyas este UPDATE en una migración repetida: cada ejecución suma otros tres sobres. Se hace con el rol administrativo, no desde el cliente. No hace falta dar permisos nuevos a los usuarios ni modificar las funciones de apertura.

Si observas sobres asignados automáticamente en tu proyecto, revisa primero sus triggers y tareas programadas: ese comportamiento no está en el flujo de registro de este código. Esta consulta solo inspecciona los triggers de perfiles y usuarios:

```sql
select t.tgrelid::regclass as tabla, t.tgname,
       pg_catalog.pg_get_triggerdef(t.oid) as definicion
from pg_catalog.pg_trigger t
where t.tgrelid in ('public.perfiles'::regclass, 'auth.users'::regclass)
  and not t.tgisinternal
order by tabla, t.tgname;
```

## Comprobar con dos cuentas

Con una cuenta de nivel 10 o superior: previsualiza, cancela, guarda y abre su perfil desde otra cuenta. El visitante debe ver el estilo guardado y no disponer de los controles de edición. Con una cuenta por debajo de nivel 10: el selector no debe aparecer y guardar un estilo nuevo mediante una petición directa debe quedar bloqueado. Comprueba también editar el estado, abrir un sobre existente y sumar sobres desde SQL Editor para contrastar las reglas anteriores con el nuevo trigger. Si se pierde VIP con el selector abierto, este debe cerrarse y la edición normal del perfil debe seguir disponible.

Referencias: [RLS y permisos en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y [triggers de PostgreSQL](https://www.postgresql.org/docs/current/sql-createtrigger.html). El trigger complementa las políticas de acceso existentes; no las sustituye.
