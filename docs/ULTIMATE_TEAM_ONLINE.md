# Online UT

Esta versión empareja dos usuarios reales y reproduce el mismo partido simulado para ambos. El servidor crea el relato, los goles y la fatiga; el navegador presenta la simulación. No es todavía una sala de control manual en tiempo real.

## Activación

En Supabase SQL Editor ejecuta completo `ComandosSQL_ActualizacionUT.txt` cuando esté disponible: incluye la base de cartas, sus diseños, las políticas del club y la playlist, y Online UT en el orden correcto. Para una instalación que ya tiene esa base actualizada, `ComandosSQL_OnlineUT.txt` contiene solo este módulo.

No necesita Edge Functions, un servidor adicional ni habilitar Realtime. Usa la sesión de Discord existente y las funciones RPC de Supabase. No ejecuta SQL remoto desde el proyecto.

## Reglas

- El GRL proviene de las once cartas guardadas, verificadas contra el catálogo del servidor o los 23 jugadores iniciales. Se rechazan huecos, copias repetidas y cartas ajenas. Cualquier jugador puede ocupar cualquier puesto manualmente, con penalización al GRL; su posición y estadísticas originales permanecen intactas.
- La diferencia máxima es siempre tres puntos de GRL efectivo, después de aplicar las penalizaciones de posición. Esperar más tiempo no amplía el rango ni genera un rival ficticio.
- Una sesión por usuario permite abrir dos pestañas sin duplicar la búsqueda ni el partido. Cada UUID de búsqueda queda registrado, por lo que reintentar una búsqueda cancelada no la revive. Cancelar envía también el UUID pendiente: si la petición de búsqueda aún está llegando al servidor, no podrá crear una cola después de la cancelación.
- `Jugadores activos` cuenta usuarios únicos esperando o jugando con presencia recibida en los últimos 30 segundos. Las visitas al menú no entran en ese contador.
- Ambos clientes reciben el mismo ID, equipos y reloj del servidor. Hay cuatro segundos de preparación y después 180 segundos de partido.
- Se generan siete ocasiones por equipo. El GRL y la stamina influyen en la conversión; los marcadores suelen tener pocos goles y nunca superan seis por equipo.
- La respuesta RPC incluye solo eventos y goles que ya ocurrieron. Los eventos futuros y el resultado final no tienen permisos de lectura directa en la API.
- Al finalizar, el resultado queda guardado una vez. Cada titular pierde entre 18 y 26 puntos de energía, con mínimo de 40; recupera 12 puntos por hora hasta 100. Un jugador sin registro de fatiga comienza al 100%.
- La práctica usa el snapshot actual cuando está disponible y no guarda un resultado ni consume stamina del servidor.
- Cambiar la plantilla mientras se busca un rival o se disputa el encuentro se bloquea en el servidor. Cancela primero la búsqueda.

La posición principal o una secundaria declarada en el catálogo no penalizan. Un extremo en el mediocampo de su misma banda pierde dos puntos; cambios dentro de defensa, mediocampo o delantera pierden tres, y cambiar de lado pierde seis. Defensa frente a ataque pierde 18; defensa frente a mediocampo, 10; mediocampo frente a ataque, nueve; mediocampo frente a banda, seis; y banda frente a delantero, cinco. Cualquier arquero en un puesto de campo, o un jugador de campo en el arco, pierde 40 puntos. El mínimo es cero y el máximo 99. El emparejamiento calcula la media de los once GRL efectivos en el servidor.

La presencia y la finalización se mantienen al llamar a los RPC; no hay tarea programada. Un partido desconectado conserva sus tiempos y se finaliza cuando alguien vuelve a consultar Online UT. La fatiga se fecha al final real del partido para que la recuperación transcurrida siga siendo correcta.

## Contrato del cliente

`onlineUT.js` exporta `getOnlineStatus(client)`, `heartbeatOnlineQueue(client)`, `joinOnlineQueue(client, requestUUID)` y `cancelOnlineQueue(client, requestUUID = null)`. El argumento `client` es la instancia habitual de Supabase. La UI consulta aproximadamente cada cinco segundos y usa el mismo UUID al reintentar. Al salir de una búsqueda, pasa el UUID incluso cuando no se ha confirmado una respuesta.

Todos devuelven:

```js
{
  server_now,
  online_count,
  status: 'idle' | 'waiting' | 'playing' | 'finished',
  queue_grl,
  team: null | { id, nombre, abreviatura, logo_url, grl, stamina, titulares, formacion },
  match: null | {
    id, home, away, started_at, ends_at,
    duration_seconds: 180,
    events: [{ second, side, type, minute, player, shooter }],
    home_goals, away_goals
  }
}
```

`home_goals` y `away_goals` son los goles visibles hasta `server_now`. El resultado queda confirmado cuando `status` vale `finished`. El último partido terminado sigue disponible para recuperar una pantalla tras una recarga; una nueva búsqueda usa un UUID nuevo. La UI puede recordar que ya cerró ese resumen sin alterar el resultado.

Los tipos de evento son `kickoff`, `pass`, `goal`, `save`, `post`, `shot`, `halftime` y `fulltime`. En una atajada, `player` identifica al arquero y `shooter` al atacante. `side` conserva el equipo que efectuó el ataque.

## Seguridad y comprobación

Las tablas tienen RLS: lectura propia de sesiones/energía y lectura de metadatos de partidos solo para sus participantes. Las escrituras quedan reservadas a funciones del servidor. Las RPC validan la identidad con `auth.uid()`, fijan `search_path` y reciben únicamente el UUID de la búsqueda; no aceptan GRL, stamina, goles ni resultados enviados por el usuario. Se usa un bloqueo transaccional para crear parejas sin carreras entre pestañas o peticiones. Cada titular del snapshot incluye `base_grl`, `grl` efectivo, `puesto` y `penalizacion_grl`.

`thc_ut_reset()` conserva la eliminación actual de Ajustes: borra `club_ut`, `plantillas_ut`, `PlaylistUT`, `equipos_ut` y `perfiles_ut` del usuario que inició sesión. Cancela su cola y bloquea el borrado durante un partido online activo. Conserva el registro de la bonificación inicial para impedir recibirla otra vez, y no borra el catálogo, las cartas adquiridas, los sobres, la energía ni el historial de partidas del módulo nuevo.

`plantillas_ut.version_posiciones` comienza en cero para las filas antiguas y el trigger del servidor lo cambia a uno al guardar. Permite reconocer el orden inicial antiguo sin deshacer una distribución que el usuario haya guardado deliberadamente. La instalación no reordena plantillas existentes.

Diseño basado en la documentación oficial de [funciones de Supabase](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [bloqueos de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).

Prueba local: `node scripts/test-ut-online-sql.mjs RUTA_AL_RUNTIME_PGLITE`. El script aplica la base y el módulo a PostgreSQL aislado y comprueba permisos, filtros, sesiones, reintentos, posiciones, fatiga, resultados y reejecución. PGlite usa una sola conexión; verifica las invariantes de repetición, pero una prueba de carga con varias conexiones Postgres queda para el despliegue. No modifica la base de producción.
