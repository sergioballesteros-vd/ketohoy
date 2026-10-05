# KetoHoy — research de diseño

**Fecha:** 5 de octubre de 2026 · **Estado:** research y recomendación; no implementar aún.

## Resumen ejecutivo

KetoHoy tiene una propuesta útil y concreta: resolver qué cocinar, qué falta y qué comprar usando la despensa como contexto. La recomendación es diseñar alrededor de ese ciclo y priorizar información operativa en cada momento. En compra mandan nombre, cantidad, estado y acción; cocinando mandan ingredientes, cantidad culinaria y paso actual. Fotos y nutrición aportan contexto después, con límites de confianza visibles.

La dirección recomendada es **Cocina cotidiana**: una experiencia cálida, apetitosa y tranquila, con verde como señal funcional y superficies claras cálidas para leer. Validaría primero **Lista de compra**: es el momento con mayor coste de un error visual, obliga a resolver densidad y mano única, y conecta despensa, cantidades y plan.

## Research

- **11 productos estudiados mediante fuentes públicas**: Mealime, Paprika, AnyList, Bring!, OurGroceries, Samsung Food, Cronometer, YAZIO, Grocy, Apple Reminders y Todoist. Además, consulté Appllama en navegador: fichas, taxonomía de journeys y previews públicos de bienvenida para Mealime y AnyList. Sus demás pantallas están bloqueadas sin Pro; no estaba conectado el MCP en este Codex.
- **Flows documentados desde guías oficiales**: plan semanal → lista → cocinar (Mealime, Paprika, Samsung Food); selección/edición/check de lista en tienda (Bring!, AnyList, OurGroceries, Apple Reminders); inventario → faltantes → compra (Grocy); diario, objetivos y procedencia de datos (Cronometer, YAZIO); captura rápida y progressive disclosure (Todoist).
- **Auditoría visual propia:** landing, home, plan semanal, detalle de receta, comidas, lista de compra, despensa, explorar y preferencias capturadas en 320/390/768/1280; login/términos y dos sheets en 390. Se accedió con una cuenta E2E descartable; se aceptaron los términos solo en la copia temporal local, tras autorización explícita. Se generaron 28 slots de plan y 39 necesidades de compra sintéticas. La base original no recibió escrituras.
- **Evidencias:** [current/](current/) y [references/](references/). Capturas propias de Chromium sobre el build local, sin recursos de terceros descargados. No son pruebas en dispositivos físicos; contraste WCAG y lector de pantalla no se midieron.

## Problemas con mayor impacto

El top 10 ordenado está en [CURRENT-UI-AUDIT.md](CURRENT-UI-AUDIT.md). Los puntos principales son el desajuste entre el tono visual (verde oscuro casi uniforme) y el acto cotidiano de cocinar/comprar; fotos de calidad y encuadre dispares; demasiada densidad funcional en plan y superficies; y oportunidades para hacer más visibles disponibilidad incierta, cantidades y contexto del faltante sin simplificarlos.

## Direcciones

- **A — Cocina cotidiana.** Claridad cálida para decidir, comprar y cocinar sin sentirse dentro de una app clínica.
- **B — Recetario editorial.** Fotografía grande y tipografía de revista para inspiración y cocina pausada.
- **C — Despensa al mando.** Interfaz utilitaria y compacta donde stock, faltantes y cantidades dominan.

## Recomendación y primer experimento

Elegir **A — Cocina cotidiana**: traduce el valor completo del producto, admite fotografías apetitosas y puede mantener una densidad contenida; evita tanto el dashboard como el catálogo e-commerce. Primer experimento: **rediseñar la Lista de compra en 390 px**, cubriendo estado sin resolver, unidad/paquete, grupos, check/undo y un grupo semanal con trazabilidad a comidas. Es la prueba más exigente para legibilidad a una mano y para los contratos funcionales existentes.

## Documentos

- [CURRENT-UI-AUDIT.md](CURRENT-UI-AUDIT.md) — observaciones, top 10 y límites de captura.
- [COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) — productos, journeys, patrones, anti-patrones y fuentes.
- [PATTERN-BENCHMARK.md](PATTERN-BENCHMARK.md) — matriz comparativa solicitada.
- [DESIGN-PRINCIPLES.md](DESIGN-PRINCIPLES.md) — principios y dirección elegida.
- [DESIGN-DIRECTIONS.md](DESIGN-DIRECTIONS.md) — tres conceptos, moodboards, tokens y motion web.
- [COMPONENT-INVENTORY.md](COMPONENT-INVENTORY.md) — KEEP / REFINE / REDESIGN / REMOVE / NEW.
- [REDESIGN-ROADMAP.md](REDESIGN-ROADMAP.md) — secuencia incremental, dependencias KH y matriz de conflicto.

## Segunda pasada crítica

La revisión final descartó usar verde lima y glassmorphism como identidad completa: son decisiones estéticas, no el valor del producto. Las direcciones difieren en jerarquía, densidad, imagen y navegación, no solo en color. La propuesta mantiene explícitos unknown/insufficient, cantidades de cocina frente a unidades de compra, contribuciones semanales y confianza nutricional. La solución de 28 slots usa semana resumida y foco diario, no 28 tarjetas completas visibles a la vez. La lista se optimiza para supermercado; el detalle de receta para cocinar. WCAG AA, teclado, foco, targets de 44 px y `prefers-reduced-motion` se mantienen como condiciones de aceptación, pendientes de verificación en implementación.

## Límites y procedencia

Appllama sí se consultó mediante su web pública. También instalé la skill de investigación `appllama-usage` en `.agents/skills/appllama-usage/` y añadí el servidor MCP a la configuración global de Codex. La autenticación MCP sigue pendiente en la ventana de Appllama; no se llamó al MCP ni se inició una suscripción. El sitio documenta este flujo en [appllama.io/mcp](https://appllama.io/mcp) y [Appllama/appllama-skills](https://github.com/Appllama/appllama-skills). La mayoría de pantallas interiores requiere Pro; la comparación con otras apps también usa documentación oficial y páginas de producto, que no prueban medidas táctiles, contraste o calidad real de sesión. Mealime anuncia cierre el 21 de octubre de 2026; se conserva como referencia de flow, no como producto a elegir. Capturas de rutas internas previas de `audit-assets/` no se trataron como estado actual.

La revisión se realizó con el árbol de trabajo existente, que ya contiene cambios no confirmados del track técnico. Solo se añadieron los documentos y capturas de esta carpeta. Las migraciones faltantes se aplicaron únicamente a la copia temporal para poder revisar pantallas autenticadas. **No se modificó código de producto, CSS, rutas, APIs, esquema, contratos KH ni dependencias. No se ejecutaron tests, ni se hizo commit o deploy.**
