# Apertura de sobres THC

Corrección limitada a la presentación y animación de los sobres del Álbum.

La entrada final muestra únicamente el sobre flotante centrado, el contador de sobres y un fondo THC naranja y negro. Se retiraron el título, la explicación, la guía, la edición y los botones adicionales. Se conserva una flecha discreta para regresar. Tras abrir se muestran los cinco cromos y una única acción para revelarlos o abrir el siguiente sobre.

- El sobre original vuelve a flotar y se puede abrir tocándolo o con el botón. El saldo aparece antes de abrir.
- La apertura tiene rasgado de la tira superior, luz naranja, salida de cinco cromos en abanico y paso a la revelación individual existente.
- El rasgado empieza después del recibo validado de Supabase. Durante la espera de red el sobre solo pulsa.
- Se conservan `abrir_sobre_album_v2`, su solicitud persistida para recuperación, el descuento y el guardado existentes. La asignación de sobres sigue siendo manual desde Supabase.
- El doble clic permanece bloqueado hasta completar la secuencia. Los temporizadores se cancelan al salir o reducir el movimiento; cambiar de usuario reinicia el estado visual.
- La opción de movimiento de THC y la preferencia del sistema son respetadas.

Revisión con el componente real y respuestas de Supabase simuladas, sin consumir sobres reales: doble clic (un RPC), siguiente sobre, fallo de red, respuesta perdida (recuperación sin segundo descuento), desmontaje durante solicitud, desactivar movimiento durante el rasgado, preferencia del sistema y pantalla de 320 × 640. Los cinco cromos del abanico quedan dentro del ancho disponible en móvil.

El navegador de revisión usa movimiento reducido por defecto. Para revisar la animación normal se emuló la preferencia en el archivo de prueba temporal, tanto en `matchMedia` como en las reglas CSS de esa página; el código de producción no recibe esa emulación.

Capturas: `capturas/sobre-flotante-2026-10-03.png`, `capturas/sobre-cromos-2026-10-03.png` y `capturas/sobre-apertura-movil-2026-10-03.png`.

No se requieren comandos SQL nuevos para esta corrección.

Validación: la batería completa previa aprobó 120/120 pruebas. Después de simplificar la pantalla pasaron las seis pruebas de sobres, `npm run lint` y `npm run build`. Se verificó visualmente la entrada, la apertura con doble clic (saldo 2 → 1), los cinco cromos, la pantalla de 320 × 640 sin colisiones ni desplazamiento extra y la apertura deshabilitada con saldo cero. La compilación conserva la advertencia existente sobre el tamaño de un bundle compartido.
