# DT Fantasy · 6 de octubre de 2026

## Partido

Dos tiempos de 90 segundos de juego activo. La previa, el descanso, la pizarra, la elección por turnos y las celebraciones detienen el reloj. El marcador sigue mostrando los minutos futbolísticos 0–45–90.

El presupuesto de ocasiones se establece por equipo al empezar, usando GRL efectivo y energía: cinco por lado con nivel parecido, seis contra cuatro con unos diez puntos de ventaja y siete contra tres con una diferencia amplia. Las ocasiones se separan en el tiempo; llegar al máximo permite seguir pasando y conduciendo. No se recorta ni modifica un resultado ya generado.

Se añadieron postes con colisión continua y rebote según la dirección de impacto, saques de meta cortos o largos por el aire, y saques laterales. La altura del balón afecta el control, las intercepciones y el cruce de la portería. La IA ofrece apoyos, paredes, cambios de banda y salidas; evita reciclar hacia el arquero si hay una salida mejor. Se corrigió el robo de balones que ya se alejaban del defensor y el paso del balón más allá de un receptor ya alcanzado. La formación rival respeta los puestos de su plantilla.

## Carrera y Bebida THC

La primera fecha sin jugar comienza al 100% para titulares, banco y rival. El cansancio de fechas posteriores proviene del partido, con recuperación moderada entre jornadas, y afecta el rendimiento. Las noticias ya no aplican penalizaciones aleatorias de hasta 40% de energía.

Cada cuenta recibe dos Bebidas THC una sola vez al consultar el recurso por primera vez. Una bebida restaura todo el plantel del usuario al 100%, en el menú o en la previa/descanso. Si todos están recuperados, se conserva el recurso. El contador no se inventa en el cliente cuando falta el SQL.

El consumo es transaccional, utiliza un UUID persistido para reintentos y protege el saldo en tablas privadas. Un recibo repetido devuelve la plantilla actual, sin recuperar de nuevo el cansancio posterior. La revisión de energía rechaza un guardado atrasado después de consumir. Reiniciar la carrera no repite el regalo. Mientras un uso está sin confirmar, la interfaz bloquea cambios y reanudación hasta recuperarlo. Antes de instalar la migración se mantiene el guardado anterior; no se usa ese fallback ante conflictos o errores de red.

La migración instala RLS y permisos para lectura/borrado propios y guardado mediante RPC. Esto protege el recurso y la revisión; la simulación y los resultados continúan ejecutándose en el navegador. Patrones consultados: [RLS y permisos en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y [bloqueos transaccionales de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).

## Presentación

Descanso, charlas y alineación en crema, oliva y naranja; mensajes agrupados por tono y diseño compacto en móvil. Se mantienen cambios de posiciones por selección, arrastre y teclado. Marcador de una sola barra, eventos abajo y representación del balón aéreo con sombra. Resultado con estadísticas del motor y destacado del equipo; se retiró la posesión inventada y se corrigió la inversión del marcador al jugar como visitante.

El diario usa resultado real, tabla, estado físico y siguiente rival. El menú incorpora regreso al inicio y evita volver a contabilizar un encuentro finalizado al recargar.

## Validación

- 149/149 pruebas del proyecto; lint y compilación aprobados. Se conserva el aviso existente del bundle compartido mayor de 500 kB.
- 11 escenarios de SQL ejecutados en PostgreSQL aislado con [PGlite](https://pglite.dev/docs/): instalación, recuperación inicial única, regalo, saldo, reintentos, recibo antiguo, conflicto de revisión, rechazo sin recursos, plantilla ya fresca, permisos, otra cuenta, anonimato, reinicio y reinstalación. No se modificó Supabase remoto.
- 72 partidos del motor con ambas IA: el resultado más amplio fue 4–0. Con GRL 84 contra 85 se promediaron 3,04 y 3,50 tiros por equipo. Estas muestras verifican el comportamiento; no garantizan el marcador de cada partido.
- Revisión del componente real en navegador con Supabase simulado: descanso, charla por posición, cambio entre centrales, recuperación con doble clic, previa, inicio y descanso real, resultado, diario y móvil de 320 × 640. Se recorrió además un partido completo hasta guardar el resultado, acelerando únicamente las marcas de tiempo de RAF en el archivo temporal de prueba, sin alterar el reloj de producción ni el motor. Se corrigió el recorte del encabezado del resumen bajo la cabecera y se compactó la cabecera del menú. Capturas en `docs/capturas/fantasy-*-2026-10-06.png`.

## Activación en Supabase

Ejecutar el contenido completo de `ComandosSQL_DTFantasy.txt` en SQL Editor y recargar la página. Es idéntico a `supabase/dt_fantasy_bebidas.sql`. La recuperación de carreras antiguas de primera fecha se aplica una sola vez; volver a ejecutar el archivo no regala bebidas ni restaura otra vez la plantilla.

Para repetir la prueba SQL local: `npm install --prefix .qa/fantasy-sql-runtime --no-save --package-lock=false --ignore-scripts @electric-sql/pglite` y `node scripts/test-fantasy-bebidas-sql.mjs`. La ruta del módulo PGlite puede pasarse como primer argumento. No se añadió ninguna dependencia a la aplicación.
