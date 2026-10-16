# Online UT · versión 4

Online empareja dos clubes reales y entrega a ambos el mismo partido simulado. Supabase calcula ocasiones, goles, energía y cambios; el navegador presenta la cancha horizontal. La práctica utiliza el mismo tipo de simulación en el dispositivo y permite elegir libremente el rival, sin guardar resultados ni consumir energía del servidor.

## Activación en Supabase

La instalación recomendada es ejecutar **todo `ComandosSQL_ActualizacionUT.txt`** en SQL Editor. Reúne club, cartas, diseños, playlist, Online v4, afinidad de posiciones y el sobre inicial en una sola transacción. El módulo del sobre va al final para conservar la validación de las cartas que recibió cada usuario. No hace falta ejecutar también sus archivos individuales.

Si la base ya tiene Online v3 y el resto de UT actualizado, **`ComandosSQL_UTPartidosVivos.txt`** contiene únicamente el paso a v4; su fuente es `supabase/ut_live_match_v4.sql`. No modifica los sobres, cuentas, saldos ni plantillas permanentes.

`ComandosSQL_OnlineUT.txt` contiene la instalación completa del módulo Online. Si se instala por separado, después deben aplicarse `ComandosSQL_UTAfinidadPosiciones.txt` y `ComandosSQL_SobreInicialUT.txt`, que completan la afinidad y la validación de los recibos iniciales. Los archivos antiguos `ComandosSQL_UTSimulacion.txt` y `ComandosSQL_UTPartidos2Min.txt` corresponden a v2 y v3: para una instalación actual utiliza el TXT completo o el parche v4 correspondiente.

El servicio usa Auth y RPC de Supabase. No requiere Realtime, Edge Functions ni otro servidor para este modelo de simulación. Los archivos SQL se entregan para ejecutar manualmente; el frontend no instala el esquema.

## Emparejamiento y propiedad de las cartas

- El servidor obtiene el GRL efectivo de las once cartas guardadas. Comprueba que cada copia pertenece al usuario y rechaza huecos, repeticiones y cartas inventadas.
- La diferencia máxima es **3 GRL**, incluso después de una espera larga. El sistema no amplía el rango ni crea un rival ficticio.
- El catálogo inicial contiene 67 jugadores, pero cada cuenta recibe **23 distintos y equilibrados** una sola vez. Se sortean globalmente sus calidades con pesos base Bronce 55%, Plata 34,5%, Oro 10% y Plus 0,5%; después se asignan jugadores sin duplicados y cubriendo puestos. Solo se renormalizan calidades agotadas. La selección ocurre en el servidor.
- El recibo conserva las cartas y sus estadísticas, incluso tras reiniciar el club. Las cuentas existentes mantienen su entrega original. El frontend no sustituye una carta por otra de distinta calidad para cubrir una posición.
- Existe una sesión por usuario. Un UUID identifica cada búsqueda y queda registrado; reintentar uno cancelado no reactiva la cola. Cancelar incluye el UUID aunque la respuesta inicial no haya llegado.
- El contador del lobby cuenta usuarios únicos buscando o jugando con presencia recibida en los últimos 30 segundos. Las visitas al menú no cuentan. Si falla la consulta, se muestra un valor desconocido.

Puede colocarse cualquier carta en cualquier puesto manualmente. El servidor aplica la misma penalización que la plantilla, sin cambiar las estadísticas originales ni aplicar la penalización dos veces. Posición principal/secundaria: 0; ED↔MD y EI↔MI: 2; MD/MI↔MC: 3. Portero en campo o jugador de campo en el arco: 40. Las demás afinidades están definidas en `squadUT.js` y `ut_position_affinity_v3.sql`; el GRL efectivo nunca baja de cero. El emparejamiento utiliza la media de ese once efectivo.

## Reloj y desarrollo del partido

Hay cuatro segundos de preparación antes del saque inicial. La duración nominal es **60 segundos por mitad**. V4 añade entre cuatro y ocho segundos a cada mitad para terminar la acción: cada tiempo dura 64–68 segundos activos. El descanso fijo dura 12 segundos y congela pelota, minuto y energía. En total son 128–136 segundos activos y 140–148 segundos de reloj desde el saque inicial.

El catálogo contiene **20 jugadas** con rutas diferentes: paredes, pases entre líneas, cambios de orientación, desbordes, centros, contraataques, incorporaciones de laterales, tres variantes de córner, tiro libre, presión alta, salida de presión, conducción y segunda jugada. Cada partido genera siete ocasiones por equipo, con catorce jugadas distintas elegidas de ese catálogo. GRL, energía, atributos y mentalidad influyen en la resolución; el marcador tiene un máximo de seis goles por equipo.

La última ocasión de cada mitad se resuelve cuatro segundos antes del silbato. Tres segundos después se registra una atajada controlada, balón fuera, saque desde el medio o despeje seguro; el silbato llega un segundo después. La presentación muestra el añadido y no corta el último remate al marcar 45′ o 90′.

El resultado no se envía al navegador por adelantado. El servidor genera solo las ocasiones transcurridas. Aplicar un cambio primero completa el pasado hasta el reloj actual y luego modifica el equipo: conserva las jugadas y goles anteriores. Los dos participantes reciben los mismos eventos y marcador visibles.

La arenga es un efecto local: lanza confeti con los dos colores del club, con espera de 15 segundos entre usos. No altera GRL, energía ni resultado.

## Dirección y energía

Durante el juego, el añadido y el descanso pueden cambiarse el once, la formación y la mentalidad. Se admite 4-3-3, 4-4-2 o 4-2-3-1 y mentalidad defensiva, neutral u ofensiva. Hay hasta siete suplentes capturados al emparejar y un máximo de cinco sustituciones. Una carta sustituida no puede reingresar. La plantilla permanente se bloquea mientras busca rival o disputa un partido; los cambios del encuentro usan un once independiente.

Cada comando táctico incluye IDs, revisión y un UUID de operación. El servidor rechaza revisiones viejas, cartas ajenas, repeticiones, reingresos y cambios posteriores al final. Si una respuesta es incierta, se reintenta con el mismo UUID, que no vuelve a consumir sustituciones.

El coste base es de 18–26 puntos de energía por 120 segundos activos, según el GRL. El añadido consume su parte proporcional y el descanso no consume. Los cambios reparten el gasto según los segundos realmente jugados; la banca no utilizada permanece intacta. La energía tiene un suelo habitual de 40 y recupera 12 puntos por hora hasta 100. Una carta sin registro comienza al 100%.

La finalización se ejecuta al consultar los RPC, sin tarea programada. Una desconexión no pausa el reloj. Si nadie consulta al terminar, la siguiente consulta finaliza el partido y guarda la energía una sola vez, fechada al final real para respetar su recuperación posterior.

## Compatibilidad con encuentros anteriores

Reinstalar el TXT o el parche v4 conserva los partidos ya creados, sus eventos, snapshots y tiempos. Solo los nuevos pasan a v4.

| Versión | Tiempo activo | Descanso | Reloj desde el saque |
| --- | --- | --- | --- |
| v1 | 180 s | 0 s | 180 s |
| v2 | 180 s | 12 s | 192 s |
| v3 | 120 s | 12 s | 132 s |
| v4 | 128–136 s | 12 s | 140–148 s |

V1 conserva su simulación original sin coaching. V2 y v3 mantienen el coaching y la fatiga proporcional de sus propias duraciones. El cliente valida el reloj de cada versión y no interpreta un encuentro anterior como uno nuevo.

## Contrato del cliente

`onlineUT.js` exporta `getOnlineStatus(client)`, `heartbeatOnlineQueue(client)`, `joinOnlineQueue(client, requestUUID)`, `cancelOnlineQueue(client, requestUUID = null)` y `updateOnlineTactics(client, { matchId, revision, requestId, titulares, formacion, mentalidad })`. Durante un partido se consulta aproximadamente cada dos segundos; en espera se utiliza un heartbeat de menor frecuencia. Las peticiones que llegaron tarde se descartan si la operación activa cambió.

Respuesta de un encuentro v4:

```js
{
  server_now,
  online_count,
  status: 'idle' | 'waiting' | 'playing' | 'finished',
  queue_grl,
  team: null | { id, nombre, abreviatura, logo_url, grl, stamina, titulares, formacion, bench, roster },
  match: null | {
    id, home, away, started_at, ends_at,
    simulation_version: 4,
    duration_seconds: 120,             // base nominal
    active_duration_seconds: 128,       // par, entre 128 y 136
    first_half_seconds: 64,             // mitad de active_duration_seconds
    halftime_seconds: 12,
    active_seconds,
    phase: 'pre' | 'first' | 'halftime' | 'second' | 'finished',
    halftime_remaining,
    events: [{ second, side, type, minute, minuteLabel, player, shooter, play_id, pattern }],
    home_goals, away_goals
  }
}
```

`started_at` corresponde al saque inicial y `ends_at` incluye el descanso y añadido. `home_goals` y `away_goals` son los goles visibles hasta el reloj del servidor. Solo `status: 'finished'` confirma el resultado final. El último resumen permanece disponible tras recargar; el navegador puede recordar su ID como cerrado sin modificar el resultado guardado.

Tipos de evento: `kickoff`, `pass`, `goal`, `save`, `post`, `shot`, `tactics`, `settled`, `clearance`, `halftime` y `fulltime`. Una atajada conserva al arquero en `player` y al atacante en `shooter`; `side` identifica al equipo que atacó. `settled`/`clearance` pueden incluir `safe_end: true` y `resume: 'keeper' | 'middle'`. El añadido se representa con `minuteLabel`, por ejemplo `45+2`.

Los equipos incluyen `mentalidad`, `revision`, `substitutions`, `subbed_off`, once actual, banca y roster. Cada jugador conserva `base_grl`, GRL efectivo, `puesto`, `penalizacion_grl`, energía inicial y segundos jugados.

## Permisos y comprobaciones locales

Las tablas usan RLS y las escrituras del partido/energía pertenecen a funciones del servidor. Las RPC comprueban `auth.uid()`, fijan `search_path` y no aceptan GRL, stamina, marcadores ni resultados enviados por el cliente. El estado interno, la semilla y los eventos almacenados no se exponen mediante lectura REST directa. Los participantes consultan el progreso a través de las RPC. El bloqueo transaccional y los UUID protegen emparejamiento, cancelación y decisiones repetidas.

`thc_ut_reset()` borra el club, plantilla, playlist y wallet propios; cancela su cola y se bloquea durante un partido online activo. Conserva el registro de bonificación, el recibo inicial, las cartas y sobres adquiridos, la energía y el historial. Reinstalar no reordena las plantillas: `version_posiciones` distingue el orden antiguo de una colocación manual guardada.

Comprobaciones reproducibles con un runtime local de PGlite:

```sh
node scripts/test-ut-live-match-v4-sql.mjs RUTA_AL_RUNTIME_PGLITE
node scripts/test-ut-update-pipeline-sql.mjs RUTA_AL_RUNTIME_PGLITE
node --test tests/ut-online-client.test.mjs tests/ut-online-match-validation.test.js tests/ut-match-simulation.test.js tests/ut-match-presentation.test.js
```

La auditoría v4 cubre relojes antiguos y nuevos, reejecución con partidos activos, veinte rutas, catorce ocasiones, eventos visibles iguales para ambos participantes, descanso, cierre de la acción, fatiga, añadido, coaching, cinco cambios, ±3 GRL y permisos. El pipeline prueba también la instalación completa, conservación de datos y entrega de las 23 cartas. Estas pruebas se ejecutaron en PostgreSQL local con una sola conexión; no sustituyen una prueba de carga ni una partida real entre dos navegadores contra el proyecto desplegado.