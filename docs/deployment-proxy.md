# Despliegue detrás de Caddy: proxy, cabeceras y cookies

## Topología

```
Internet ──443──▶ Caddy (TLS automático) ──▶ 127.0.0.1:3000 (Next.js, PM2)
```

- La app escucha **solo en 127.0.0.1** (`pm2 start … -H 127.0.0.1`, ver `deploy.yml`). El firewall (`ufw`) abre solo SSH, 80 y 443. Si se expone el puerto 3000, `X-Forwarded-For` pasa a ser controlado por el cliente y el limitador de peticiones deja de servir.
- `scripts/provision.sh` escribe el `Caddyfile`:

```caddyfile
ketohoy.es {
	encode gzip
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Forwarded-For {remote_host}
	}
}
```

`header_up X-Forwarded-For {remote_host}` **sustituye** la cabecera por la IP real del par que se conectó a Caddy, en lugar de añadirla a lo que mande el cliente. En un servidor ya aprovisionado hay que editar `/etc/caddy/Caddyfile` a mano y ejecutar `sudo systemctl reload caddy` (`provision.sh` solo se ejecuta una vez por servidor).

Si delante de Caddy hubiera otro proxy (Cloudflare, un balanceador), Caddy vería la IP de ese proxy: habría que configurar `trusted_proxies` en Caddy y cambiar `header_up` para reenviar la IP del cliente.

## IP del cliente y límite de peticiones

`src/lib/rateLimit.ts` toma la **última** entrada de `X-Forwarded-For` (la que añade el proxy más cercano). Con la configuración anterior la cabecera trae un único valor. Límites actuales (por IP y por familia de rutas):

| Ruta | Límite |
|---|---|
| `/api/auth/login`, `/register` | 10 / min |
| `/api/auth/forgot` | 5 / min |
| `/api/auth/reset`, `/verify` | 10 / min |
| `/api/auth/resend-verification` | 3 / min |
| `/api/mercadona/*` | según ruta |

El contador vive en memoria de un solo proceso (un único PM2). Si algún día hay varias instancias, hace falta un almacén compartido.

## Variables de entorno de producción (`.env.local`, la escribe `deploy.yml`)

| Variable | Valor | Para qué |
|---|---|---|
| `APP_URL` | `https://<dominio>` | URL canónica, sitemap, enlaces de los emails y `upgrade-insecure-requests` en la CSP. Nunca se deriva de la cabecera `Host`. |
| `COOKIE_SECURE` | `true` | Cookie de sesión con atributo `Secure`. |
| `DATABASE_URL` | `file:./dev.db` | SQLite. |

## Cabeceras de seguridad

- **`next.config.ts`** (todas las respuestas, también redirecciones y errores de API): `Strict-Transport-Security` (1 año, sin `includeSubDomains`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara, micrófono, geolocalización, pagos y USB desactivados), `Cross-Origin-Opener-Policy: same-origin`. `poweredByHeader` desactivado. `Cache-Control: no-store` en las páginas (no en los estáticos).
- **`src/proxy.ts`** (páginas, no API): `Content-Security-Policy` con nonce nuevo por petición.

CSP y orígenes reales:

| Directiva | Valor | Motivo |
|---|---|---|
| `script-src` | `'self' 'nonce-…' 'strict-dynamic'` | Next estampa el nonce en sus scripts. En desarrollo añade `'unsafe-eval'`. |
| `style-src` | `'self' 'unsafe-inline'` | Hay atributos `style=""` en los componentes. |
| `font-src` | `'self'` | Syne y DM Sans las autoaloja `next/font` en el build. |
| `img-src` | `'self' data: blob:` | Las fotos (Mercadona, Unsplash) pasan por `/_next/image`, así que no hace falta abrir sus dominios. |
| `connect-src` | `'self'` | Todo `fetch` es del mismo origen. Open Food Facts, Mercadona y Unsplash se llaman solo desde el servidor. |
| `object-src`, `frame-ancestors` | `'none'` | Sin plugins ni iframes ajenos. |
| `base-uri`, `form-action` | `'self'` | |
| `upgrade-insecure-requests` | solo si `APP_URL` es https | Si no, rompería pruebas en `http://localhost`. |

Al añadir un servicio externo al navegador (analítica, mapas, otra fuente…) hay que añadir su dominio a la directiva correspondiente en `src/proxy.ts`; si no, el navegador lo bloqueará y lo registrará en consola como violación de CSP.

## Cookies y CSRF

- Sesión: `httpOnly`, `sameSite=lax`, `Secure` con `COOKIE_SECURE=true`, 30 días. En base de datos se guarda solo el hash sha256 del token.
- Las peticiones que cambian datos son `POST`/`PATCH`/`DELETE` con cuerpo JSON. Con `SameSite=Lax` el navegador no envía la cookie en peticiones cross-site de esos métodos, lo que cubre el CSRF habitual.
- Restablecer la contraseña cierra todas las sesiones del usuario.

## Comprobación tras desplegar

```bash
curl -sI https://<dominio>/login | grep -iE 'content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy|x-powered-by'
```

Debe mostrar todas menos `x-powered-by`. `deploy.yml` falla el despliegue si faltan `Content-Security-Policy` o `Strict-Transport-Security`.
