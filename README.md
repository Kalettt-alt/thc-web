# THC

Aplicación React/Vite con Supabase y acceso mediante Discord. Incluye foro, perfiles, álbum, DT Fantasy y THC Ultimate Team.

## Desarrollo

Instala las dependencias con `npm ci`. Copia `.env.example` a `.env.local` y completa la URL de Supabase y su clave pública. Si `.env.local` ya existe, conserva su configuración. Las variables `VITE_*` se incluyen en el navegador: usa únicamente claves públicas.

```sh
npm run dev
```

Configura el proveedor Discord y las URLs de redirección en tu proyecto de Supabase para el dominio donde se ejecuta la aplicación.

## Comprobaciones

```sh
npm test
npm run lint
npm run build
npm run preview
```

`npm run build` genera la aplicación en `dist`. `npm run preview` permite revisar esa compilación localmente.

## Revisión y configuración del servidor

[REVISION.md](REVISION.md) reúne los cambios, errores corregidos, resultados de pruebas, capturas y archivos retirados por falta de uso.

[Perfiles y Álbum](docs/REVISION_PERFILES_ALBUM_2026-10-03.md) documenta los siete estilos, editor con vista previa, inventario compacto y mercado visual. El nuevo SQL de protección de perfiles está separado en [ComandosSQL_Perfiles.txt](ComandosSQL_Perfiles.txt), con [instrucciones y sobres manuales](docs/SQL_PERFILES_2026-10-03.md).

[Revisión de Álbum y Ranking](docs/REVISION_ALBUM_RANKING_2026-10-03.md) documenta el inventario, filtros, intercambios, recuperación de sobres, presentación del ranking y 111 pruebas. [ComandosSQL.txt](ComandosSQL.txt) reúne únicamente los SQL necesarios; empieza por la [guía de instalación del Álbum](docs/SQL_ALBUM_2026-10-03.md) para comprobar las ofertas antiguas antes de migrar.

[Revisión de DT Fantasy y diseño THC](docs/REVISION_DT_2026-10-01.md) documenta el estadio, el panel de entrenador, las charlas del descanso, el reglamento y las mejoras del bot de entrenamiento.

[Revisión del Inicio animado, navbar y Tinder THC](docs/REVISION_INICIO_ANIMADO_2026-10-02.md) documenta la portada actual, las presentaciones al bajar y subir, las letras interactivas del footer, el menú por categorías y el apartado básico de Tinder.

[Revisión de Foro y Muro THC](docs/REVISION_COMUNIDAD_2026-10-02.md) documenta el rediseño, la conservación de DomeGallery, las correcciones de foco y scroll, las pruebas y las capturas. Los comandos de Supabase están separados en la [guía de SQL de comunidad](docs/SQL_COMUNIDAD_2026-10-02.md).

[Revisión de Fantasy y Discord](docs/REVISION_INICIO_FANTASY_2026-10-02.md) documenta el inicio manual de partido, los cambios de puestos, la cancha básica, el envío seguro y las mejoras anteriores.

Los scripts de `supabase/` son propuestas para revisar junto con las RLS, permisos y funciones existentes. No se aplicaron a la base de datos remota. Empieza por `supabase/audit_security.sql` y contrasta sus resultados con los documentos de seguridad incluidos.

El envío de TierList a Discord tiene un servidor local para Vite y un endpoint listo para Vercel. Para habilitarlo, configura el webhook nuevo en `.env.server` mediante `scripts/configure-tierlist.ps1` y aplica el SQL de cuotas en Supabase; en Vercel guarda el webhook como variable privada del servidor. Las instrucciones completas y la alternativa para otro hosting están en [compartir-tierlist](supabase/functions/compartir-tierlist/README.md). El webhook anterior debe regenerarse porque estaba expuesto en el cliente.
