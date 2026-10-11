# Cartas y sobres de Ultimate Team

Ejecuta **ComandosSQL_UltimateTeam.txt completo** en el SQL Editor de Supabase y recarga la página. El archivo se puede volver a ejecutar: conserva cartas, sobres abiertos, solicitudes y saldos. No asigna sobres automáticamente. El catálogo empieza con un jugador de ejemplo y un sobre `thc-base`, ambos inactivos.

Las tablas nuevas no reemplazan `JugadoresUT`, `club_ut` ni los saldos existentes. Los 23 jugadores iniciales de la versión anterior siguen disponibles como plantilla base; son distintos de las cartas coleccionables.

## Añadir una carta real

Cambia nombre, posición, estadísticas y datos por los del jugador que quieras registrar. Las estadísticas aceptan números de 0 a 99. **No incluyas `grl`: Supabase lo calcula** según las estadísticas y la posición principal. Las posiciones son `GK`, `CB`, `LB`, `RB`, `LWB`, `RWB`, `CDM`, `CM`, `CAM`, `LM`, `RM`, `LW`, `RW`, `CF` o `ST`.

```sql
insert into public.ut_cartas (
  codigo, nombre, posicion, posiciones_secundarias,
  ritmo, tiro, pase, regate, defensa, fisico,
  rareza, club, nacionalidad, imagen_url, diseno_url, activa, es_ejemplo
) values (
  'jugador-001', 'NOMBRE REAL DEL JUGADOR', 'CM', array['CDM'],
  70, 65, 75, 72, 62, 68,
  'plata', 'CLUB', 'PAÍS', null, null, false, false
)
on conflict (codigo) do nothing;
```

Para porteros, usa `posicion = 'GK'` y rellena `estirada`, `paradas`, `saque`, `reflejos`, `velocidad_por` y `posicionamiento`. Son las estadísticas que determinan su GRL. Después de ejecutar **ComandosSQL_CartasUT.txt**, `rareza` admite `bronce`, `plata`, `oro`, `plus` y `ultimate`; las antiguas `especial` siguen funcionando con el diseño Plus. El acabado visual se decide por separado del GRL. Ningún diseño concede un GRL de 99 automáticamente.

Los diseños locales van en `src/pages/UltimateTeam/cartas/`. Los cinco PNG comunes se seleccionan automáticamente según `rareza`; deja `diseno_url` vacío para usarlos. Para otro diseño, guarda su nombre, por ejemplo `oro-2026.png`, en `diseno_url`. La foto va en `imagen_url`. También puedes usar una URL HTTPS pública o una ruta pública que empiece por `/`; no uses rutas como `C:\THC\...` en Supabase. Las imágenes locales nuevas deben incluirse en el siguiente despliegue. Para la bandera, `nacionalidad` puede ser `PE`, `Perú`, `AR`, `Argentina`, etc.

El plantel inicial del tutorial es ficticio y conserva sus estadísticas originales, con Perú como país de la plantilla. Las cartas reales del catálogo conservan el país que indiques; no se inventan sus retratos.

## Preparar un sobre

Cuando hayas revisado la carta, actívala y añádela al pool. El ejemplo inicial nunca se sortea, aunque alguien lo active por error.

```sql
update public.ut_cartas
set activa = true
where codigo = 'jugador-001' and es_ejemplo = false;

insert into public.ut_sobres_pool (sobre_tipo, carta_id, peso)
select 'thc-base', id, 100
from public.ut_cartas
where codigo = 'jugador-001' and activa and not es_ejemplo
on conflict (sobre_tipo, carta_id) do update set peso = excluded.peso;

update public.ut_sobres_catalogo
set activo = true
where id = 'thc-base';
```

Cada selección usa `peso / suma de pesos disponibles`. Aumentar el peso aumenta la probabilidad. El sobre base entrega cinco cartas y permite repetidas; cada copia recibe un ID propio. Con un solo jugador en el pool, las cinco cartas serán de ese jugador. Si el catálogo o el pool no está listo, el sobre queda intacto.

## Entregar sobres manualmente

Busca el UUID del usuario en Authentication → Users. Este bloque entrega **dos sobres nuevos cada vez que lo ejecutas**; cambia el UUID y la cantidad antes de correrlo.

```sql
insert into public.ut_sobres_inventario (user_id, tipo_id)
select 'REEMPLAZAR-POR-UUID-DEL-USUARIO'::uuid, 'thc-base'
from generate_series(1, 2);
```

## Editar estadísticas y consultar el club

```sql
update public.ut_cartas
set ritmo = 78, pase = 82, regate = 80
where codigo = 'jugador-001';

select codigo, nombre, posicion, grl, rareza, activa from public.ut_cartas order by nombre;

select i.id, i.user_id, i.estado, i.tipo_id, i.adquirido_en
from public.ut_sobres_inventario i order by i.adquirido_en desc;

select c.user_id, c.id as copia_id, j.nombre, j.grl, c.adquirido_en
from public.ut_cartas_club c join public.ut_cartas j on j.id = c.carta_id
order by c.adquirido_en desc;
```

El guardado de plantilla toma los datos del catálogo y de las copias que pertenecen a la cuenta; no acepta estadísticas inventadas por el navegador. La apertura bloquea el sobre y guarda las cinco cartas en una sola transacción. Si se corta la conexión, reutilizar la solicitud recupera el resultado sin cobrar otro sobre ni duplicar cartas.

RLS permite a cada usuario leer solo sus sobres, cartas y plantilla. La escritura del catálogo, asignación de sobres y modificación de cartas quedan para SQL Editor o servicios de confianza. Las aperturas y guardados usan funciones autenticadas. Reiniciar la plantilla no borra la colección ni vuelve a dar sobres.

## Comprobación local

`node scripts/test-ultimate-team-sql.mjs RUTA_A_PGLITE/dist/index.js` ejecuta los escenarios de permisos, datos canónicos, apertura y rollback con PostgreSQL local en memoria. No se conecta a Supabase ni Discord. La prueba usa una conexión; no sustituye una prueba de carga con conexiones simultáneas.

Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [bloqueos de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).
