# DT Fantasy: decisiones y jugadas

## Control del entrenador

- Al recibir un turno se conservan 4,5 segundos para decidir; apuntar permite hasta 3 segundos adicionales compartidos entre los gestos de ese mismo turno.
- El rival de campo más cercano se aproxima mientras decides. Al agotarse el tiempo completa la entrada y recupera la posesión. No se ejecuta un pase automático ni se transporta al defensor hasta el balón.
- **Disparar**, la flecha arriba y los gestos de tiro siguen disponibles aunque el equipo ya haya empleado sus ocasiones programadas. No hay un mensaje que obligue a pasar. También se puede ordenar un remate del portero.
- Un tiro lejano o desde un ángulo difícil tiene mayor dispersión. Un GRL bajo, el cansancio y un defensor presionando también perjudican su precisión. La trayectoria, los jugadores, los postes y el arquero resuelven el resultado: aceptar el tiro no concede un gol.

## Ataque y defensa

La IA elige según la posición del balón, los carriles disponibles, la presión, la mentalidad y las recuperaciones recientes. Un rematador con un camino libre dentro del área prioriza disparar; fuera de distancia de tiro, un carril libre permite conducir hacia delante. Los pases de seguridad se reservan para presión o reorganización, y los pases atrás dentro del último tercio se usan como una descarga hacia un rematador central, no como una retirada arbitraria a mitad de cancha.

Se distinguen las salidas cortas y largas del portero, la circulación vertical, el pase filtrado, la pared, la diagonal, el cambio de frente, la apertura a banda, el desdoblamiento, el centro aéreo, el pase atrás al área, el regate para salir de presión, la reorganización y la contra. Tras una recuperación, la transición ofensiva dura hasta 6,5 segundos de juego activo; los laterales pueden proyectarse mientras los centrales conservan cobertura.

Cuando el rival cierra el centro, los medios ofrecen salida hacia atrás y hacia los costados; el pivote puede bajar. El bloque defensivo protege el carril central y mantiene un presionante principal por equipo.

## Reinicios

- Un desvío del defensor o una parada rechazada que cruza su propia línea de fondo concede una esquina al atacante.
- La pelota se coloca en la esquina correcta. Jugadores, marcadores y portero se recolocan con una transición de 950 ms, sin modificar su formación base ni gastar tiempo de juego durante la preparación.
- Hay cuatro rutinas: primer palo, segundo palo, corto y frontal. La selección evita repetir consecutivamente la misma. El entrenador puede elegir otro destinatario o rematar directamente.
- En el saque de banda se ofrecen dos apoyos cercanos. Los saques de meta y de centro conservan sus transiciones existentes.

## Verificación

Las pruebas incluyen robo por tiempo agotado, tiro libre de restricciones, dispersión por atributos, remate de ambas IA con camino libre, banda ante centro cerrado, coberturas en la contra, centros y descargas distintos, las cuatro esquinas, reinicios rivales y una parada que acaba en córner. También se mantienen las pruebas de formaciones, cambios, energía, descanso, atribución del goleador y finalización única.

Las ventanas antiguas de `opportunities` ritman ataques ordinarios de la IA; `attempts` registra los remates reales y `extraAttempts` los ejecutados fuera de esas ventanas. La interfaz muestra los remates reales. Esta actualización del motor no requiere SQL adicional.
