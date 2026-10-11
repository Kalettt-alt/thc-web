# Actualización UT y vista pública · 10 de octubre de 2026

La publicación muestra «Pronto… En desarrollo» al entrar a Álbum y al elegir Jugar dentro de Ultimate Team. Ambos tienen Regresar. El Álbum completo se conserva en `src/pages/Album/AlbumExperiencia.jsx`; la simulación se conserva en `PlayUT.jsx`, `MatchSimulationUT.jsx` y `simulationUT.js` para retomarla después. No se inició un despliegue ni se ejecutó SQL remoto.

## Menú, My Team e intro

- El menú destaca My Team, Jugar y Camino THC. Mercado y Camino THC permanecen vacíos.
- My Team usa naranja y fondos cálidos, con un panel reducido y el escudo/nombre del club.
- Los cambios manuales de posición están permitidos. Se muestra el GRL efectivo: ED a MD pierde 2; portero a campo o jugador de campo al arco pierde 40. El GRL y las estadísticas originales no se alteran.
- Autoalinear compara el rendimiento efectivo e incluye la banca. La firma antigua de los titulares `p1…p11` se corrige una vez; `version_posiciones` conserva las posiciones manuales guardadas.
- La intro conserva el video, añade una marca más clara y reduce la transición posterior. El botón Saltar intro sigue disponible.

## SQL pendiente

Como no se ejecutaron las actualizaciones posteriores al esquema compartido, usar `ComandosSQL_ActualizacionUT.txt` completo. Incluye club/saldos, base de cartas y sobres, los cinco diseños, Playlist y Online, en una sola transacción con RLS. No reinicia saldos ni reparte sobres. `ComandosSQL_OnlineUT.txt` es únicamente el módulo Online y requiere tener instalada la base anterior.

El online simulado permanece preparado: diferencia máxima de 3 GRL efectivos, resultado y stamina calculados en el servidor, 180 segundos, búsquedas con UUID, caducidad y cancelación que bloquea solicitudes tardías. La ruta pública Jugar permanece en Pronto por petición del usuario. La guía está en `docs/ULTIMATE_TEAM_ONLINE.md`.

## Verificación

- Build y lint aprobados.
- Suite general de 210 casos: 209 pasaron dentro del aislamiento; la prueba de localhost bloqueada por EACCES pasó al repetirla fuera del aislamiento. Los cambios posteriores del cliente Online también pasaron sus pruebas dirigidas.
- SQL local: 21 escenarios Online, 13 del archivo combinado y 5 de permisos del club. El combinado fue ejecutado dos veces y comprobó rollback atómico. Coincidencia de los 225 pares de posición entre JavaScript y SQL.
- Navegador con datos de prueba: reparación inicial, portero colocado de extremo con GRL 32/base 72, guardado y recarga sin deshacerlo, Autoalinear y GRL 72, My Team móvil de 360 px, búsqueda/cancelación, pantallas Pronto y regreso.
- No se completó la prueba visual continua de 180 segundos: el usuario pidió conservar el código y publicar el acceso Jugar con Pronto. No se realizó una prueba de carga con varias conexiones Postgres ni un partido entre cuentas reales del proyecto remoto.

Capturas: `docs/capturas/ut-my-team-naranja-movil-2026-10-10.png`, `ut-jugar-pronto-2026-10-10.png` y `album-pronto-movil-2026-10-10.png`.
