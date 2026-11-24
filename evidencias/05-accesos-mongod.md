# Evidencia 05: Accesos fallidos y exitosos en la bitácora de `mongod`

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 5 (Accesos en la bitácora de mongod)

## Pruebas de autenticación

Intentos fallidos sin especificar `appName`:
```bash
mongosh "mongodb://app_ventas:<REDACTED>@127.0.0.1:27017/comercial" --quiet --eval "db.clientes.countDocuments()"
mongosh "mongodb://usuario_inexistente:<REDACTED>@127.0.0.1:27017/comercial" --quiet --eval "db.clientes.countDocuments()"
```
```text
MongoServerError: Authentication failed.
MongoServerError: Authentication failed.
```

Filtro de fallos en `bitacora()` (sesión `admin`):
```javascript
bitacora()
  .filter(e => e.c === "ACCESS" && e.msg === "Failed to authenticate")
  .map(e => ({ t: e.t, id: e.id, ctx: e.ctx, user: e.attr.user, client: e.attr.client, error: e.attr.error, result: e.attr.result, isSpeculative: e.attr.isSpeculative, app: e.attr.doc?.application?.name }))
```

```text
[
  {
    t: { '$date': '2026-11-24T12:56:03.624+00:00' },
    id: 5286307, ctx: 'conn37', user: 'app_ventas', client: '127.0.0.1:53684',
    error: 'AuthenticationFailed: SCRAM authentication failed, storedKey mismatch',
    result: 18, isSpeculative: true, app: 'mongosh 2.10.0'
  },
  {
    t: { '$date': '2026-11-24T12:56:04.702+00:00' },
    id: 5286307, ctx: 'conn39', user: 'usuario_inexistente', client: '127.0.0.1:53694',
    error: 'UserNotFound: Could not find user "usuario_inexistente" for db "comercial"',
    result: 11, isSpeculative: true, app: 'mongosh 2.10.0'
  },
  {
    t: { '$date': '2026-11-24T12:56:04.705+00:00' },
    id: 5286307, ctx: 'conn39', user: 'usuario_inexistente', client: '127.0.0.1:53694',
    error: 'UserNotFound: Could not find user "usuario_inexistente" for db "comercial"',
    result: 11, isSpeculative: false, app: 'mongosh 2.10.0'
  }
]
```
Fueron **2 intentos fallidos** (`conn37` y `conn39`); `usuario_inexistente` generó dos líneas en `conn39` (`isSpeculative: true` y `false` a 3 ms de diferencia) correspondientes al mismo intento de conexión.

Último acceso exitoso de `app_ventas`:
```javascript
bitacora()
  .filter(e => e.msg === "Successfully authenticated" && e.attr.user === "app_ventas")
  .slice(-1)
  .map(e => ({ t: e.t, id: e.id, ctx: e.ctx, client: e.attr.client, result: e.attr.result, app: e.attr.doc?.application?.name }))
```
```text
[
  {
    t: { '$date': '2026-11-24T12:56:02.411+00:00' },
    id: 5286306, ctx: 'conn35', client: '127.0.0.1:53660',
    result: 0, app: 'app-ventas-web'
  }
]
```

## Respuestas

1. **¿Qué campo distingue un acceso fallido de uno exitoso?**  
   El mensaje `msg` (`"Failed to authenticate"` frente a `"Successfully authenticated"`), el `id` del evento (`5286307` vs `5286306`) y el campo `attr.result` (`0` en el acceso exitoso, `18` o `11` en los fallidos).

2. **¿Qué diferencia hay entre el error de contraseña incorrecta y el de usuario inexistente? ¿Por qué el cliente recibe el mismo mensaje en ambos casos?**  
   En la bitácora del servidor, la contraseña errónea registra `AuthenticationFailed: SCRAM authentication failed, storedKey mismatch` (`result: 18`), mientras que un usuario que no existe marca `UserNotFound: Could not find user ...` (`result: 11`). Al cliente se le regresa siempre el mismo texto genérico (`Authentication failed.`) para impedir que alguien externo enumere qué nombres de usuario sí existen en la base.

3. **¿Por qué el nombre de la aplicación del intento fallido es `mongosh 2.10.0` y no `app-ventas-web`?**  
   Porque en los dos comandos de prueba fallidos se omitió el parámetro `?appName=app-ventas-web` en la URI, y `mongosh` manda automáticamente su propio nombre y versión como metadata. Esto también confirma que `appName` depende de lo que declare el cliente.
