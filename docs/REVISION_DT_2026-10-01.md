# DT Fantasy y diseño THC · 1 de octubre de 2026

Esta revisión se centra en la identidad visual del reglamento y del partido, las decisiones del entrenador y el entrenamiento de Ultimate Team. Conserva la transición entre categorías, la introducción de Ultimate Team y los textos del reglamento.

## Diseño

- Reglamento con la paleta naranja y negra del menú de DT Fantasy, títulos grandes, tarjetas rectangulares, numeración, iconos y detalles animados. Navegación a cada regla, adaptación móvil y respeto a la preferencia de movimiento reducido.
- Estadio vertical con tribunas, sectores, iluminación, barreras, publicidad THC, césped y redes. El dibujo mantiene las coordenadas físicas de la cancha de Fantasy.
- Marcador, botones y eventos inferiores con la misma identidad. Celebración de gol con equipo, autor, minuto y resultado; presentación para el final del partido.
- Cámara que sigue el balón y muestra una sección de la cancha. El botón **Estadio** permite ver el campo completo; el radar indica la zona visible y las posiciones.
- Jugadores y balón legibles a distintas escalas. El gesto de pase, conducción y disparo conserva su funcionamiento; también hay controles con teclado indicados al enfocar la cancha.

## Panel de entrenador

**Alineación** pausa el partido y muestra energía, nota, posición y estadísticas de cada jugador. Permite intercambiar puestos y hacer hasta cinco sustituciones, sin reingreso del jugador sustituido. En móvil hay una ficha rápida y un acceso al banquillo.

**Táctica** ofrece mentalidad defensiva, equilibrada u ofensiva y los cuatro sistemas existentes: 4-3-3, 4-4-2, 3-5-2 y 3-4-3. Los cambios conservan jugadores, posesión, energía y estadísticas; se aplican al once actual, incluidos los suplentes que entraron.

**Charla**, durante el descanso, ofrece cuatro intervenciones como máximo. Hay cincuenta frases; las opciones aleatorias incluyen confianza, calma, concentración e intensidad. Se pueden dirigir al equipo, a una línea o a un jugador. El efecto depende de su energía y tiene un límite acumulado de 4,5 % sobre la velocidad. La charla no repone stamina.

La energía disminuye durante el tiempo de juego, según puesto, esfuerzo y mentalidad. El resumen al terminar conserva alineación, reservas y energía reales en la carrera; evita descontar además la fatiga aleatoria del flujo anterior.

La nota es una estimación calculada a partir de goles, pases, recuperaciones y atajadas. Los contadores registran acciones del motor; la nota no pretende reproducir una evaluación profesional de rendimiento.

## Dinamismo y errores corregidos

- Ambos equipos pueden reciclar posesión, cambiar de banda, combinar una pared, conducir o rematar según presión, espacio y mentalidad. La estructura conserva un jugador de presión por equipo y apoyos que respetan sus zonas.
- Un gol mantiene su autor aunque ese jugador sea sustituido mientras el tiro está en vuelo.
- Un pase completado tras la sustitución del pasador se atribuye al jugador original.
- Abrir el panel o hacer un cambio durante una celebración no reemplaza los datos del gol.
- El texto **Tu turno** corresponde a una decisión del usuario; la circulación automática y los pases rivales tienen mensajes propios.
- Los estados pausados y las fases estáticas dejan de publicar snapshots a 30 Hz. Los comandos actualizan la interfaz inmediatamente, y los temporizadores y el ciclo de simulación siguen funcionando.

## Entrenamiento de Ultimate Team

El bot utiliza las dimensiones y el alcance de golpeo del propio motor: límites x ±700, y ±320, radio del jugador 20 y del balón 8,5. Predice rebotes con el coeficiente real y decide mediante entradas legales de movimiento y golpeo.

Se añadieron amagos laterales, salida al espacio tras un duelo cercano, conducción, rodeo de la pelota cuando está del lado incorrecto, autopases de pared y tiros que consideran la posición del arquero. El comportamiento requiere más partidos humanos para ajustar dificultad y variedad; no garantiza el nivel de un jugador experto.

El canvas adapta tamaño y resolución manteniendo una escala uniforme. Las cámaras General, Jugador y Cerca siguen disponibles. Se compararon los bloques de física y extrapolation antes y después: conservaron su contenido, normalizando los finales de línea. No se modificó el valor configurado ni el cálculo de extrapolation.

## Verificación

- `npm test`: **76 pruebas aprobadas**, cero fallos. Incluye partidos completos con aleatoriedad controlada, posiciones, pases, goles, cámara, gestión de DT, charlas, identidad del autor en vuelo, publicación del estado y decisiones del bot.
- `npm run lint`: aprobado, sin errores ni advertencias de ESLint.
- `npm run build`: aprobado. Sigue el aviso de tamaño del paquete principal: 614,20 kB minificado, 183,55 kB comprimido. Las categorías se cargan por separado; este aviso no impide generar la aplicación.
- Revisión visual en escritorio, 360 × 640 y 640 × 360. Sin desbordamiento horizontal en las vistas comprobadas; pie del panel accesible y cuerpo desplazable.
- En el componente real del partido se verificaron una sustitución, el cambio a 3-5-2 ofensivo y la pausa/reanudación tras cambiar mentalidad.
- En el panel de descanso se probaron destinatarios de equipo, línea y jugador, y el límite de cuatro mensajes.
- El bot marcó en una comprobación de 9.000 ticks usando la física extraída del juego; también marcó en la revisión visual del entrenamiento.

Las vistas de revisión importaban los componentes reales con planteles locales. La captura de celebración usa un evento de ejemplo para revisar su presentación. No se inició sesión ni se escribieron datos en Supabase. Las pantallas y scripts temporales de revisión se retiraron; las pruebas útiles permanecen en `tests/`.

Durante la recarga en caliente de esas pantallas temporales apareció un aviso de raíz React duplicada. Esas entradas de revisión se retiraron y no forman parte de la aplicación compilada. El navegador tenía movimiento reducido activado; las animaciones respetaron esa preferencia.

## Capturas

- [Cancha y marcador](capturas/fantasy-cancha-thc-escritorio.png)
- [Estadio completo](capturas/fantasy-estadio-thc.png)
- [Partido móvil](capturas/fantasy-thc-movil.png)
- [Celebración de gol](capturas/fantasy-gol-thc.png)
- [Alineación](capturas/fantasy-alineacion-thc.png)
- [Charla del descanso](capturas/fantasy-charla-thc.png)
- [Reglamento en escritorio](capturas/reglamento-thc-escritorio.png)
- [Reglamento móvil](capturas/reglamento-thc-movil.png)
- [Entrenamiento UT móvil](capturas/ultimate-entrenamiento-movil.png)

La revisión de seguridad y los cambios anteriores se documentan en [REVISION.md](../REVISION.md). Esta entrega no cambia las políticas remotas de Supabase.
