# Sobre inicial: 23 de un pool de 67

Supabase concede una entrega por cuenta de Discord autenticada y con su club creado. La apertura no recibe un usuario, jugadores ni estadísticas del navegador: los toma del servidor. Cada nuevo sobre contiene 23 distintos, suficientes para un once natural 4-3-3 y un portero suplente: al menos 2 POR, 2 DFC, 1 LI, 1 LD, 2 MC, 1 MCO, 1 EI, 1 ED y 1 DC. Los otros 11 puestos de la entrega aportan variedad; no se fuerzan cuotas rígidas de banca. Hay 44 nuevos jugadores ficticios y se preservaron los 23 originales.

El nuevo catálogo tiene exactamente 37 Bronce, 24 Plata, 5 Oro y 1 Plus. Primero se sortean globalmente las 23 calidades con probabilidades base por carta Bronce 55%, Plata 34,5%, Oro 10% y Plus 0,5%. Una calidad sólo se excluye del resto de sorteos si ya se agotaron todos sus jugadores. Después se eligen las cartas de esas calidades y se cubren los puestos mínimos, sin cambiar ni descartar un Oro o Plus que haya salido. Ambos grupos Bronce y Plata tienen por sí solos los jugadores necesarios para ese once y portero suplente.

Las posiciones nunca limitan el 0,5% de Plus a los sorteos de delanteros. Con 23 intentos globales, la probabilidad aproximada de recibir una Plus en el sobre completo es `1 − 0,995²³ ≈ 10,9%`; puede variar ligeramente si antes se agota otra calidad. Plus no está garantizado y nunca aparece repetido, ya que sólo hay un jugador Plus en el pool. No se promete una proporción exacta de calidades en cada entrega.

Las cartas Bronce tienen GRL 54–63 y ninguna estadística supera 73; Plata 67–74 con estadísticas hasta 81; Oro 80–83 con estadísticas hasta 90; Plus 89 con estadísticas hasta 95. El GRL del nuevo catálogo se calcula según las estadísticas y la posición. No hay jugadores iniciales con GRL ni estadísticas 99. Las nacionalidades rotan entre los 20 países suministrados.

Las cuentas con club ya existente conservan sus 23 jugadores anteriores. La migración no reescribe la plantilla ni los saldos, ni activa sobres o cartas reales del catálogo. Un recibo privado congela los 23 IDs y todos sus datos; reintentar, borrar el club, crearlo de nuevo o ejecutar otra vez el SQL no vuelve a sortear. Si se instaló la versión anterior del pool de 67, sus recibos también se conservan con sus valores originales. El catálogo nuevo está separado del legado y sólo afecta futuras entregas. El guardado y el Online verifican la propiedad y recuperan las estadísticas oficiales guardadas en cada recibo.

Instala `ComandosSQL_SobreInicialUT.txt` completo después de UT y Online. Si instalas `ComandosSQL_ActualizacionUT.txt` actualizado, este módulo está incluido al final. No se ejecutó nada en el Supabase remoto desde esta tarea.

`thc_ut_abrir_sobre_inicial()` devuelve el recibo confirmado con `pool_size: 67` y las 23 `cartas`. `thc_ut_cartas_iniciales()` devuelve las cartas ya concedidas y permite mostrarlas en My Team sin conceder un sobre al visitar el apartado. Los jugadores retirados de la plantilla permanecen en Cartas de mi club.

El pack utiliza la imagen suministrada `SobreUT.png`, servida mediante un derivado WebP de 139 KB. Las 20 banderas originales pesan decenas de MB; sus derivados web de 480 × 360 suman 111 KB. Los originales quedan intactos. Para regenerar: `python scripts/optimize-ut-assets.py` usando Pillow.

Validación local: 6 pruebas específicas del pool y sus assets; escenarios de SQL en PGlite con RLS, calidades globales, muestreo determinista de 2000 sobres, todas las cartas Bronce/Plata y máximas calidades escasas, cuentas distintas, club previo, migración de recibo anterior, estadísticas manipuladas, permisos, reintentos, reset, datos congelados y reaplicación. No se probó una apertura contra el proyecto Supabase remoto.
