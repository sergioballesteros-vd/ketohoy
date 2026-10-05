# Need vs package

When recipe need is known, the row says `Necesitas 300 g`. If package data is reliable, a separate secondary line says `Envase 500 g · Compra 1 paquete`. These are distinct concepts: culinary quantity and package/purchase quantity. No purchase quantity is derived from recipe need.

When both need and package are unknown, one compact `Cantidad y envase por confirmar` message replaces duplicate unknown labels. When only one side is unknown, only that side is called out. Unknown values never become zero or guessed package sizes.

This is a clearer semantic separation and passes assertions in the populated browser fixture. A two-second reading task has not been run with people, so comprehension is **NOT YET** validated as a reusable pattern.
