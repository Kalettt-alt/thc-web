# Efectos de perfiles y Casino

Casino reemplaza el nombre visible Cromo y mantiene su identificador guardado `cromo`. No necesita una migración adicional: conserva los permisos VIP Trueno desde nivel 15 y el estilo guardado por su dueño al visitar el perfil.

La composición utiliza verde oscuro, marfil, rojo, mostaza y azul, un mosaico de colores, cartas y una ruleta semicircular original. El marco cambia de color y las fichas recorren los bordes. Circuito tiene una nueva estructura de paneles índigo y lima. Aurora, Vinilo, Eclipse, Prisma, Órbita y Lienzo cuentan con ambientaciones distintas en movimiento.

El control «Efectos del perfil» es una preferencia local del visitante: Auto, Animados, Suaves o Pausados. Auto respeta el movimiento reducido del sistema; Animados lo habilita de forma explícita, Suaves conserva cambios de color sin desplazamientos y Pausados muestra una escena estática. No depende de la preferencia de luces de Inicio ni modifica el estilo del dueño. Los efectos detienen el renderizado cuando la pestaña está oculta y liberan sus listeners al salir.

Verificación: pruebas de cada ambientación, modos de movimiento, límites de partículas, compatibilidad de IDs/permisos SQL y persistencia de preferencias. En navegador se comprobaron Casino y Circuito, modo Animados, y el mismo Casino al visitar como otra cuenta de prueba. La grabación `capturas/perfil-casino-animado-v4.gif` contiene 16 fotogramas reales del navegador en aproximadamente 4,4 segundos; sus 15 pares consecutivos presentan cambios visibles en los bordes.

Para perfiles y amigos se mantiene el archivo existente `ComandosSQL_PerfilesAmigos.txt`. Esta revisión de efectos no modifica ese SQL.
