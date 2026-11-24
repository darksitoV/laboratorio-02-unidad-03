# Informe Técnico: LAB-02 - Trazabilidad en MongoDB Community

* **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos
* **Unidad:** III - Auditoría, trazabilidad y gobierno práctico de datos
* **Estudiante:** Genaro Isaac Cárdenas Soto (`@darksitoV`)
* **Escenario:** Comercializadora Norte S.A. de C.V.

---

## 1. Despliegue, edición y limitación

El servidor se levantó en Podman con la imagen oficial `mongo:7` bajo el nombre `dba-u3-mongo`, arrancado con `--auth` y las credenciales de práctica en la base `comercial` (`admin` con rol `root` y `app_ventas` con `readWrite`). Se verificó la versión **`7.0.43`** y que `db.adminCommand({ buildInfo: 1 }).modules` regresa un arreglo vacío `[]`, confirmando que es **MongoDB Community Edition**.

En esta edición **no existe la auditoría nativa** (disponible solo en MongoDB Enterprise y Atlas M10+), por lo que el servidor no cuenta con registro auditado nativo para DDL, cambios de autorización ni eventos CRUD con trazabilidad garantizada. Ni el perfilador (`system.profile`) ni las instantáneas manuales utilizadas en esta práctica equivalen ni sustituyen a una auditoría nativa de seguridad.

---

## 2. Perfilador

El perfilador de base de datos (`Database Profiler`, activado en `comercial` con `db.setProfilingLevel()`) sirve originalmente para diagnosticar rendimiento y escribe en la colección limitada `comercial.system.profile` (tamaño por defecto de **1 MB**).

* **Sin perfilar (`was: 0`):** al actualizar el RFC de María García en la Actividad 2 no quedó ningún rastro de la operación.
* **Nivel 2:** registró las tres operaciones de prueba (`query` a las `12:55:59.735Z`, `update` del RFC a las `12:55:59.747Z` y `remove` de `_id: 2` a las `12:55:59.750Z`), identificando usuario (`app_ventas@comercial`), cliente (`127.0.0.1`), `appName` (`app-ventas-web`) y comando enviado. Sin embargo, no guarda valores anteriores y en producción degrada el desempeño y llena rápido la colección de 1 MB.
* **Nivel 1 con filtro (`{ op: { $in: ["insert", "update", "remove"] } }`):** redujo el volumen capturando solo escrituras (como el `update` de teléfono a las `12:56:02.416Z`) y dejando fuera el `find({ _id: 1 })`.

---

## 3. Bitácora de `mongod`

En el despliegue estándar del contenedor (`serverCmdLineOpts().parsed` sin `systemLog.path`), `mongod` escribe líneas JSON en su salida estándar (`stdout`), accesibles temporalmente mediante `db.adminCommand({ getLog: "global" })` (hasta los 1024 eventos más recientes en RAM).

Con `bitacora()` se observaron claramente:
* **Accesos:** intentos fallidos `FATAL` de `app_ventas` (`SCRAM authentication failed`, `result: 18` en `conn37`) y de `usuario_inexistente` (`UserNotFound`, `result: 11` en `conn39` con dos líneas `isSpeculative: true/false`), frente al acceso exitoso de `app-ventas-web` (`result: 0` en `conn35`). En los intentos fallidos sin `?appName`, `mongosh 2.10.0` quedó como aplicación por defecto.
* **Correlación de configuración:** los eventos `Profiler settings changed` no incluyen usuario directo, pero compartieron el contexto `ctx: 'conn31'`. Buscando `Successfully authenticated` para `conn31` (`12:56:01.017+00:00`) se comprobó que `admin` cambió el perfilador. Esta correlación solo es válida dentro del mismo arranque continuo del servidor.

---

## 4. Privilegios

Al ejecutar `db.grantRolesToUser("app_ventas", [{ role: "dbAdmin", db: "comercial" }])` incluso con el perfilador en nivel 2, tanto `system.profile` como la bitácora de `mongod` marcaron **`0`** registros del cambio. MongoDB Community no audita asignaciones ni revocaciones de roles.

Como **control compensatorio**, se creó la colección `auditoria.instantaneas_privilegios` para guardar fotos periódicas de `db.getUsers()`. Al comparar los cortes de las `12:56:06.237Z` y `12:56:06.273Z` se comprobó que apareció el rol temporal `dbAdmin` en `app_ventas`, pero **sin poder demostrar quién lo asignó ni en qué momento exacto**. Por su alcance, es solo un detector entre intervalos, nunca un mecanismo de auditoría completo.

---

## 5. Conservación

Las pruebas confirmaron dos riesgos reales de pérdida accidental:
1. `system.profile` sobrescribe registros antiguos al superar 1 MB si no se exporta antes.
2. El búfer de `getLog` en RAM desaparece al reiniciar: antes del reinicio había `333` eventos en memoria (y `374` líneas al exportar `bitacora-mongod.log`); tras `podman restart dba-u3-mongo`, el conteo cayó a `101` y el nivel de perfilado volvió a `0` (`was: 0`), aunque los `2` documentos ya existentes en `system.profile` sí sobrevivieron en disco.

Antes de reiniciar se exportaron `evidencias/system-profile.json` y `evidencias/bitacora-mongod.log` en UTF-8 y se generaron sus resúmenes SHA-256 en `evidencias/hashes.sha256` (`14e13358...` y `62cd8f09...`).

---

## 6. Comparación

PostgreSQL con bitácora (`log_connections`, `log_statement = 'mod'`) y disparadores (`auditoria.cambios_clientes`) cubre accesos, errores, DDL, cambios de privilegios (`GRANT`/`REVOKE`), modificaciones e historial completo antes y después de cada fila (`OLD`/`NEW`). MongoDB Community únicamente cubre accesos y cambios de configuración del perfilador en su log volátil de `mongod`, más trazabilidad parcial de operaciones en una colección temporal de 1 MB sin valor previo y sin rastro de cambios de roles. MongoDB Enterprise o Atlas añaden auditoría nativa para DDL, accesos, privilegios y CRUD, aunque tampoco guardan de fábrica el valor anterior de cada campo modificado.

---

## 7. Recomendación

Para Comercializadora Norte S.A. de C.V., la recomendación distingue hechos comprobados de supuestos:

* **Hechos verificados en este laboratorio:** MongoDB Community `7.0.43` no registra cambios de privilegios en bitácora ni en `system.profile`, no conserva valores anteriores del documento al actualizar/borrar, pierde la memoria de `getLog` y el nivel de perfilado al reiniciar si no hay archivo de configuración, y sobrescribe `system.profile` al llenar 1 MB. En contraste, PostgreSQL 16 (LAB-01) ya demostró capturar valor anterior/nuevo y cambios de permisos `GRANT`/`REVOKE`.
* **Supuestos:** que Comercializadora Norte tiene presupuesto limitado antes de contratar licencias Enterprise o clústeres M10+ en Atlas, y que el catálogo de clientes en MongoDB puede funcionar como réplica de lectura/consulta manteniendo la fuente maestra fiscal en PostgreSQL.

**Recomendación técnica:**
1. No usar MongoDB Community como única fuente de verdad para datos regulados o sujetos a auditoría de cambios (como el `rfc` para facturación); mantener esa actualización auditada en PostgreSQL y sincronizar a MongoDB como catálogo de lectura.
2. Si la tienda en línea debe seguir modificando datos o privilegios directamente en MongoDB bajo exigencia de auditoría formal, **presupuestar la migración a MongoDB Enterprise o Atlas (M10+)** para contar con auditoría nativa de seguridad y `systemLog` persistente enviado a un repositorio externo.
3. Mientras siga en Community, documentar estas brechas como **riesgos abiertos para el LAB-03**, configurar `systemLog.destination: file`, centralizar copias de log fuera del servidor, restringir quién usa `admin` y mantener instantáneas programadas de privilegios como control compensatorio.

---

## Preguntas de reflexión (Sección 20)

1. **¿Por qué el perfilador no debe presentarse como un mecanismo de auditoría de seguridad?**  
   Porque está diseñado para analizar consultas lentas y rendimiento, escribe en una colección limitada de 1 MB que sobrescribe lo antiguo por sí sola, se apaga al reiniciar si se configuró en sesión, no registra cambios de privilegios y el propio administrador o el volumen de tráfico puede borrar o saturar la evidencia.

2. **¿Por qué el perfilador sí aporta trazabilidad aunque no sea auditoría?**  
   Porque mientras está activo en nivel 2 o con filtro de escrituras deja registro temporal de qué operación (`query`, `update`, `remove`), en qué colección, con qué usuario (`app_ventas@comercial`), IP y `appName` se ejecutó en un intervalo reciente, ayudando a reconstruir qué sesión aplicó un cambio mientras se exporte a tiempo.

3. **¿Qué riesgo introduce el nivel 2 al registrar filtros de consultas que pueden contener datos personales?**  
   Al guardar cada `find` con todo su objeto `filter` dentro de `system.profile`, cualquier búsqueda por `rfc`, `correo` o `telefono` queda duplicada en esa colección sin controles por campo, convirtiéndola en otro depósito de datos personales si alguien con permisos en la base la consulta o la exporta sin limpiar.

4. **¿Qué diferencia hay entre detectar un cambio y atribuirlo a alguien?**  
   Detectar un cambio significa saber que un valor o permiso ya no es igual (como ver en dos instantáneas que `app_ventas` ganó `dbAdmin`). Atribuirlo requiere vincular sin dudas ese evento con un usuario autenticado, su IP y el momento exacto en que ejecutó el comando.

5. **¿Por qué reconocer una limitación técnica es parte del trabajo profesional del DBA?**  
   Porque prometer que una base de datos cubre un requisito legal o de seguridad cuando el motor no tiene esa función expone a la empresa a incidentes sin evidencia y fallas de auditoría. Documentar con honestidad qué sí registra la edición actual y qué requiere otro motor, licencia o control compensatorio permite tomar decisiones reales de arquitectura y riesgo.
