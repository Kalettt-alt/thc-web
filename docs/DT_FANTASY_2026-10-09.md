# DT Fantasy · ajustes del 9 de octubre de 2026

- Descanso: negro, blanco roto y naranja THC; se eliminaron los verdes y oliva de los paneles. Textos y controles más legibles, transiciones discretas y alternativa con movimiento reducido.
- Alineación: dos clics o arrastrar para intercambiar jugadores entre titulares y banca; las fichas se desplazan entre sus ubicaciones. Selector de formación, filtro por línea y energía junto a cada jugador. Autoalinear usa todos los disponibles y su GRL ajustado al cansancio; no rellena una defensa con delanteros ni con otro arquero. Si una partida personalizada no tiene cobertura, deja el hueco visible.
- Jornada: tres días de descanso recuperan de forma proporcional el cansancio. Un titular con 40% pasa a 82%; con 70%, a 91%. El banquillo recupera más (40% a 89%). Nadie pierde energía al descansar y un titular fatigado no vuelve automáticamente al 100%.
- Central y confirmación: tamaño adaptable, escudos y tipografía contenidos, ficha previa de 720 px como máximo, controles visibles en móvil. Se quitaron los mínimos rígidos de 650/800 px que provocaban recortes.
- No se cambian las oportunidades máximas, física de los palos, reloj, bebida ni RPC.

## Cobertura de planteles

Se auditaron 58 clubes con las cuatro formaciones: todos pueden completar once jugadores de su línea (POR, DEF, MED, DEL) y cuentan con al menos cinco defensas. Se añadieron once suplentes puntuales a nueve planteles cortos. Las carreras existentes los reciben una vez por ID, manteniendo la energía y el progreso de los jugadores guardados.

El catálogo previo mezcla épocas; estos ajustes no actualizan todo el mercado de pases ni afirman representar las plantillas actuales. Los nombres y sus líneas se verificaron en fuentes oficiales. Los GRL son valores de equilibrio del juego, no estadísticas oficiales.

| Club | Cobertura añadida | Fuente oficial |
| --- | --- | --- |
| Racing Club | Santiago Solari · DEL | [Plantel y formación de Racing](https://www.racingclub.com.ar/primer-equipo/nota/2026/07/15849_ensayo-formal-con-victoria/) |
| Belgrano | Franco Jara · DEL | [Equipo de la pretemporada 2025](https://belgrano.com.ar/2025/01/11/pretemporada-belgrano-hizo-futbol-ante-fenix/) |
| Sevilla | Manu Bueno · MED | [Primer equipo](https://sevillafc.es/es/equipos/primer-equipo) |
| Rayo Vallecano | Óscar Trejo · MED | [Renovación del centrocampista](https://www.rayovallecano.es/noticias/oscar-trejo-renueva-con-el-rayo-vallecano) |
| Getafe | Carles Aleñá · MED | [Debut y posición de Aleñá](https://www.getafecf.com/noticias/kubo-y-alena-debut-ante-el-elche) |
| Espanyol | Alex Král y Urko González · MED | [Král, 2024](https://www.rcdespanyol.com/es/noticia/kral-nou-jugador-del-rcd-espanyol/17460), [Urko, 2025](https://www.rcdespanyol.com/en/new/Urko%20returns%20to%20RCD%20Espanyol%20on%20permanent%20deal/19034) |
| Deportivo | José Ángel Jurado · MED | [Plantillas históricas](https://www.rcdeportivo.es/es/protagonistas-plantillas-historicas) |
| Racing de Santander | Íñigo Sainz-Maza · MED | [Ficha del capitán](https://www.realracingclub.es/jugadores/inigo-sainz-maza-1) |
| Málaga | Ramón Enríquez y Luca Sangalli · MED | [Ramón](https://www.malagacf.com/jugadores/ramon-1), [Sangalli](https://www.malagacf.com/noticias/calidad-para-el-mediocentro-con-luca-sangalli) |

## Validación

Pruebas de cobertura de los 58 clubes en cuatro sistemas, selección de un suplente descansado, prohibición del relleno automático fuera de línea, intercambios sin duplicar/perder jugadores, recuperación de tres días y migración idempotente de los refuerzos. Se conserva la suite de física, oportunidades, charlas, guardado y bebidas.
