# Backup y restore de SQLite

## Objetivos y alcance

- **RPO objetivo: 6 horas.** Con el timer activo, tras una pérdida total de la base se podrían perder como máximo aproximadamente seis horas de cambios desde el último backup periódico exitoso. Una ejecución fallida rompe el objetivo hasta recuperarse; no hay alertas nuevas.
- **RTO objetivo: 4 horas.** Es una meta de operación manual que incluye localizar/verificar la copia, restaurar, comprobar esquema y lecturas, activar la base y revisar `/login` y `/api/health`. El tiempo del host no se ha medido y no es un SLA.
- El diseño local usa SQLite y Python 3 `sqlite3` (stdlib), instalado ya por `scripts/provision.sh`. El propietario operativo es quien mantiene el VPS KetoHoy; el timer usa `ubuntu`, igual que `APP_USER` por defecto.

El backup pre-migración y el periódico son capas distintas. `scripts/deploy-release.sh` sigue haciendo `.backup` a `backups/pre-migration-*` antes de `prisma migrate deploy` y conserva diez copias por deploy. El periódico se ejecuta cada seis horas, independientemente de GitHub Actions, y conserva catorce días de copias con nombre UTC. Ambos escriben bajo `DEPLOY_PATH/backups` en el mismo host; esto ayuda ante migraciones y errores de aplicación, pero **no** protege frente a pérdida del disco/host.

## Programación e instalación

El deploy publica el ejecutable en `DEPLOY_PATH/shared/backup-db.py`, ubicación estable entre releases. Ubuntu/systemd está versionado en `scripts/ketohoy-backup.service` y `scripts/ketohoy-backup.timer`. El ejemplo usa el `APP_USER=ubuntu` y `DEPLOY_PATH=/home/ubuntu/ketohoy` por defecto de `scripts/provision.sh`. Si esos valores cambian, ajusta `User`, `Group`, `DATABASE_URL`, `BACKUP_DIR` y `ExecStart` antes de instalar.

Tras un deploy autorizado, instalar/configurar manualmente como administrador del host:

```sh
sudo install -m 0644 scripts/ketohoy-backup.service /etc/systemd/system/ketohoy-backup.service
sudo install -m 0644 scripts/ketohoy-backup.timer /etc/systemd/system/ketohoy-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now ketohoy-backup.timer
systemctl list-timers ketohoy-backup.timer
```

Estos comandos no se han ejecutado en el VPS. Hasta su instalación, el timer no existe operacionalmente. El timer usa UTC, `Persistent=true` para recuperar una ejecución perdida cuando el host vuelva, servicio oneshot y un `flock` no bloqueante: una ejecución concurrente falla claramente y systemd registra el código de salida. `umask` y permisos resultan en directorio `0700` y copias/lock `0600`; los backups no deben exponerse por web ni añadirse a Git. El proceso lee SQLite online mediante `Connection.backup()`, que incluye transacciones WAL; no detiene PM2.

Comprobación manual local (usa siempre una DB descartable):

```sh
DATABASE_URL=file:/ruta/absoluta/dev.db BACKUP_DIR=/ruta/absoluta/backups \
  python3 scripts/backup-db.py backup
systemctl status ketohoy-backup.service
journalctl -u ketohoy-backup.service
```

Un exit code distinto de cero significa fallo operativo del backup periódico. El script no registra URLs ni datos; escribe nombre de copia en stdout y error resumido en stderr. La retención solo corre después de publicar una copia nueva e íntegra; conserva las que tengan menos de 14 días y al menos la más reciente.

## Destino independiente

No hay proveedor, bucket, credencial ni destino fuera del host configurado en el repo. **Independent backup destination — operational configuration pending.** `BACKUP_DIR` permite ubicar el directorio en un volumen separado si el entorno ya dispone de uno, pero no se debe tratar otro directorio del mismo disco como protección off-host. No se suben copias automáticamente. Para satisfacer protección ante pérdida del host hace falta decidir un almacenamiento privado fuera del host, cifrado en tránsito/en reposo, credenciales y retención/expiración; entonces probar copia y restore desde ese destino y hacer fallar la operación si la transferencia falla. No se inventa un servicio ni se añade alerta.

## Restore seguro

El restore exige el archivo de copia y una ruta destino absoluta explícitos. El destino debe no existir; no hay `latest` ni opción que reemplace la DB activa. También exige `ACCOUNT_DELETION_LEDGER`, un archivo JSONL privado y externo a `BACKUP_DIR`; cada entrada se reaplica en el archivo temporal antes de verificar/publicar. Si falta el ledger o está mal formado, el comando falla sin crear el destino. Configúralo y presérvalo según [el contrato de ciclo de vida de cuenta](ACCOUNT-DATA-LIFECYCLE.md).

```sh
export ACCOUNT_DELETION_LEDGER=/home/ubuntu/ketohoy/shared/privacy/account-deletions.jsonl
python3 scripts/backup-db.py restore \
  /home/ubuntu/ketohoy/backups/ketohoy-20261006T120000000000Z.sqlite \
  /tmp/ketohoy-restore/verify.sqlite
```

Verifica primero `integrity_check`, `foreign_key_check`, tablas KetoHoy, consulta básica e historial `_prisma_migrations` incompleto. Copia también la historia de migraciones y no aplica migrations. El runbook no sustituye la base productiva; una activación real requiere mantenimiento y una decisión explícita del responsable.

### Recuperación ante desastre (solo procedimiento, no ejecutado)

1. Poner la app en mantenimiento/detener escrituras de forma coordinada.
2. Elegir una copia local u off-host autorizada y confirmar fecha, permisos y procedencia; recuperar el ledger de una fuente protegida independiente.
3. Configurar `ACCOUNT_DELETION_LEDGER` y restaurar a una ruta nueva; el comando reaplica los borrados antes de publicar. Nunca sobrescribir `dev.db`.
4. Comprobar integridad, claves foráneas, tablas, recuentos, `_prisma_migrations` y ausencia de cada `userId` del ledger.
5. Confirmar lecturas funcionales en la copia restaurada y revisar compatibilidad con el código desplegado; no correr migrations durante restore.
6. Cambiar manualmente `DATABASE_URL`/configuración de la app a la nueva DB, con backup previo y plan de vuelta atrás.
7. Arrancar/reload, comprobar `/login` y `/api/health`, validar datos funcionales y reabrir escrituras.

La activation real debe conservar la base original hasta completar healthcheck y lectura funcional. Rollback de código KH-011 no revierte el schema ni restaura datos.

## Drill y límites

`bash scripts/backup-db.test.sh` crea una DB en `/tmp`, aplica migrations reales, inserta sentinels sin datos personales, llama al backup y restore reales, altera/elimina sentinels, compara la historia de migrations y ejecuta integridad/FK/lecturas. Con un build disponible, `RUN_APP_HEALTH=1 bash scripts/backup-db.test.sh` además arranca esa aplicación sobre la DB restaurada y comprueba `/api/health` y `/login`.

El drill local prueba el primitive, no que el timer haya corrido durante días, que un host conserve permisos/espacio, que exista off-host, que RPO de producción se cumpla o que RTO de host sea cuatro horas. No se accedió a staging/VPS ni se tocó producción.

Backups contienen datos personales y preferencias alimentarias: restringir acceso al usuario del servicio y al administrador autorizado, mantenerlos fuera del document root y de Git, y verificar la privacidad del almacenamiento independiente antes de conectarlo. Borrar una cuenta activa **no** la elimina de backups históricos; KH-030 define la retención conocida y la reconciliación automática durante restore. Las copias pre-migración (diez por deploy) y la copia más reciente pueden durar más de catorce días, por lo que aún no existe un máximo global verificable.
