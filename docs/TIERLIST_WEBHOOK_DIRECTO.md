# Tier list: envío con tu webhook

En la pantalla Tier List, pega el webhook del canal en **Webhook del canal** y pulsa **Enviar imagen**. El tablero se captura como PNG y se envía directamente a Discord. Este flujo no usa aprobación de un administrador, secretos de Vercel, Edge Functions ni comandos SQL.

El campo permanece oculto y el enlace solo vive en memoria durante esa pantalla. No se guarda con el tablero ni en Supabase. El botón del ojo permite revisar lo pegado; al salir se borra. Solo se admiten webhooks HTTPS de `discord.com`. Si el destino es un hilo, el enlace puede incluir `?thread_id=ID_DEL_HILO`.

**Descargar PNG** guarda la misma captura en tu dispositivo sin enviar nada. Las imágenes propias, filas, colores, fondos y deshacer siguen disponibles. Puedes arrastrar una imagen o seleccionarla y elegir **Mover a…**.

Un error de conexión puede ocurrir después de que Discord haya recibido la imagen. Por eso no hay reenvíos automáticos: revisa el canal antes de volver a pulsar. La aplicación espera la confirmación de Discord antes de mostrar un envío correcto.

Las guías de octubre 2 y 3 sobre `DISCORD_TIERLIST_WEBHOOK` describen el servicio anterior; no son necesarias para el botón actual. Sus servicios siguen en el repositorio para compatibilidad, pero esta pantalla no los utiliza.

Verificación: siete pruebas con peticiones simuladas, sin enviar mensajes reales. Se comprueban URLs, credenciales, imagen adjunta, errores, ausencia de reintentos y timeout. [API de webhooks de Discord](https://docs.discord.com/developers/resources/webhook#execute-webhook).
