# Pendientes antes y después de producción

Nada de esta lista está resuelto. Se documenta para que no se dé por hecho.

## Pasos manuales antes de desplegar

1. **Secret `APP_DOMAIN`** en GitHub Actions (dominio sin `https://`). `deploy.yml` lo usa para escribir
   `APP_URL=https://<dominio>` en `.env.local`; sin él, el canonical, el sitemap y los enlaces de los emails
   salen con `localhost:3000`.
2. **Caddy del servidor ya aprovisionado**: `scripts/provision.sh` solo corre una vez, así que el servidor
   actual no recibe el cambio. Editar `/etc/caddy/Caddyfile` a mano:

   ```
   reverse_proxy 127.0.0.1:3000 {
       header_up X-Forwarded-For {remote_host}
   }
   ```

   y `sudo systemctl reload caddy`. Sin esto el límite de peticiones lee una IP que controla el cliente.
3. Que la app **no** sea alcanzable directamente en el puerto 3000 desde fuera (solo `127.0.0.1`).
4. Comprobar tras el despliegue (ver `docs/deployment-proxy.md`): cabeceras `content-security-policy` y
   `strict-transport-security`, `/robots.txt` con el dominio real y `/sitemap.xml`.
5. `prisma migrate deploy` aplica dos migraciones nuevas: `auth_tokens` y `product_nutrition_source`.

## Pendiente de producto o infraestructura

- **Proveedor real de email.** Hoy `src/lib/mailer.ts` escribe el correo en la consola del servidor, incluidos
  los enlaces de recuperación y de confirmación: tratar esos logs como sensibles hasta cambiarlo.
- **Secrets y configuración del email** (API key, remitente, dominio verificado con SPF/DKIM). No existen aún.
- **Límite de intentos por cuenta.** El limitador es solo por IP y en memoria (una instancia). No hay bloqueo
  por email ni por cuenta.
- **Confirmación de email opcional.** No bloquea ninguna función; solo se ofrece desde Preferencias.
- **Decisión de producto: clasificación de la leche.** Sigue saliendo como «Keto» por la puntuación de su
  categoría. Cambiarlo es decisión de producto, no se ha tocado.

## Sin probar

- Toque real en iOS y Android (solo viewports de escritorio emulados a 320, 390 y 1440 px).
- Lector de pantalla real (VoiceOver, TalkBack).
- Despliegue real detrás de Caddy (el comportamiento se comprobó en local, no en el servidor).

## Límites conocidos

- `style-src 'unsafe-inline'` en la CSP: hay atributos `style=""` que un nonce no cubre.
- Si una página pasa a ser estática, el nonce de la CSP dejaría de aplicarse a sus scripts.
- HSTS a 1 año sin `includeSubDomains` ni `preload`.
