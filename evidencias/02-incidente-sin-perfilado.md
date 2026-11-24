# Evidencia 02: Incidente simulado sin perfilador activo

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 2 (El incidente sin perfilado)

## Ejecución y revisión

1. Estado inicial del perfilador como `admin` en `comercial`:
```javascript
db.getProfilingStatus()
```
```text
{ was: 0, slowms: 100, sampleRate: 1, ok: 1 }
```

2. Cambio simulado desde `app_ventas`:
```bash
mongosh "mongodb://app_ventas:<REDACTED>@127.0.0.1:27017/comercial?appName=app-ventas-web" --quiet --eval 'db.clientes.updateOne({ _id: 3 }, { $set: { rfc: "GAMA780912XXX" } })'
```
```text
{
  acknowledged: true,
  insertedId: null,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0
}
```

3. Búsqueda de evidencia en `system.profile` y en la bitácora de `mongod`:
```javascript
db.system.profile.countDocuments()
bitacora().filter(e => JSON.stringify(e).includes("GAMA780912XXX")).length
bitacora().filter(e => JSON.stringify(e).includes("app-ventas-web")).map(e => ({ t: e.t, c: e.c, ctx: e.ctx, msg: e.msg }))
```

Resultado obtenido:

```text
system.profile count: 0
bitacora GAMA780912XXX count: 0
bitacora app-ventas-web:
[
  { t: { '$date': '2026-11-24T12:55:56.789+00:00' }, c: 'NETWORK', ctx: 'conn16', msg: 'client metadata' },
  { t: { '$date': '2026-11-24T12:55:56.789+00:00' }, c: 'ACCESS',  ctx: 'conn16', msg: 'Connection not authenticating' },
  { t: { '$date': '2026-11-24T12:55:56.798+00:00' }, c: 'NETWORK', ctx: 'conn17', msg: 'client metadata' },
  { t: { '$date': '2026-11-24T12:55:56.810+00:00' }, c: 'ACCESS',  ctx: 'conn17', msg: 'Successfully authenticated' },
  { t: { '$date': '2026-11-24T12:55:56.931+00:00' }, c: 'NETWORK', ctx: 'conn18', msg: 'client metadata' },
  { t: { '$date': '2026-11-24T12:55:56.933+00:00' }, c: 'NETWORK', ctx: 'conn19', msg: 'client metadata' },
  { t: { '$date': '2026-11-24T12:55:57.011+00:00' }, c: 'ACCESS',  ctx: 'conn18', msg: 'Successfully authenticated' },
  { t: { '$date': '2026-11-24T12:55:57.012+00:00' }, c: 'ACCESS',  ctx: 'conn19', msg: 'Successfully authenticated' }
]
```

El conteo en `system.profile` y la búsqueda de `"GAMA780912XXX"` dieron `0`. La bitácora únicamente dejó registro de la conexión y autenticación de `app-ventas-web`, no de la operación `updateOne`.

## Respuestas

1. **¿Puedes demostrar qué cambió? ¿Y quién se conectó a esa hora?**  
   No se puede demostrar qué cambió ni en qué documento, porque el perfilador estaba apagado (`was: 0`) y `mongod` no registra escrituras rápidas en su log estándar. Lo único comprobable con la bitácora es quién se conectó: a las `2026-11-24T12:55:56.810+00:00` se autenticó `app_ventas` desde `app-ventas-web` en `conn17` (seguido de `conn18` y `conn19`), sin evidencia de qué sentencias ejecutó.

2. **¿Por qué `mongosh` abre varias conexiones (`conn16`, `conn17`, …) para una sola instrucción? ¿Cuál es la que se autentica?**  
   Porque el driver interno de `mongosh` abre primero una conexión de monitoreo/topología para leer metadatos sin autenticarse (`conn16`, donde aparece `Connection not authenticating`) y después abre conexiones del pool de trabajo que sí completan el saludo SCRAM (`conn17`, `conn18` y `conn19` con `Successfully authenticated`).
