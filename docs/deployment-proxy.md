# Despliegue detrás de Caddy: proxy, cabeceras y cookies

## Topología

```
Internet ──443──▶ Caddy (TLS automático) ──▶ 127.0.0.1:3000 (Next.js, PM2)
```

- La app escucha **solo en 127.0.0.1** (PM2 inicia Next con `-H 127.0.0.1`, ver `deploy.yml`). El firewall (`ufw`) abre solo SSH, 80 y 443. Si se expone el puerto 3000, `X-Forwarded-For` pasa a ser controlado por el cliente y el limitador de peticiones deja de servir.
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

## Variables de entorno de producción (`shared/.env.local`, la escribe el deploy)

| Variable | Valor | Para qué |
|---|---|---|
| `APP_URL` | `https://<dominio>` | URL canónica, sitemap, enlaces de los emails y `upgrade-insecure-requests` en la CSP. Nunca se deriva de la cabecera `Host`. |
| `COOKIE_SECURE` | `true` | Cookie de sesión con atributo `Secure`. |
| `DATABASE_URL` | `file:<DEPLOY_PATH>/dev.db` | SQLite persistente fuera de cada release. |
| `RESEND_API_KEY` | Secret de GitHub Actions | Envío de correos de verificación y recuperación mediante Resend. |

## Releases, despliegue y rollback

El deploy conserva `DEPLOY_PATH` como raíz de operación. Los releases se preparan en `releases/<commit>-<run>-<attempt>/`; `current` y `previous` son symlinks dentro de esa raíz. `node_modules` y `.next` pertenecen al release. `.env.local` enlaza a `shared/.env.local`; la SQLite existente `dev.db` y las copias pre-migración de `backups/` quedan fuera de los releases. El workflow serializa el entorno de producción con GitHub Actions concurrency.

El workflow sincroniza el checkout en un directorio de release nuevo, instala con `npm ci`, genera Prisma y construye antes de migrar o cambiar `current`. Conserva una copia del despliegue previo como primer release de rollback. Antes de migrar, crea un backup SQLite consistente y conserva diez copias. Un release candidato se inicia en loopback con otro puerto y debe responder en `/login` y `/api/health`; este último solo ejecuta `SELECT 1` y devuelve `{ "status": "ok" }` o HTTP 503. Tras pasar la prueba, el workflow sustituye `current` mediante rename atómico, recarga PM2 y comprueba la app local y el proxy HTTPS. Los cinco releases más recientes se conservan, además de `current` y `previous`. El proceso PM2 permanece en modo fork y puede causar una ventana breve de indisponibilidad al reiniciar; el tráfico real debe verificarse en staging.

El deploy no ejecuta la seed automáticamente: actualiza productos y recetas del catálogo y reemplaza ingredientes de las recetas sembradas. Para un bootstrap inicial, ejecuta `npx prisma db seed` desde el release seleccionado con `DATABASE_URL=file:<DEPLOY_PATH>/dev.db`; la seed conserva su guardia `SEED_RESET` y nunca la actives en una BD que quieras mantener.

Los backups periódicos son independientes del deploy: consulta el [runbook de backup y restore](BACKUP-RESTORE.md) para el timer cada seis horas, retención de catorce días, restore desechable y límites del destino local/off-host. El backup pre-migración descrito arriba sigue siendo una protección separada.

Fallo de sync, instalación, build, migración o healthcheck previo: `current` no cambia. Si falla la activación o la comprobación posterior, el script vuelve `current` al release anterior y recarga PM2. Investiga el log del workflow antes de volver a desplegar; un release fallido se conserva para diagnóstico, pero no se sirve.

Rollback manual al release anterior desde el VPS, como el usuario de PM2:

```bash
cd "$DEPLOY_PATH"
DEPLOY_PATH="$PWD" PM2_APP_NAME="<nombre PM2>" bash shared/rollback-release.sh
```

Ejecuta el rollback cuando no haya un deploy en curso.

El comando cambia `current`, aplica la configuración PM2 del `current` resultante y comprueba `/api/health`. No ejecuta `migrate down` ni restaura automáticamente SQLite. Una reversión de código solo es segura si ese código tolera el schema ya migrado. Si una migración falla o necesita revertir datos/schema, detén la app y sigue un procedimiento de restore aprobado usando una copia pre-migración; comprueba integridad y lecturas antes de volver a servir tráfico.

Las migraciones deben mantener compatibilidad con el release anterior durante el cambio. Cambios incompatibles requieren expand/contract y un procedimiento operativo específico antes de desplegarlos. El workflow no puede hacer seguro automáticamente un DDL destructivo.

### Legacy sin historial Prisma

El baseline histórico fijo solo incluye estos tres migrations que existían al introducir `migrate deploy` en `b9d35ed` (10 de septiembre de 2026):

* `20260629183529_init`
* `20260630183957_add_recipe_image_url`
* `20260705173000_unique_mercadona_id`
* `20260629183529_init`
* `20260630183957_add_recipe_image_url`
* `20260705173000_unique_mercadona_id`

Son la historia versionada anterior al primer deploy con Prisma tracking. El corte precede a usuarios y a todas las migraciones posteriores, para que sus DDL y transformaciones de datos se ejecuten de verdad. El helper compara tablas, columnas, claves foráneas e índices con snapshots reconstruidos desde esos SQL. Un schema vacío usa migraciones normales; una historia tracked debe ser un prefijo completo y coincidir con el schema reconstruido. Un snapshot legacy solo se baselinea si coincide exactamente con un prefijo de la allowlist.

Si la DB antigua tiene columnas de términos u otros cambios posteriores al corte, o un objeto inesperado, el deploy aborta antes de activar el release. No amplíes la allowlist sin evidencia de un snapshot histórico y una fixture desechable. Las migrations posteriores, incluidas términos y `20261006120000_data_uniqueness`, se aplican con `prisma migrate deploy`. Una fila que dice que KH-034 ya se aplicó pero no tiene sus índices se considera inconsistente y aborta para revisión manual; no se inventa historial ni se reescribe una DB tracked ambigua. La matriz local y sus límites están en `IMPLEMENTATION-PROGRESS.md`.

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
