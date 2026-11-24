# Evidencia 06: Correlación de cambio de configuración con su autor

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 6 (Correlacionar un cambio de configuración con su autor)

## Eventos observados y correlación por `ctx`

Búsqueda de cambios al perfilador en `bitacora()`:
```javascript
bitacora()
  .filter(e => e.msg === "Profiler settings changed")
  .map(e => ({ t: e.t, ctx: e.ctx, msg: e.msg, attr: e.attr }))
```

Último evento correspondiente a la activación del filtro en la Actividad 4:

```text
{
  t: { '$date': '2026-11-24T12:56:01.071+00:00' },
  ctx: 'conn31',
  msg: 'Profiler settings changed',
  attr: {
    from: { level: 0, slowms: 100, sampleRate: 1 },
    to: {
      level: 1,
      slowms: 100,
      sampleRate: 1,
      filter: { op: { '$in': [ 'insert', 'remove', 'update' ] } }
    },
    db: 'comercial'
  }
}
```

Como la línea anterior no incluye el nombre del usuario, se buscó la autenticación de la conexión `conn31`:
```javascript
bitacora()
  .filter(e => e.ctx === "conn31" && e.msg === "Successfully authenticated")
  .map(e => ({ t: e.t, ctx: e.ctx, user: e.attr.user, db: e.attr.db, client: e.attr.client }))
```

```text
[
  {
    t: { '$date': '2026-11-24T12:56:01.017+00:00' },
    ctx: 'conn31',
    user: 'admin',
    db: 'admin',
    client: '127.0.0.1:53638'
  }
]
```

## Respuestas

1. **¿Qué usuario cambió la configuración del perfilador? ¿Qué dos eventos lo demuestran?**  
   El usuario `admin@admin` desde `127.0.0.1:53638`. Lo demuestran: el evento `Successfully authenticated` de `conn31` (`2026-11-24T12:56:01.017+00:00`) con `user: 'admin'` y el evento `Profiler settings changed` ocurrido 54 ms después en la misma conexión `ctx: 'conn31'`.

2. **¿Qué condición debe cumplirse para que esta correlación sea válida?**  
   Que ambos eventos pertenezcan al mismo arranque continuo de `mongod` y permanezcan dentro de la bitácora sin reinicios en medio. Al reiniciar el servidor, los números de conexión (`conn1`, `conn2`...) se reinician y un mismo `ctx` en distinto arranque puede pertenecer a otro usuario y otro momento.

3. **¿Por qué es relevante que quede registrado un cambio de configuración del propio mecanismo de registro?**  
   Porque si un administrador o atacante con privilegios desactiva el perfilador (`level: 0`) o altera su filtro para ocultar modificaciones posteriores, ese cambio queda marcado con hora exacta y conexión de origen, ayudando a detectar cuándo dejó de registrarse evidencia.
