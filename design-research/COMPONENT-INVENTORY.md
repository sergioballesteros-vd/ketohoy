# Inventario de componentes y patrones

La evaluación combina capturas actuales de landing y flujos autenticados (plan, receta, compra, despensa, catálogo, comidas, preferencias y sheets), lectura del código indexado y contratos descritos en la auditoría. La ergonomía física, contraste medido, teclado/lector y motion requieren validación durante implementación.

| Clasificación | Elemento | Decisión y motivo |
|---|---|---|
| KEEP | Controles de formulario de login: label, input, password visibility, recuperar contraseña | Orden familiar y campos grandes a 390. Mantener labels persistentes, error inline y foco; compactar marca/espacio, revisar lectura del aviso. |
| KEEP | CTA de acción primaria de alto contraste | Landing enseña bien “Crear cuenta gratis”. Mantener una acción primaria; reducir presencia repetida si hay varias dentro de un screen. |
| KEEP | Toast con acción contextual | Undo/retry es necesario en tienda y mutaciones; acción debe mantener intención, expirar de forma clara y ser anunciado. |
| KEEP | Skeleton con geometría próxima al contenido | Conserva contexto de carga; mensajes/error y retry deben ser diferentes al estado vacío. |
| REFINE | Tipografía global | Actual es legible en landing. Añadir escala semántica y números tabulares/jerarquía explícita para cantidades y labels. |
| REFINE | Botones/touch areas | Ajustar targets consistentes a ≥44 px, variantes primary/secondary/quiet/danger y foco AA. |
| REFINE | RecipeCard | Concepto adecuado para Explore/Meals. Uniformar crops/ratio, títulos enteros donde selección depende del nombre, limitar metadata y diferenciar sin imagen. |
| REFINE | Navigation | Mantener rutas funcionales, recalibrar orden móvil alrededor de Inicio/Plan/Compra/Despensa; explorar no debe ser difícil de hallar. Comprobar desktop. |
| REFINE | KetoBadge/KetoNote | Mantener evidencia y etiqueta; tipo y confianza legibles, nunca solo color ni certeza superior a source. |
| REFINE | Empty states / alertas / estados de carga | Copy y CTA específicos por contexto: sin plan, plan incompleto, compra vacía, unknown de disponibilidad y falla recuperable. |
| REDESIGN | Weekly plan | Transformar listado completo en resumen de semana + foco de día + slots compactos. Conservar replace local, meal slot, status y action global.
| REDESIGN | Shopping list row and grouping | Priorizar nombre, cantidad, unidad de compra elegida si existe, estado y check. Agrupar por zona revisable; mostrar fuente de plan y unknown bajo demanda; undo visible.
| REDESIGN | Home autenticada | Síntesis de qué toca hoy, qué necesita atención y CTA siguiente. Evitar conteos/tiles múltiples estilo admin. |
| REDESIGN | Recipe detail | Flujo cocinar: porciones/cantidades, disponibilidad por ingrediente, pasos que se pueden seguir, faltantes; hero compacto. |
| REDESIGN | Pantry information architecture | Búsqueda, grupos, cantidad/stock, expiry cuando relevante y add action. Acomodar listas largas sin “product catalog” como defecto. |
| REDESIGN | Explore/catalog listing | Tratar como descubrimiento/alacena, no ficha e-commerce: filtros, estado keto con confianza, disponibilidad de origen y CTA transparente pantry/list. |
| REDESIGN | Onboarding/preferences | Secuenciar restricciones y preferencias; mostrar por qué se pregunta; usar progreso y defaults explícitos; revisar estados dirty/saved según contrato.
| REDESIGN | Landing | Añadir muestra concreta del ciclo plan/receta/lista, fotografías coherentes y cierre con CTA. No empujar todo el contenido hacia receta-card grid. KH-043 está pendiente.
| REMOVE | Adorno/repetición sin nueva decisión | No se identificó una instancia visual auténtica con evidencia suficiente en las pantallas no accesibles. Revisión posterior debe usar regla: si no informa, no agrupa, ni inicia una acción, eliminar.
| NEW | Estado legible de disponibilidad con 4 resultados | `sufficient / insufficient / unknown / missing`, texto+icono+color y detalle de cantidad por validar, sin colapsar status.
| NEW | Quantity stack visual | Campos alineados para necesidad culinaria, stock despensa, cantidad faltante/compra y paquete elegido, cuando la superficie los necesita; ocultar los irrelevantes en la fila compacta.
| NEW | Plan week summary / day selector | 7 días de contexto con focus date y señal de slots completos/pendientes; día seleccionable y ancla no engañosa de “hoy” (KH-044).
| NEW | Shopping item source disclosure | Acceso del item a sus source slots/recipes; mostrar revisión necesaria y estado confirmed. Mantener lista scan-first.
| NEW | Search/empty/error state patterns | Input persistent en pantry/catalog, query y clear, resultados obsoletos nunca visibles, error con retry; basados en KH-018/029 y estado implementado.
| NEW | Focus/row transition contract | Pautas de insertion/removal/reorder, foco y undo en web; atender KH-040/041 antes de rehacer motion global.

## Composición recomendada

- **Card** solo para elección visual de receta/producto en Explore; no en toda celda de plan.
- **Fila** para ingredientes/lista/despensa; alinea nombre/cantidad/estado y deja expansión para datos fuente.
- **Chips** para filtros activos o preferencias pocas; no como navegación completa ni forma de comunicar nutrition.
- **Sheet** para editar un item o swap sencillo; formulario largo se convierte en pantalla con contexto/foco conservado.
- **Bottom navigation** para destinos diarios principales en móvil; no esconder Compra bajo un menú cuando el usuario está en tienda.
