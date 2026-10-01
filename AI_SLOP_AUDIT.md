# KetoHoy — auditoría de interfaz

Revisión: 1 de octubre de 2026. Inventario previo a los cambios.
P0: perjudica UX/coherencia. P1: ruido significativo. P2: ajuste menor.

## Alcance
Landing publicada y local; inicio autenticado, catálogo, recetas y detalle, despensa,
compra, plan semanal, preferencias y cuenta, login/registro, recuperación y confirmación.
Navegador a 1280, 390 y 320 px; capturas en `output/playwright/`.
Revisión del código de loading, vacío, errores, selección, modales y componentes compartidos.
Cuenta local desechable; generación de plan y alta manual de producto.
El primer recorrido en desarrollo quedó en skeletons por recursos de desarrollo bloqueados;
se repitieron los flujos en build de producción. No se modificaron datos de producción.

## Global
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Syne muy ancha y peso 800 en títulos operativos | Una pregunta ocupa tres líneas en móvil; todo parece un titular publicitario | DM Sans en contenido; reservar Syne para marca; títulos a 600 |
| P1 | Radios grandes y animación de entrada, elevación, zoom y escala en casi todo | Decoración repetida sin información | Radios discretos por función; eliminar movimiento ornamental y su CSS |
| P2 | Texto secundario de 11 px e inputs con placeholder de contraste bajo | Demasiada miniaturización | Metadatos a 12 px; placeholder legible |

## Landing
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | «Tu semana keto, resuelta» | Eslogan genérico | «Menú keto semanal» y explicación concreta de despensa, preferencias y compra |
| P1 | Entrar + Ya tengo cuenta; bloque final Empieza hoy | Repite acciones y promete minutos sin necesidad | Un alta principal y acceso en cabecera; quitar bloque final |
| P1 | Iconos dentro de cuadrados, reveals, huecos grandes | Tres pasos sencillos tratados como marketing SaaS | Lista numerada compacta, sin iconos ni reveals |
| P2 | FAQ y nota final repiten advertencia nutricional | Duplicación | Mantener la explicación de límites en FAQ |

## Navegación
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Barra con transparencia y blur; iconos SVG propios que duplican Lucide | Efecto innecesario y dos sistemas | Fondo sólido; Lucide para navegación, isotipo propio intacto |
| P2 | Seis destinos en móvil | Espacio limitado, pero todos tienen función | Conservar destinos, selección y labels; verificar 320 px |

## Dashboard/Home
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Saludo + pregunta grande + foto + botón Ver receta repetido | Jerarquía editorial demasiado dominante para una herramienta | «Hoy», recomendación más compacta; conservar enlace a receta sin CTA repetido |
| P1 | Caja de número de recetas y carrusel ocultando ideas | Contenedor sin entidad y scroll lateral sin necesidad | Enlace sencillo y cuadrícula de ideas |
| P2 | Nota nutricional en cada inicio | Compite con acciones sin aportar contexto nuevo | Mantener advertencia en landing/preferencias y clasificación en receta |

## Plan semanal
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Vacío con icono grande, mucho espacio y párrafo largo | Sobredimensiona falta de datos | Vacío compacto; «Generar menú» con alcance claro |
| P2 | Todos los días móviles en cajas, badge Hoy y reloj por receta | Capa de decoración sobre calendario útil | Día actual seleccionado; resto neutro; Hoy como texto, tiempo sin icono |

## Recetas
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Dos filas de pills rellenas con iconos | Los iconos repiten labels; exceso de color | Filtros neutros, seleccionado diferenciado; sin iconos |
| P1 | Foto con badge y acción borrosa/sombreada | Varias capas sobre el mismo contenido | Disponibilidad bajo foto; acción reconocible sólida |
| P1 | Números de preparación dentro de círculos verdes; caja de captación pública | Decoración y marketing dentro del contenido | Lista numerada; acceso público compacto |
| P2 | Dificultad, tiempo y clasificación | Datos útiles para elegir | Mantenerlos; sin reloj/punto decorativo |

## Despensa
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Vacío enorme con dos botones Añadir primarios | Misma acción compite consigo misma | Una acción en cabecera y explicación compacta |
| P2 | Icono en título de categoría y miniatura | Redundancia | Conservar miniatura/placeholder funcional, quitar icono del heading |

## Lista de compra
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Vacío con icono y tres botones junto a Añadir | Demasiadas acciones equivalentes | Cabecera principal; enlaces secundarios y alta manual discreta |
| P0 | Foto, check y stepper consumen casi todo el ancho a 320 px | Nombres quedan muy comprimidos | Ocultar miniatura a menos de 360 px; conservar controles y nombres |
| P2 | Total sin aclarar que algunos productos no tienen precio | Puede interpretarse como precio completo | Etiquetar importe como estimado |

## Preferencias
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Iconos para modo y alimentos, labels seleccionados en verde y número gigante | Decoración alrededor de controles claros | Filas neutras; solo control seleccionado con acento |
| P0 | Botones role=radio sin navegación estándar de radiogroup | Teclado no se comporta como radio | Radios nativos con label y foco visible |
| P2 | Guardado no es anunciado | Confirmación solo visual | Región status para resultado de guardado |

## Auth
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Glow, eslogan, card con blur y tres beneficios debajo del formulario | Vuelve a vender y alarga una tarea concreta | Formulario abierto, título Entrar/Crear cuenta, marca conservada |
| P0 | Tabs sin panel asociado ni teclas de flecha | Semántica incompleta | Botones de modo con aria-pressed, sin prometer un widget tab |
| P2 | Input duplicado en login y recuperación | Estilos divergen | Reusar authInput/authButton |

## Mobile
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P0 | Footer de detalle de producto tiene stepper y CTA con precio en una fila | A 320 px el texto no cabe cómodamente | Stepper en una fila; CTA con precio debajo en móvil |
| P0 | Alta manual reúne cantidad, unidad y categoría en una fila | Selectores demasiado estrechos | Dos columnas; categoría en fila completa en móvil |
| P1 | Filtros con overflow vertical ajustado | Foco puede recortarse | Espacio vertical para outline; scroll solo en filtros largos |

## Estados
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P1 | Vacíos/errores con icono enorme y py-14/16/24 | El vacío se convierte en protagonista | Reducir padding y quitar iconos decorativos |
| P2 | Error «No es culpa tuya» | Tono artificial sin orientar | «No se pudo cargar la página. Inténtalo de nuevo.» |
| P2 | Skeletons, spinner, toast, foco, disabled y confirmación de regenerar | Explican espera, resultado y riesgo real | Conservar; quitar solo movimiento ornamental |

## Otros
| Prioridad | Problema | Por qué | Cambio |
|---|---|---|---|
| P2 | Datos, alérgenos y límites de clasificación keto | Información necesaria, aunque larga | Conservar sin inventar macros ni modificar recomendaciones |
| P2 | Fotografías no siempre representan ingredientes exactos | Requiere revisión editorial, no CSS | Anotar deuda; respetar trabajo previo en imágenes |

## Criterio de implementación
Aplicar P0 y P1 y los P2 de bajo riesgo. Sin nuevas dependencias, cambio de paleta,
algoritmos, rutas ni modelo de datos. Mantener cards para recetas/productos, filtros
interactivos, controles circulares, seguridad, labels y confirmación destructiva.

## Segunda pasada — implementada

- Catálogo: añadir/cantidades neutros; «Ver lista» conserva el acento.
- Radios y selectores: esquema oscuro nativo para integrarlos en la paleta existente.
- Layout: hueco de navegación solo cuando se muestra; sin scroll extra de auth.
- Contraste: forest-400 ligeramente más claro; antes daba 4,49:1 sobre forest-800.
- Error de alta de catálogo: estaba detrás del modal. Ahora se anuncia dentro,
  mantiene el modal abierto y permite reintentar. Prueba de fallo 500 + recuperación.
- Revisitados: pantallas públicas/autenticadas, plan generado, receta, confirmación
  de regenerar, alta manual, detalle de catálogo, error/reintento de recetas y 404.

## Validación

| Comprobación | Resultado |
|---|---|
| `npm run build` | Pasa; incluye TypeScript de Next |
| `npx tsc --noEmit` | Pasa |
| `npm run lint` | Pasa |
| `npm test` | 17 archivos, 149 tests pasan |
| `npm run test:e2e -- --workers=2` | 27 tests pasan, incluido setup |
| Consola de siete rutas principales | Smoke tests pasan sin errores de aplicación |
| Responsive Chromium | Revisión a 1280, 390 y 320 px; test sin overflow a 320/390 |
| Teclado | Flechas en radios, Escape, restauración de foco, bloqueo de scroll en modal |
| Error de red | Recetas con reintento; fallo de alta visible dentro del modal |
| `git diff --check` | Pasa |

El primer E2E encontró un selector ambiguo de «Entrar» tras cambiar tabs por botones;
se acotó al formulario y la ejecución final pasa completa. Los errores HMR pertenecían
al primer recorrido en desarrollo; las verificaciones finales usan producción local.
El 404 deliberado devuelve 404. No se validó entrega real de correo, Safari ni dispositivos
físicos. Recuperación/confirmación: revisión de código, enlace ausente/inválido y tests API.

## Componentes y código simplificados

Eliminados: glow y beneficios de login; captación final de landing; CTA duplicado de
receta en inicio; iconos decorativos en filtros/headings; SVG propios de navegación;
wrapper `template.tsx` de transición; CSS de reveal, entrada, elevación, zoom, escala,
punto decorativo y gradiente de tachado.

Simplificados: Chip, ToneLabel, Skeleton, RecipeCard, AuthShell, Sheet, Toast,
HomePageClient, Landing, Navigation y PageShell. Isotipo KetoHoy intacto.

## Qué se conserva y por qué

- Marca/paleta: identidad existente. Fotos y cards de entidades: reconocimiento.
- Seis destinos y acciones: acceso a todas las funciones.
- Generación, scoring, matching y traslado compra→despensa: lógica intacta.
- Keto, alérgenos, cantidades, ingredientes y límites nutricionales: información necesaria.
- Skeleton, spinner, toast, confirmación de regenerar y movimiento breve de modales:
  indican espera, resultado o consecuencias reales.
- Modificaciones previas en imágenes: `prisma/backfillRecipeImages.ts`, `src/lib/unsplash.ts`,
  `KetoHoy-Brand-Pack/` y `ui-review/`, conservadas sin intervenir.

## Deuda para revisión manual

1. Correspondencia de fotografías con recetas: algunas representan platos diferentes.
2. Datos de recetas: «Queso curado con aceitunas» solo muestra queso en ingredientes.
   Revisar ingredientes/cantidades con criterio editorial.
3. Origen Mercadona: «Pollo entero» muestra `x99.` en alérgenos. Revisar la normalización
   antes de sustituir o eliminar información.
4. Teclado virtual, zoom, VoiceOver y Safari en dispositivo físico.
5. Barra de seis destinos: funciona a 320 px; observar uso antes de esconder funciones.

## Archivos modificados por esta revisión

- `AI_SLOP_AUDIT.md`
- `e2e/auth.spec.ts`
- `e2e/plan.spec.ts`
- `e2e/smoke.spec.ts`
- `e2e/ui.spec.ts`
- `src/app/error.tsx`
- `src/app/explore/ExploreClient.tsx`
- `src/app/explore/ExploreProductSheet.tsx`
- `src/app/globals.css`
- `src/app/inventory/PantryItemSheet.tsx`
- `src/app/inventory/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/LoginForm.tsx`
- `src/app/meals/page.tsx`
- `src/app/not-found.tsx`
- `src/app/page.tsx`
- `src/app/preferences/page.tsx`
- `src/app/recipes/[id]/AddMissingButton.tsx`
- `src/app/recipes/[id]/loading.tsx`
- `src/app/recipes/[id]/page.tsx`
- `src/app/shopping-list/page.tsx`
- `src/app/template.tsx` (eliminado)
- `src/app/verify-email/page.tsx`
- `src/app/weekly-plan/SwapMealSheet.tsx`
- `src/app/weekly-plan/page.tsx`
- `src/components/AddProductSheet.tsx`
- `src/components/AuthShell.tsx`
- `src/components/HomePageClient.tsx`
- `src/components/Landing.tsx`
- `src/components/Navigation.tsx`
- `src/components/PageShell.tsx`
- `src/components/RecipeCard.tsx`
- `src/components/Sheet.tsx`
- `src/components/Toast.tsx`
- `src/components/icons.tsx`
- `src/components/ui.tsx`

Capturas antes/después: `output/playwright/`. Sin sesión exportada.
