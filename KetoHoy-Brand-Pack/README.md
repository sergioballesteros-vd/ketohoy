# KetoHoy Brand Pack

Este pack parte del isotipo de aguacate aprobado. La geometría del isotipo maestro
no debe reinterpretarse al integrarlo.

## Archivos
- ketohoy-mark.svg — isotipo maestro lima, fondo transparente.
- ketohoy-mark-white.svg — variante monocroma blanca.
- ketohoy-mark-dark.svg — variante oscura para fondos claros.
- ketohoy-icon.svg — icono cuadrado sobre fondo verde oscuro.
- ketohoy-icon-16/32/48.png — favicon/raster.
- ketohoy-icon-180.png — Apple Touch Icon.
- ketohoy-icon-192.png y 512.png — PWA.
- ketohoy-logo-horizontal.svg — lockup horizontal de referencia.

## Colores
- Lima: #A6F13E
- Verde oscuro: #0C1F12
- Blanco: #FFFFFF
- Claro auxiliar: #F7F5ED

## Integración
Antes de mergear, comprobar si KetoHoy ya usa tokens de marca ligeramente distintos.
Si es así, cambiar únicamente los colores para coincidir con los tokens existentes;
no modificar la geometría del isotipo.

Para la UI, usar preferentemente el SVG. Los PNG son para contextos que requieran
raster. Verificar favicon a 16 y 32 px, Apple Touch a 180 y PWA a 192/512.
