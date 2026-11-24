# Evidencia 03: Activación del perfilador nivel 2 y lectura de `system.profile`

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 3 (Activar el perfilador y registrar operaciones)

## Ejecución y documentos capturados

En `comercial` como `admin`:
```javascript
db.setProfilingLevel(2)
db.getProfilingStatus()
```
```text
{ was: 0, slowms: 100, sampleRate: 1, ok: 1 }
{ was: 2, slowms: 100, sampleRate: 1, ok: 1 }
```
La primera llamada regresó `was: 0` (el nivel previo) y la segunda confirmó `was: 2`.

Operaciones ejecutadas por `app_ventas`:
```bash
mongosh "mongodb://app_ventas:<REDACTED>@127.0.0.1:27017/comercial?appName=app-ventas-web" --quiet --eval 'db.clientes.find({ ciudad: "Culiacán" }, { nombre: 1, ciudad: 1 }).toArray(); db.clientes.updateOne({ _id: 3 }, { $set: { rfc: "GAMA780912XYZ" } }); db.clientes.deleteOne({ _id: 2 });'
```

Consulta en `db.system.profile` antes de reiniciar o borrar la colección:
```javascript
db.system.profile.find(
  { ns: "comercial.clientes" },
  { op: 1, ns: 1, command: 1, user: 1, client: 1, appName: 1, ts: 1, millis: 1, nreturned: 1, docsExamined: 1, nModified: 1, ndeleted: 1 }
).sort({ ts: 1 })
```

Salida observada:

```text
[
  {
    op: 'query',
    ns: 'comercial.clientes',
    command: { find: 'clientes', filter: { ciudad: 'Culiacán' }, projection: { nombre: 1, ciudad: 1 }, ... },
    docsExamined: 5,
    nreturned: 3,
    millis: 0,
    ts: ISODate('2026-11-24T12:55:59.735Z'),
    client: '127.0.0.1',
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  },
  {
    op: 'update',
    ns: 'comercial.clientes',
    command: { q: { _id: 3 }, u: { '$set': { rfc: 'GAMA780912XYZ' } }, multi: false, upsert: false },
    docsExamined: 1,
    nModified: 1,
    millis: 0,
    ts: ISODate('2026-11-24T12:55:59.747Z'),
    client: '127.0.0.1',
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  },
  {
    op: 'remove',
    ns: 'comercial.clientes',
    command: { q: { _id: 2 }, limit: 1 },
    docsExamined: 1,
    ndeleted: 1,
    millis: 0,
    ts: ISODate('2026-11-24T12:55:59.750Z'),
    client: '127.0.0.1',
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  }
]
```

## Interpretación de los documentos (Sección 9.1)

| # | op | Usuario | Cliente | Aplicación | Momento | Qué hizo | Documentos afectados |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `query` | `app_ventas@comercial` | `127.0.0.1` | `app-ventas-web` | `2026-11-24T12:55:59.735Z` | `find` en `clientes` con filtro `{ ciudad: 'Culiacán' }` | Examinó 5, devolvió 3 |
| 2 | `update` | `app_ventas@comercial` | `127.0.0.1` | `app-ventas-web` | `2026-11-24T12:55:59.747Z` | `updateOne` al `_id: 3` cambiando `rfc` a `GAMA780912XYZ` | Examinó 1, modificó 1 |
| 3 | `remove` | `app_ventas@comercial` | `127.0.0.1` | `app-ventas-web` | `2026-11-24T12:55:59.750Z` | `deleteOne` con filtro `{ _id: 2 }` | Examinó 1, eliminó 1 |

## Respuestas

1. **¿Puedes saber cuál era el RFC antes del cambio con la información de `system.profile`?**  
   No. El perfilador guarda únicamente el documento `command` que llegó en la petición (`u: { $set: { rfc: 'GAMA780912XYZ' } }`), no conserva el valor previo del campo modificado.

2. **¿Puedes saber qué datos tenía el documento eliminado?**  
   No. En la operación `remove` solo queda el criterio `q: { _id: 2 }`, así que no hay registro en `system.profile` de qué nombre, RFC o correo tenía Carlos Pérez antes del borrado.

3. **A diferencia de `log_statement = 'mod'` en PostgreSQL, el nivel 2 sí registró la consulta. ¿Qué ventaja y qué riesgo tiene eso?**  
   La ventaja es saber quién está leyendo datos o qué filtros usa sin instalar módulos extra. El riesgo es que penaliza el rendimiento al registrar cada lectura, agota mucho más rápido el límite de 1 MB de `system.profile` y termina guardando valores personales que vayan dentro de los filtros `filter` de las consultas.

4. **¿Por qué el campo `user` incluye `@comercial`?**  
   Porque en MongoDB cada cuenta de usuario vive asociada a una base de datos de autenticación (`authSource`); incluir `@comercial` distingue al usuario `app_ventas` creado en `comercial` de otra cuenta homónima que pudiera existir en `admin` u otra base.
