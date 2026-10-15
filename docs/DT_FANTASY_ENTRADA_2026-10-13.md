# Nueva entrada de DT Fantasy

La pantalla de entrada utiliza una pizarra de entrenador, negro, crema y naranja, con acceso a la carrera. Se conserva el recorrido y los datos guardados: las carreras existentes entran a su menú; comenzar una carrera nueva pasa por introducción, selección, contrato y menú.

La introducción dura **40 segundos** y presenta seis partes de la experiencia: la ambición del DT, elegir el club, construir el once y la idea táctica, preparar y vivir las jornadas, seguir los resultados de la temporada y asumir el proyecto de la directiva. Cada escena utiliza una composición y movimiento propios con barridos alternos entre ellas. No carga el estadio 3D anterior ni consulta Supabase. «Saltar intro» permanece disponible abajo. El modo de movimiento reducido conserva las seis escenas y los 40 segundos; reduce únicamente los efectos.

La selección permite buscar por nombre y filtrar por país. Explorar una tarjeta cambia el detalle; «Dirigir este club» confirma el equipo real. Se conservan IDs, ligas, presupuestos y plantillas. El nuevo contrato incluye despacho, jefe, mano ofreciendo el documento, papel deslizándose, bolígrafo, firma y sello. Solo se entra a la carrera después del clic en «Firmar contrato». Los temporizadores se cancelan al salir y finalizar o saltar la intro solo llama una vez al callback.

Esta renovación **no requiere SQL**. Se revisaron entrada, selección, contrato, finalización natural de la intro y pantallas móviles con datos locales de prueba. Las seis pruebas de ciclo comprueban 40 segundos, todas las fases, salto, desmontaje y firma única; otras dos comprueban la preferencia de movimiento y su independencia de Inicio y perfiles.

Cuando el dispositivo solicita movimiento reducido, «Activar animaciones» en el pie de la intro permite habilitar expresamente los efectos. La elección local se conserva para entrada, selección y contrato; «Reducir movimiento» restablece la preferencia automática. El reloj de 40 segundos no se reinicia al cambiar esta opción. Se probaron ambos modos y se grabaron 14 fotogramas reales durante aproximadamente 2,3 segundos con efectos completos; 12 de los 13 pares consecutivos cambian. El fragmento `capturas/dt-intro-animada-2026-10-13.gif` muestra esa animación.

Capturas: `capturas/dt-menu-2026-10-13.jpg`, `capturas/dt-firma-2026-10-13.jpg` y `capturas/dt-intro-narrativa-movil-2026-10-13.jpg`.
