# Evidencia 08: Conservación de evidencias, reinicio y exportación con SHA-256

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 8 (Conservación: exportar antes de perder)

## Exportación previa al reinicio y comprobación posterior

Antes de reiniciar el contenedor se exportaron ambos archivos en UTF-8:
* `bitacora.length` antes de reiniciar: `333` (en el momento de exportar `evidencias/bitacora-mongod.log` ya contenía `374` líneas JSON).
* `db.system.profile.countDocuments()` antes de reiniciar: `2`.

Comandos usados para exportar y calcular integridad:
```bash
mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --eval 'EJSON.stringify(db.system.profile.find({}, { op: 1, ns: 1, user: 1, client: 1, appName: 1, ts: 1, "command.q": 1, "command.u": 1 }).toArray(), null, 2)' > evidencias/system-profile.json
mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --eval 'db.adminCommand({ getLog: "global" }).log.join("\n")' > evidencias/bitacora-mongod.log
```
```powershell
Get-FileHash evidencias/system-profile.json -Algorithm SHA256
Get-FileHash evidencias/bitacora-mongod.log -Algorithm SHA256
```

Resúmenes guardados en [`hashes.sha256`](hashes.sha256):
```text
14e133581b557dc5d6a0a1b9c92527ff53229e5a7ceca192eb4dbaf343be16c5  system-profile.json
62cd8f0964748c5aa2a53b9a17de80b3013353e5cf173f2f9c8167ab12056c19  bitacora-mongod.log
```

*(Nota: se mantuvieron las opciones por defecto del contenedor sin añadir un `mongod.conf` persistente de la sección 14.1, ya que esa sección aclara que no es obligatorio y `operationProfiling.mode: all` penaliza el desempeño. Con `systemLog.destination: file` y `logAppend: true` la bitácora sobreviviría al reinicio en archivo).*

Después se reinició el contenedor (`podman restart dba-u3-mongo`) y se consultó el estado al volver a conectar:

```javascript
db.getProfilingStatus()
db.system.profile.countDocuments()
bitacora().length
```

```text
{ was: 0, slowms: 100, sampleRate: 1, ok: 1 }
system.profile count despues: 2
bitacora.length despues: 101
```

Al reiniciar, el nivel del perfilador volvió a `0` (`was: 0`), aunque los `2` documentos ya escritos siguieron en `system.profile`. En cambio, la memoria de `getLog` se vació por completo y empezó de nuevo solo con los `101` eventos del arranque.

## Respuestas

1. **Menciona tres formas en que la evidencia del perfilador o de la bitácora puede perderse sin que nadie la borre deliberadamente.**  
   1) `system.profile` llega a su límite por defecto de 1 MB y comienza a sobrescribir los documentos más viejos.  
   2) Un reinicio de `mongod` borra los eventos en memoria de `getLog` (cuando no escribe a archivo en disco) y regresa el perfilador a nivel `0`.  
   3) Superar los 1024 eventos recientes en `getLog` hace que los mensajes antiguos salgan del búfer circular en RAM.

2. **¿Por qué el tamaño de 1 MB de `system.profile` es un problema de conservación y no solo de espacio?**  
   Porque es una colección limitada (*capped*): al llenarse no avisa ni bloquea escrituras, sino que elimina en silencio las operaciones más antiguas para guardar las nuevas. En un servidor con carga normal, la evidencia de un incidente puede desaparecer en minutos u horas por simple rotación.

3. **¿Por qué `getLog` sirve para interpretar pero no para conservar?**  
   Porque solo devuelve los últimos 1024 eventos que `mongod` mantiene en memoria temporal en ese momento; no conserva histórico completo de sesiones pasadas ni resiste un reinicio del servicio.
