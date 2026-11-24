// LAB-02 (Unidad III) - Comandos de mongosh utilizados en la practica
// Base de datos: comercial | Contenedor: dba-u3-mongo (MongoDB 7 Community)
// Contrasenas sustituidas por <REDACTED>

// --- Preparacion (Seccion 6.3, conexion local inicial sin credenciales) ---
use admin
db.createUser({ user: "admin", pwd: "<REDACTED>", roles: ["root"] })
db.auth("admin", "<REDACTED>")

use comercial
db.createUser({
  user: "app_ventas",
  pwd: "<REDACTED>",
  roles: [{ role: "readWrite", db: "comercial" }]
})

db.clientes.insertMany([
  { _id: 1, nombre: "Ana López", correo: "ana.lopez@example.test", telefono: "6671234567", rfc: "LOAA850315ABC", edad: 41, ciudad: "Culiacán", codigo_postal: "80000" },
  { _id: 2, nombre: "Carlos Pérez", correo: "carlos.perez@example.test", telefono: "6672345678", rfc: "PECA900720DEF", edad: 35, ciudad: "Culiacán", codigo_postal: "80100" },
  { _id: 3, nombre: "María García", correo: "maria.garcia@example.test", telefono: "6673456789", rfc: "GAMA780912GHI", edad: 47, ciudad: "Mazatlán", codigo_postal: "82000" },
  { _id: 4, nombre: "Luis Torres", correo: "luis.torres@example.test", telefono: "6674567890", rfc: "TOLU920201JKL", edad: 34, ciudad: "Los Mochis", codigo_postal: "81200" },
  { _id: 5, nombre: "Laura Sánchez", correo: "laura.sanchez@example.test", telefono: "6675678901", rfc: "SALA880525MNO", edad: 38, ciudad: "Culiacán", codigo_postal: "80200" }
])

// --- Funcion auxiliar para bitacora (Seccion 6.4, sesion del DBA) ---
function bitacora() {
  return db.adminCommand({ getLog: "global" }).log.map(l => JSON.parse(l))
}

// --- Actividad 1: Edicion y configuracion ---
db.version()
db.adminCommand({ buildInfo: 1 }).modules
db.serverCmdLineOpts().parsed

// --- Actividad 2: Incidente sin perfilado ---
db.getProfilingStatus()
// (Como app_ventas): db.clientes.updateOne({ _id: 3 }, { $set: { rfc: "GAMA780912XXX" } })
db.system.profile.countDocuments()
bitacora().filter(e => JSON.stringify(e).includes("GAMA780912XXX")).length
bitacora().filter(e => JSON.stringify(e).includes("app-ventas-web")).map(e => ({ t: e.t, c: e.c, ctx: e.ctx, msg: e.msg }))

// --- Actividad 3: Activar perfilador nivel 2 y registrar operaciones ---
db.setProfilingLevel(2)
db.getProfilingStatus()
// (Como app_ventas):
// db.clientes.find({ ciudad: "Culiacán" }, { nombre: 1, ciudad: 1 }).toArray()
// db.clientes.updateOne({ _id: 3 }, { $set: { rfc: "GAMA780912XYZ" } })
// db.clientes.deleteOne({ _id: 2 })
db.system.profile.find(
  { ns: "comercial.clientes" },
  { op: 1, ns: 1, command: 1, user: 1, client: 1, appName: 1, ts: 1, millis: 1, nreturned: 1, docsExamined: 1, nModified: 1, ndeleted: 1 }
).sort({ ts: 1 })

// --- Actividad 4: Filtro de perfilado para escrituras ---
db.setProfilingLevel(0)
db.system.profile.drop()
db.setProfilingLevel(1, { filter: { op: { $in: ["insert", "update", "remove"] } } })
db.getProfilingStatus()
// (Como app_ventas):
// db.clientes.find({ _id: 1 }).toArray()
// db.clientes.updateOne({ _id: 1 }, { $set: { telefono: "6670000000" } })
db.system.profile.find({}, { op: 1, ns: 1, user: 1, client: 1, appName: 1, "command.q": 1, "command.u": 1, ts: 1 })

// --- Actividad 5: Revision de accesos en bitacora ---
bitacora()
  .filter(e => e.c === "ACCESS" && e.msg === "Failed to authenticate")
  .map(e => ({ t: e.t, id: e.id, ctx: e.ctx, user: e.attr.user, client: e.attr.client, error: e.attr.error, result: e.attr.result, app: e.attr.doc?.application?.name }))

bitacora()
  .filter(e => e.msg === "Successfully authenticated" && e.attr.user === "app_ventas")
  .slice(-1)
  .map(e => ({ t: e.t, id: e.id, ctx: e.ctx, client: e.attr.client, result: e.attr.result, app: e.attr.doc?.application?.name }))

// --- Actividad 6: Correlacion de cambio de perfilador ---
bitacora()
  .filter(e => e.msg === "Profiler settings changed")
  .map(e => ({ t: e.t, ctx: e.ctx, msg: e.msg, attr: e.attr }))

// Reemplazar connX por el ctx observado
bitacora()
  .filter(e => e.ctx === "connX" && e.msg === "Successfully authenticated")
  .map(e => ({ t: e.t, ctx: e.ctx, user: e.attr.user, db: e.attr.db, client: e.attr.client }))

// --- Actividad 7: Control compensatorio de privilegios ---
db.getSiblingDB("auditoria").instantaneas_privilegios.insertOne({
  momento: new Date(),
  tomada_por: db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers,
  usuarios: db.getUsers().users.map(u => ({ user: u.user, db: u.db, roles: u.roles }))
})

db.setProfilingLevel(2)
db.grantRolesToUser("app_ventas", [{ role: "dbAdmin", db: "comercial" }])
db.system.profile.countDocuments({ "command.grantRolesToUser": { $exists: true } })
bitacora().filter(e => JSON.stringify(e).includes("grantRoles")).length

db.getSiblingDB("auditoria").instantaneas_privilegios.insertOne({
  momento: new Date(),
  tomada_por: db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers,
  usuarios: db.getUsers().users.map(u => ({ user: u.user, db: u.db, roles: u.roles }))
})

db.getSiblingDB("auditoria").instantaneas_privilegios.find({}, { _id: 0 }).sort({ momento: 1 })
db.revokeRolesFromUser("app_ventas", [{ role: "dbAdmin", db: "comercial" }])
db.setProfilingLevel(1, { filter: { op: { $in: ["insert", "update", "remove"] } } })

// --- Actividad 8: Verificacion tras reinicio ---
db.getProfilingStatus()
db.system.profile.countDocuments()
bitacora().length
