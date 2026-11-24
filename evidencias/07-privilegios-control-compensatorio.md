# Evidencia 07: Control compensatorio para cambios de privilegios

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 7 (Cambios de privilegios: el límite más importante)

## Prueba de ausencia en perfilador/bitácora e instantáneas

1. Se guardó la primera instantánea en `auditoria.instantaneas_privilegios`:
```javascript
db.getSiblingDB("auditoria").instantaneas_privilegios.insertOne({
  momento: new Date(),
  tomada_por: db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers,
  usuarios: db.getUsers().users.map(u => ({ user: u.user, db: u.db, roles: u.roles }))
})
```

2. Con `db.setProfilingLevel(2)` activo en `comercial`, se asignó temporalmente el rol `dbAdmin` a `app_ventas` y se buscó rastro:
```javascript
db.grantRolesToUser("app_ventas", [{ role: "dbAdmin", db: "comercial" }])
db.system.profile.countDocuments({ "command.grantRolesToUser": { $exists: true } })
bitacora().filter(e => JSON.stringify(e).includes("grantRoles")).length
```
```text
profile grantRolesToUser count: 0
bitacora grantRoles count: 0
```
Ni el perfilador en nivel 2 ni la bitácora de `mongod` registraron `grantRolesToUser`.

3. Al tomar una segunda instantánea y comparar ambos documentos:
```javascript
db.getSiblingDB("auditoria").instantaneas_privilegios.find({}, { _id: 0 }).sort({ momento: 1 })
```
```text
[
  {
    momento: ISODate('2026-11-24T12:56:06.237Z'),
    tomada_por: [ { user: 'admin', db: 'admin' } ],
    usuarios: [
      { user: 'app_ventas', db: 'comercial', roles: [ { role: 'readWrite', db: 'comercial' } ] }
    ]
  },
  {
    momento: ISODate('2026-11-24T12:56:06.273Z'),
    tomada_por: [ { user: 'admin', db: 'admin' } ],
    usuarios: [
      {
        user: 'app_ventas',
        db: 'comercial',
        roles: [ { role: 'dbAdmin', db: 'comercial' }, { role: 'readWrite', db: 'comercial' } ]
      }
    ]
  }
]
```

Después se revocó `dbAdmin` y se restableció el filtro de la Actividad 4.

| Pregunta | ¿La instantánea responde? |
| :--- | :--- |
| ¿Cambiaron los privilegios de `app_ventas`? | Sí |
| ¿Qué rol se agregó? | Sí (`dbAdmin` en `comercial`) |
| ¿Quién lo agregó? | **No** (`tomada_por` solo indica quién sacó la foto, no quién hizo el `grantRolesToUser`) |
| ¿Cuándo exactamente? | **No**, solo que ocurrió entre las `12:56:06.237Z` y las `12:56:06.273Z` |

## Respuestas

1. **¿Por qué un cambio de privilegios es uno de los eventos auditables más importantes?**  
   Porque ampliar los roles de un usuario (por ejemplo darle `dbAdmin` o `root`) le abre acceso a tareas administrativas, lectura de configuraciones o manipulación del sistema sin que haya entrado un usuario externo nuevo. Es un vector directo de abuso o escalamiento de privilegios.

2. **¿Con qué frecuencia tomarías instantáneas? ¿Qué factores influyen?**  
   De forma automática cada hora (o al inicio y cierre de cada ventana de mantenimiento). Influye qué tan crítico es acotar el margen de tiempo si ocurre una anomalía, el tamaño del catálogo de usuarios y el almacenamiento de historial.

3. **¿Quién debería poder escribir en `auditoria.instantaneas_privilegios`?**  
   Solo el proceso programado o cuenta administrativa/auditora encargada de tomar las fotos, nunca `app_ventas` ni roles operativos normales de las bases de aplicación, para evitar que alguien altere el historial de comparaciones.

4. **Redacta en tres líneas cómo comunicarías esta limitación a Dirección.**  
   MongoDB Community no cuenta con auditoría nativa, por lo que no deja registro de quién ni a qué hora exacta se modifican los roles de un usuario.  
   Como control compensatorio se implementaron instantáneas periódicas de privilegios que permiten detectar qué roles cambiaron entre dos cortes, aunque sin identificar al autor.  
   Este mecanismo no equivale ni sustituye a una auditoría real; si la empresa exige atribución puntual de cambios de permisos, se requiere evaluar Enterprise/Atlas o controles externos de gestión de cambios.
