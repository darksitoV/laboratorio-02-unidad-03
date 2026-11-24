# Evidencia 01: Edición de MongoDB, configuración y limitación de auditoría

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 1 (Lo que no existe en esta edición)  
Contenedor: `dba-u3-mongo` (`mongo:7 --auth`), base `comercial`

## Comandos ejecutados y resultado

En la sesión del DBA (`mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin`):

```javascript
db.version()
db.adminCommand({ buildInfo: 1 }).modules
db.serverCmdLineOpts().parsed
```

Salida observada:

```text
version: 7.0.43
modules:
[]
parsed:
{
  net: {
    bindIp: '*'
  },
  security: {
    authorization: 'enabled'
  }
}
```

El arreglo `modules` aparece vacío (`[]`), sin el módulo `"enterprise"`. Además, `serverCmdLineOpts().parsed` muestra únicamente `net` y `security` (por la bandera `--auth`), sin sección `systemLog.destination: file`.

## Respuestas

1. **¿Qué edición de MongoDB estás usando? ¿Qué evidencia lo demuestra?**  
   MongoDB `7.0.43` Community Edition. Lo confirma que `db.adminCommand({ buildInfo: 1 }).modules` devuelva un arreglo vacío `[]`, ya que en la edición Enterprise ese arreglo incluye `"enterprise"`.

2. **¿A dónde escribe tu servidor su bitácora? ¿Cómo lo sabes?**  
   A la salida estándar (`stdout`) del proceso en el contenedor. Lo sé porque en `db.serverCmdLineOpts().parsed` no existe la configuración `systemLog.destination: file` ni `systemLog.path`, y en el contenedor de `mongo:7` los mensajes JSON salen directamente por consola salvo que se monte un archivo de configuración.

3. **Según REF-U3-04, ¿qué cuatro categorías de eventos registraría la auditoría nativa?**  
   Cambios de esquema (DDL), eventos de conjuntos de réplicas y clústeres fragmentados, eventos de autenticación y autorización, y operaciones CRUD (habilitando `auditAuthorizationSuccess: true`).

4. **¿Qué tendría que evaluar una organización antes de licenciar Enterprise o migrar a Atlas solo para obtener auditoría?**  
   El costo anual de licenciamiento o del clúster M10+ frente al riesgo que busca cubrir, el volumen de eventos a almacenar, el impacto técnico de migrar cargas actuales y si los datos que realmente exigen auditoría formal (como cambios de valor en RFC) pueden resolverse manteniendo esa información en un motor como PostgreSQL.
