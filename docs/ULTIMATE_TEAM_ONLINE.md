# Online UT

Esta versión empareja dos usuarios reales y reproduce el mismo partido simulado para ambos. El servidor calcula los goles, la fatiga y las decisiones tácticas; el navegador dibuja el campo horizontal y las jugadas. Ambos pueden cambiar el once, la formación y la mentalidad durante el encuentro.

## Activación

En Supabase SQL Editor ejecuta completo `ComandosSQL_ActualizacionUT.txt` cuando esté disponible: incluye la base de cartas, sus diseños, las políticas del club y la playlist, y Online UT en el orden correcto. Para una instalación que ya tiene esa base actualizada, `ComandosSQL_OnlineUT.txt` contiene solo este módulo.

Si Online v1 ya está instalado, basta ejecutar `ComandosSQL_UTSimulacion.txt` para actualizarlo. Es una migración aditiva: conserva historial y energía. Los partidos v1 que ya están en curso terminan con sus reglas anteriores; los nuevos usan v2.

No necesita Edge Functions, un servidor adicional ni habilitar Realtime. Usa la sesión de Discord existente y las funciones RPC de Supabase. No ejecuta SQL remoto desde el proyecto.

## Reglas

- El GRL proviene de las once cartas guardadas, verificadas contra el catálogo del servidor o los 23 jugadores iniciales. Se rechazan huecos, copias repetidas y cartas ajenas. Cualquier jugador puede ocupar cualquier puesto manualmente, con penalización al GRL; su posición y estadísticas originales permanecen intactas.
- La diferencia máxima es siempre tres puntos de GRL efectivo, después de aplicar las penalizaciones de posición. Esperar más tiempo no amplía el rango ni genera un rival ficticio.
- Una sesión por usuario permite abrir dos pestañas sin duplicar la búsqueda ni el partido. Cada UUID de búsqueda queda registrado, por lo que reintentar una búsqueda cancelada no la revive. Cancelar envía también el UUID pendiente: si la petición de búsqueda aún está llegando al servidor, no podrá crear una cola después de la cancelación.
- `Jugadores activos` cuenta usuarios únicos esperando o jugando con presencia recibida en los últimos 30 segundos. Las visitas al menú no entran en ese contador.
- Ambos clientes reciben el mismo ID, equipos y reloj del servidor. Hay cuatro segundos de preparación, dos tiempos de 90 segundos activos y 12 segundos fijos de entretiempo: 192 segundos de reloj desde el saque inicial. El descanso congela el minuto y la fatiga, y no depende de que ambos pulsen un botón.
- Se generan siete ocasiones por equipo. El GRL y la stamina influyen en la conversión; los marcadores suelen tener pocos goles y nunca superan seis por equipo.
- La simulación v2 genera únicamente las ocasiones que ya transcurrieron. No decide el resultado antes de jugar. Aplicar un cambio táctico primero completa el pasado hasta el reloj actual y después cambia el equipo; no modifica eventos ni goles anteriores. El navegador no puede enviar marcadores.
- Al finalizar, el resultado queda guardado una vez. Un jugador que disputa todo el encuentro pierde entre 18 y 26 puntos de energía, con mínimo habitual de 40; las sustituciones usan el tiempo realmente jugado. La banca no utilizada no consume energía. Recuperan 12 puntos por hora hasta 100. Un jugador sin registro de fatiga comienza al 100%.
- La práctica usa el snapshot actual cuando está disponible y no guarda un resultado ni consume stamina del servidor.
- Cambiar la plantilla permanente mientras se busca un rival o se disputa el encuentro se bloquea en el servidor. Dentro del partido se utiliza un once independiente y hasta siete suplentes verificados al emparejar. Se permiten cinco sustituciones; un jugador que salió no puede reingresar. La formación admite 4-3-3, 4-4-2 y 4-2-3-1; la mentalidad defensiva reduce el riesgo y la producción ofensiva, y la ofensiva aumenta ambos.

La posición principal o una secundaria declarada en el catálogo no penalizan. Un extremo en el mediocampo de su misma banda pierde dos puntos; cambios dentro de defensa, mediocampo o delantera pierden tres, y cambiar de lado pierde seis. Defensa frente a ataque pierde 18; defensa frente a mediocampo, 10; mediocampo frente a ataque, nueve; mediocampo frente a banda, seis; y banda frente a delantero, cinco. Cualquier arquero en un puesto de campo, o un jugador de campo en el arco, pierde 40 puntos. El mínimo es cero y el máximo 99. El emparejamiento calcula la media de los once GRL efectivos en el servidor.

La presencia y la finalización se mantienen al llamar a los RPC; no hay tarea programada. Un partido desconectado conserva sus tiempos y se finaliza cuando alguien vuelve a consultar Online UT. La fatiga se fecha al final real del partido para que la recuperación transcurrida siga siendo correcta.

## Contrato del cliente

`onlineUT.js` exporta `getOnlineStatus(client)`, `heartbeatOnlineQueue(client)`, `joinOnlineQueue(client, requestUUID)`, `cancelOnlineQueue(client, requestUUID = null)` y `updateOnlineTactics(client, { matchId, revision, requestId, titulares, formacion, mentalidad })`. El argumento `client` es la instancia habitual de Supabase. La UI consulta aproximadamente cada dos segundos durante el partido y usa el mismo UUID al reintentar. Al salir de una búsqueda, pasa el UUID incluso cuando no se ha confirmado una respuesta.

`titulares` contiene once IDs de las cartas del propio roster capturado para el encuentro. `revision` es la revisión del equipo propio, inicialmente cero. `requestId` identifica una operación táctica y debe conservarse cuando una respuesta de red es incierta: repetirla devuelve el mismo estado sin volver a consumir cambios. El servidor rechaza cartas ajenas, repeticiones, reingresos, revisiones antiguas y cambios después del final.

Todos devuelven:

```js
{
  server_now,
  online_count,
  status: 'idle' | 'waiting' | 'playing' | 'finished',
  queue_grl,
  team: null | { id, nombre, abreviatura, logo_url, grl, stamina, titulares, formacion, bench, roster },
  match: null | {
    id, home, away, started_at, ends_at,
    duration_seconds: 180,
    simulation_version: 2, halftime_seconds: 12,
    active_seconds, phase: 'pre' | 'first' | 'halftime' | 'second' | 'finished',
    events: [{ second, side, type, minute, player, shooter }],
    home_goals, away_goals
  }
}
```

`home_goals` y `away_goals` son los goles visibles hasta `server_now`. El resultado queda confirmado cuando `status` vale `finished`. El último partido terminado sigue disponible para recuperar una pantalla tras una recarga; una nueva búsqueda usa un UUID nuevo. La UI puede recordar que ya cerró ese resumen sin alterar el resultado.

Los tipos de evento son `kickoff`, `pass`, `goal`, `save`, `post`, `shot`, `halftime` y `fulltime`. En una atajada, `player` identifica al arquero y `shooter` al atacante. `side` conserva el equipo que efectuó el ataque.

El evento `tactics` registra una decisión del director técnico. `home` y `away` contienen el once actual, `bench`, `roster`, `mentalidad`, `revision`, `substitutions` y `subbed_off`. Los jugadores conservan `base_grl` y el GRL efectivo con penalización de puesto, sin aplicarla dos veces.

## Seguridad y comprobación

Las tablas tienen RLS: lectura propia de sesiones/energía y lectura de metadatos de partidos solo para sus participantes. Las escrituras quedan reservadas a funciones del servidor. Las RPC validan la identidad con `auth.uid()`, fijan `search_path` y no aceptan GRL, stamina, goles ni resultados enviados por el usuario. La RPC táctica acepta solamente IDs, revisión y opciones permitidas, y obtiene los valores del roster canonical capturado. Se usa un bloqueo transaccional para crear parejas y aplicar decisiones sin carreras entre pestañas o peticiones. Cada titular del snapshot incluye `base_grl`, `grl` efectivo, `puesto` y `penalizacion_grl`.

`thc_ut_reset()` conserva la eliminación actual de Ajustes: borra `club_ut`, `plantillas_ut`, `PlaylistUT`, `equipos_ut` y `perfiles_ut` del usuario que inició sesión. Cancela su cola y bloquea el borrado durante un partido online activo. Conserva el registro de la bonificación inicial para impedir recibirla otra vez, y no borra el catálogo, las cartas adquiridas, los sobres, la energía ni el historial de partidas del módulo nuevo.

`plantillas_ut.version_posiciones` comienza en cero para las filas antiguas y el trigger del servidor lo cambia a uno al guardar. Permite reconocer el orden inicial antiguo sin deshacer una distribución que el usuario haya guardado deliberadamente. La instalación no reordena plantillas existentes.

Diseño basado en la documentación oficial de [funciones de Supabase](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [bloqueos de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).

Pruebas locales: `node scripts/test-ut-online-sql.mjs RUTA_AL_RUNTIME_PGLITE` y `node scripts/test-ut-simulation-v2-sql.mjs RUTA_AL_RUNTIME_PGLITE`. Comprueban permisos, filtros, sesiones, reintentos, posiciones, coaching, fatiga proporcional, reloj de dos mitades, resultados y compatibilidad con partidos v1. PGlite usa una sola conexión; verifica las invariantes de repetición, pero una prueba de carga con varias conexiones Postgres queda para el despliegue. No modifica la base de producción.
