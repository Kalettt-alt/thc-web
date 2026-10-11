# Envío de TierList a Discord

La aplicación usa ahora `/api/compartir-tierlist`: funciona con el servidor local de Vite y con una función de Vercel. La implementación común verifica la sesión en Supabase Auth, el origen exacto, la estructura y dimensiones PNG, el tamaño y una cuota persistente antes de enviar. El webhook permanece en el servidor. No hacen falta un dominio comprado ni otra base de datos.

El webhook anterior estaba incluido en el navegador. Elimina ese webhook en Discord y crea uno nuevo en **Ajustes del servidor → Integraciones → Webhooks**, en el canal que recibirá las TierList. No pegues el enlace en el chat ni lo añadas a una variable `VITE_*`.

## Habilitarlo en local

1. En **Supabase → SQL Editor**, ejecuta el archivo [tierlist_rate_limit.sql](../../tierlist_rate_limit.sql). Solo añade la tabla privada de cuotas y su función; permite un envío por minuto y diez al día por cuenta. No modifica las tablas de la comunidad.
2. Desde PowerShell, en la carpeta del proyecto, ejecuta:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/configure-tierlist.ps1
   ```

   El script pide el enlace nuevo con entrada oculta y lo guarda en `.env.server`, excluido de Git y de los archivos que se suben con Vercel CLI. Este archivo es privado; no se importa desde el código del navegador. Si ya existía, el script reemplaza únicamente este archivo de configuración.
3. Ejecuta `npm run dev` e inicia sesión normalmente. Los orígenes locales autorizados se toman del puerto real del servidor, incluido si Vite usa otro puerto. El archivo `.env.local` conserva solamente la configuración pública de Supabase.

El botón comprueba que el servicio esté configurado antes de generar la captura. Esta comprobación valida la sesión y no envía imágenes ni consume cuota. La disponibilidad de la cuota se comprueba al enviar.

## Mostrar la página en Vercel

1. Importa el proyecto en Vercel como **Vite**, con `npm run build` y salida `dist`.
2. En **Settings → Environment Variables**, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los mismos valores públicos de tu configuración local; añade `DISCORD_TIERLIST_WEBHOOK` con el enlace nuevo como variable privada, sin prefijo `VITE_`. Selecciona **Preview** y **Production** para los entornos que usarás.
3. Aplica el SQL de cuotas del paso anterior si aún no lo hiciste y despliega de nuevo. Vercel publica `api/compartir-tierlist.js` como función Node; el archivo `vercel.json` mantiene `/api/` separado de las rutas de React. [Funciones Node de Vercel](https://vercel.com/docs/functions/runtimes/node-js), [rutas de Vite](https://vercel.com/docs/frameworks/frontend/vite).
4. Añade la dirección de la demo a las URLs de redirección de **Supabase → Authentication → URL Configuration** para que el login con Discord pueda regresar a esa página. No cambies el callback del proveedor Discord sin revisar su configuración existente.

Los orígenes de la demo se autorizan a partir de `VERCEL_URL`, `VERCEL_BRANCH_URL` y `VERCEL_PROJECT_PRODUCTION_URL`, proporcionados por el despliegue. Mantén habilitada la opción **Enable access to System Environment Variables** en Environment Variables del proyecto de Vercel. No se autoriza un dominio que venga del encabezado `Host` de una petición. Si añades un dominio personalizado después, puedes declararlo en `THC_ALLOWED_ORIGINS`, con orígenes exactos separados por coma y sin rutas ni comodines. [Variables del sistema de Vercel](https://vercel.com/docs/environment-variables/system-environment-variables).

Para Vercel y el servidor local se limita la captura a **4 MB**, dejando margen al formulario multipart dentro del límite de peticiones de Vercel. La captura no se reenvía automáticamente tras un fallo para evitar duplicados. [Límites de Vercel Functions](https://vercel.com/docs/functions/limitations).

## Otra opción: alojar el envío en Supabase

Si más adelante utilizas un hosting que solo sirve archivos estáticos, puedes usar la Edge Function existente:

1. Ejecuta el SQL de cuotas y crea `.env.server` con el script anterior, pasando los orígenes reales:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/configure-tierlist.ps1 -Origins 'https://tu-demo.example,http://localhost:5173'
   ```

2. Autentica la CLI y configura/despliega la función. Sustituye `PROJECT_REF` por el identificador del proyecto de Supabase:

   ```powershell
   npx supabase login
   npx supabase secrets set --env-file .env.server --project-ref PROJECT_REF
   npx supabase functions deploy compartir-tierlist --project-ref PROJECT_REF
   ```

3. Añade `VITE_TIERLIST_TRANSPORT=supabase` al entorno público del frontend y recompila. La configuración mantiene `verify_jwt = true`, envía explícitamente el JWT de la sesión y vuelve a comprobar al usuario con Auth. No utiliza una clave privada `service_role`. [Variables de Edge Functions](https://supabase.com/docs/guides/functions/secrets), [encabezados de autenticación](https://supabase.com/docs/guides/functions/auth-headers).

## Qué informa un error

El cliente distingue sesión vencida, servicio sin publicar, origen no permitido, configuración incompleta, cuota no instalada/agotada, captura inválida/grande, red interrumpida y canal de Discord retirado. Solo muestra mensajes permitidos; nunca transmite al navegador el enlace del webhook, respuestas internas de Supabase o detalles privados de Discord. El CORS preflight permite los encabezados del SDK y responde antes de comprobar el webhook para que el navegador pueda mostrar el error de configuración. [CORS de Supabase](https://supabase.com/docs/guides/functions/cors).

La cuota se reserva antes de contactar Discord. Si Discord rechaza el archivo o se pierde la confirmación, el intento consume una plaza. Esto evita reintentos ilimitados que agoten el servicio.

## Estado de esta revisión

Se prepararon y probaron ambos servidores y el cliente con servicios simulados; **no se enviaron mensajes reales a Discord ni se aplicó SQL al proyecto remoto**. En este equipo solo están presentes las variables públicas de Supabase: falta configurar el webhook nuevo y la cuota para habilitar el envío. El diagnóstico remoto de solo lectura no pudo conectarse al proyecto, por lo que no confirma si la Edge Function está publicada.
