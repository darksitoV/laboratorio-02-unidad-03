# Evidencia 04: Reducción de volumen mediante filtro en el perfilador

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 4 (Reducir el volumen con un filtro)

## Configuración del filtro y prueba

Después de guardar los resultados de la Actividad 3, en la base `comercial` como `admin` se apagó, limpió y reconfiguró el perfilador en nivel 1 con filtro de escrituras:

```javascript
db.setProfilingLevel(0)
db.system.profile.drop()
db.setProfilingLevel(1, { filter: { op: { $in: ["insert", "update", "remove"] } } })
db.getProfilingStatus()
```

```text
{
  was: 1,
  slowms: 100,
  sampleRate: 1,
  filter: { op: { '$in': [ 'insert', 'remove', 'update' ] } },
  note: 'When a filter expression is set, slowms and sampleRate are not used for profiling and slow-query log lines.',
  ok: 1
}
```

Prueba desde `app_ventas` ejecutando una lectura y una actualización:
```bash
mongosh "mongodb://app_ventas:<REDACTED>@127.0.0.1:27017/comercial?appName=app-ventas-web" --quiet --eval 'db.clientes.find({ _id: 1 }).toArray(); db.clientes.updateOne({ _id: 1 }, { $set: { telefono: "6670000000" } })'
```

Consulta en `system.profile`:
```javascript
db.system.profile.find({}, { op: 1, ns: 1, user: 1, client: 1, appName: 1, "command.q": 1, "command.u": 1, ts: 1 })
```

```text
[
  {
    op: 'update',
    ns: 'comercial.clientes',
    command: { q: { _id: 1 }, u: { '$set': { telefono: '6670000000' } } },
    ts: ISODate('2026-11-24T12:56:02.416Z'),
    client: '127.0.0.1',
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  }
]
```

El `find({ _id: 1 })` no se registró; solo aparece la operación `update`.

## Respuestas

1. **¿Qué perdiste de evidencia al aplicar el filtro? ¿Qué ganaste?**  
   Se perdió la visibilidad sobre consultas de lectura (`query`) y comandos administrativos/agregaciones (por ejemplo ya no consta que la aplicación consultó al cliente `_id: 1`). Se ganó disminuir el volumen de documentos escritos en `system.profile` (colección fija de 1 MB) y evitar el impacto en rendimiento de registrar cada `find` normal.

2. **¿Qué filtro usarías si solo interesaran operaciones sobre la colección `clientes`?**  
   Filtraría por el espacio de nombres completo: `{ ns: "comercial.clientes" }`, o combinado con escrituras si no se desean lecturas: `{ ns: "comercial.clientes", op: { $in: ["insert", "update", "remove"] } }`.
