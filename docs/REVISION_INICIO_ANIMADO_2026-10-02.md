# Inicio animado, navbar y Tinder THC · 2 de octubre de 2026

Se reemplazó la portada anterior por una presentación con más carácter THC: negro, naranja y crema, títulos grandes y capítulos para DT Fantasy, Ultimate Team y el álbum. El diseño toma como referencia la presentación por secciones de [NYNJ 2026](https://nynjfwc26.com/). Las animaciones se implementaron con Framer Motion, ya instalado en el proyecto, siguiendo su [documentación de scroll](https://motion.dev/docs/react-scroll-animations).

**Inicio.** Las letras de THC, las ilustraciones y los números cambian de posición al recorrer la página. Los títulos y contenidos vuelven a presentarse al entrar en una sección desde arriba o desde abajo. Fantasy tiene una pizarra táctica animada; Ultimate Team muestra la identidad del club; el álbum presenta cromos. Se añadieron un directorio de foro, muro, rankings, tierlist y perfil, una introducción a Tinder, tres pasos para empezar y preguntas frecuentes desplegables. Los textos principales tienen entre 17 y 22 px, con adaptación para móviles.

**Footer.** Se recuperó la interacción de letras mediante una nueva implementación: TRUENO aparece con movimiento ligado al scroll y sus letras se pueden arrastrar con inercia dentro del escenario. Las flechas del teclado mueven la letra enfocada; Enter, Espacio y Escape la devuelven a su lugar. Rearmar letras restablece todas. Se conservan los enlaces a perfil, juegos, comunidad, Discord y TikTok.

**Navbar.** La barra tiene menos elementos decorativos, una cápsula de menú más clara y categorías con títulos y enlaces grandes. Se conserva la apertura por botón, la presentación escalonada de las tres categorías, la exclusividad entre menús, el cierre al hacer clic fuera y con Escape, mensajes, notificaciones y perfil. La transición original entre páginas y la entrada propia de Ultimate Team no fueron modificadas en esta iteración.

**Movimiento.** Inicio, navbar y footer comparten la opción Pausar animaciones del menú. Se guarda localmente y se conserva al recargar. Las animaciones están activadas de forma predeterminada para responder al diseño solicitado; la preferencia del sistema operativo no se modifica. La pausa global deja todos los textos visibles y desactiva el arrastre del footer. El botón de pausa de la banda detiene solo los bucles continuos, incluidos jugadores y trazos de la pizarra, conservando las presentaciones y el parallax de scroll. Se usan MotionValues para el desplazamiento, sin actualizar el estado React en cada fotograma. Los bucles de jugadores se detienen cuando el capítulo sale de la zona visible.

**Tinder THC.** Se crearon `src/pages/TinderTHC/TinderTHC.jsx`, su CSS y la ruta `/tinder`, cargada de forma diferida. Hay accesos desde Inicio, navbar y footer. La pantalla dice Próximamente y permite volver al Inicio. Usa siluetas ilustrativas; no implementa registro propio, perfiles de citas, matches ni tablas nuevas. La conexión específica con Supabase queda para la siguiente etapa solicitada. La ruta conserva el acceso general de la aplicación mediante Discord.

**Errores corregidos durante la revisión.** Los títulos con máscara quedaron inicialmente ocultos porque observaban su propio elemento desplazado: ahora la detección usa el `h2` estable. El desplazamiento de entrada del footer alteraba los límites del arrastre: ahora anima el glifo interior y mantiene estables las coordenadas del botón. Al pausar, las ilustraciones y títulos vuelven a su posición visible. La hoja `Inicio.css` existe y su import se resuelve en la compilación final.

| Verificación final | Resultado |
| --- | --- |
| `npm test` | 91 pruebas pasan; cero fallos |
| `npm run lint` | Correcto, sin errores ni advertencias |
| `npm run build` | Compilación correcta |
| Portada 1280×900 | Composición, botones y navbar visibles |
| Pantalla 320×640 | Sin desbordamiento horizontal; ancho de contenido y documento de 305 px por el espacio reservado a la barra de scroll |
| Menú móvil | Panel dentro de la pantalla y recorrido interno hasta sus categorías |
| Scroll en ambas direcciones | Transformaciones del hero cambian al bajar y regresan al subir; títulos del capítulo visibles |
| Pausa global y recarga | Inicio, navbar y footer pasan a `off`; títulos visibles y letras desactivadas; preferencia conservada |
| Pausa de bucles | Banda y trazo táctico en `animation-play-state: paused` |
| Arrastre del footer | Letra desplazada permanece dentro del escenario al finalizar |
| Teclado y rearmado | Movimiento de 24 px por flecha, retorno y restablecimiento de letras comprobados |
| FAQ y Tinder | Pregunta abre su respuesta; enlace abre `/tinder` y permite regresar |

La revisión de navegador utilizó los componentes reales en pantallas temporales con sesión nula y contador de demostración inyectado. No realizó consultas ni escrituras en Supabase, no verificó el login real y no envió imágenes a Discord. Las cuatro pantallas temporales se retiraron al terminar. El contador de producción sigue consultando `perfiles` con las RLS existentes y distingue un fallo de consulta de un resultado válido; no se modificaron permisos ni políticas remotas.

El bloque compartido de producción mide 630,36 KB minificados y 190,60 KB con gzip. Sigue el aviso de Vite por superar 500 KB; Inicio y Tinder mantienen sus módulos separados. No se añadieron dependencias ni vídeos de fondo nuevos. La revisión responsive confirma estas dimensiones concretas, sin prometer el mismo rendimiento en todos los dispositivos.

Capturas finales: [portada](capturas/inicio-cinetico-thc.png), [Fantasy](capturas/inicio-capitulo-fantasy.png), [navbar abierto](capturas/navbar-simple-thc.png), [footer interactivo](capturas/footer-letras-thc.png), [portada móvil](capturas/inicio-cinetico-movil.png), [Tinder básico](capturas/tinder-thc-basico.png).

Los cambios anteriores de Fantasy, seguridad, música y envío seguro a Discord están en [la revisión anterior](REVISION_INICIO_FANTASY_2026-10-02.md). La configuración privada del webhook y la aplicación del SQL de cuotas siguen pendientes; esta iteración no las desplegó.
