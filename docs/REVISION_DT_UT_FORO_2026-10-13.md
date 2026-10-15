# Verificación de la renovación

DT Fantasy tiene nueva entrada, selección de clubes y firma, con una introducción narrativa de 40 segundos. Ultimate Team vuelve a abrir Jugar, ofrece práctica y Online y muestra la cancha horizontal; decisiones durante el partido utilizan el nuevo motor v2. Casino y las ambientaciones de perfiles se mantienen como las guarda el dueño. El Foro permite adjuntar imágenes del PC.

Activación de Supabase:

1. Con Online UT anterior ya instalado: ejecutar `ComandosSQL_UTSimulacion.txt` completo. Si el módulo no estaba instalado, utilizar `ComandosSQL_OnlineUT.txt`, que ya incluye v2. Para instalar también los requisitos UT, el paquete completo es `ComandosSQL_ActualizacionUT.txt`; no hace falta ejecutar los tres archivos.
2. Ejecutar `ComandosSQL_ImagenesForo.txt` para el bucket y las RLS de adjuntos.
3. Publicar el frontend actualizado. DT Fantasy y el nuevo diseño Casino no requieren SQL adicional. Los permisos de perfiles y amigos siguen en el archivo existente `ComandosSQL_PerfilesAmigos.txt`.

Comprobación: 264 pruebas unitarias de todo el proyecto aprobadas; ESLint completo y compilación de producción aprobados. La compilación conserva el aviso existente de bundle compartido mayor de 500 kB, sin errores.

PostgreSQL local: 44 escenarios UT, incluidos compatibilidad v1, instalación repetida, permisos, emparejamiento, coaching idempotente, fatiga, cinco sustituciones y 225 comparaciones de posición JS/SQL. Otros 17 escenarios comprueban el SQL de imágenes del Foro y sus RLS. Los archivos fuente y sus TXT para copiar coinciden.

Navegador: práctica completa de 90 + 12 + 90 segundos, sustitución, formación 4-4-2 y mentalidad ofensiva, resultado final 0–2. Introducción DT completa y Saltar intro, selección con escudos cargados, contrato ficticio firmado una sola vez, revisión móvil sin desbordamiento. Preferencia de movimiento reducido y activación explícita de efectos DT, grabación de movimiento real y persistencia hasta la selección/contrato. Foro con selección y vista previa de un archivo local, publicación confirmada por el servicio de prueba. Casino visible también para el visitante.

No se ejecutó SQL ni se publicaron imágenes o partidas en producción. Las pruebas PostgreSQL usan una conexión local PGlite; la prueba de carga Online con varias conexiones y cuentas reales queda para el despliegue. Guías de funcionamiento: `ULTIMATE_TEAM_ONLINE.md`, `DT_FANTASY_ENTRADA_2026-10-13.md`, `FORO_IMAGENES_2026-10-13.md` y `PERFILES_EFECTOS_2026-10-13.md`.
