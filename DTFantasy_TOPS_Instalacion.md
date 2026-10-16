# DT Fantasy: TOPS y rayos

Pega **todo `ComandosSQL_DTFantasyTOPS.txt`** en el SQL Editor de Supabase y ejecuta una vez. Incluye las dependencias de Bebidas THC y las políticas. Se puede volver a ejecutar. No ejecutes el esquema de contexto del chat.

No borra perfiles ni carreras, no toca monedas ni roles y conserva la energía existente. Incluye las funciones y políticas de Bebidas, sin repetir su antiguo parche de restauración masiva de energía. El regalo inicial de Bebidas no se repite. Los partidos ya terminados no reciben rayos retroactivos.

Los nuevos resultados se guardan junto con los rayos en una transacción: victoria **+2**, empate **+1**, derrota **−1**. El saldo puede ser negativo. Ningún rol, VIP, administrador ni propietario recibe una regla distinta. Rescindir contrato conserva el saldo; la nueva carrera tiene otra identidad.

El servidor valida la cuenta autenticada, identidad de la carrera, estructura del calendario, jornada actual y marcadores. El calendario no puede sustituirse, los resultados terminados no se pueden reescribir, no se puede retroceder o completar varias fechas de golpe. Un registro único por carrera y jornada evita cobrar otra vez al reintentar o recargar. Los guardados y las Bebidas usan la misma cerradura transaccional por usuario y conservan el control de revisión de energía.

TOPS muestra la clasificación global paginada, con rayos, victorias, empates y derrotas. Los perfiles privados aparecen sin nombre, avatar ni enlace para otros usuarios. Cada persona sí ve su propia identidad. Los enlaces públicos usan UUID, no el apodo.

**Límite actual:** el partido de DT Fantasy se calcula en el navegador. Las validaciones del servidor impiden doble cobro y alteraciones del historial, pero un navegador modificado todavía puede inventar un marcador nuevo para la fecha pendiente. Para una competición resistente a trampas haría falta trasladar el motor y las decisiones al servidor. No se presenta este ranking como una certificación antitrampas.

Comprobaciones locales reproducibles:

```powershell
node scripts/build-dt-tops-sql.mjs --check
node --test tests/fantasy-tops.test.mjs
node scripts/test-dt-tops-sql.mjs RUTA_A_PGLITE/dist/index.js
```

Las pruebas SQL usan PostgreSQL aislado localmente. No conectan al proyecto Supabase ni modifican datos remotos. La prueba de serialización valida las cerraduras y los reintentos en una conexión; no sustituye una prueba de carga concurrente de producción.
