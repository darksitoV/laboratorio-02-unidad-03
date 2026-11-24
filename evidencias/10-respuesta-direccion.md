# Evidencia 10: Respuestas a Dirección basadas en la evidencia de MongoDB Community

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 10 (Responder a Dirección)

1. **¿Quién cambió el RFC de María García en la Actividad 2? ¿Y en la Actividad 3?**  
   * **Actividad 2 (`'GAMA780912XXX'`):** **No hay evidencia con esta edición.** Cuando ocurrió ese cambio el perfilador estaba en `was: 0` (`system.profile` tuvo `0` documentos) y la bitácora estándar de `mongod` no registra escrituras rápidas. Aunque consta que `app_ventas` (`app-ventas-web`) se autenticó a esa hora en `conn17`, la bitácora no prueba qué colección ni qué campo modificó.
   * **Actividad 3 (`'GAMA780912XYZ'`):** El perfilador ya activo en nivel 2 registró que la operación fue ejecutada por el usuario **`app_ventas@comercial`** desde **`127.0.0.1`**.

2. **¿Cuándo y desde qué aplicación?**  
   * En la **Actividad 3**, el **`2026-11-24T12:55:59.747Z`** desde la aplicación **`app-ventas-web`** (`client: 127.0.0.1`), según consta en `system.profile`.
   * Para la **Actividad 2**, **no hay evidencia con esta edición** de la hora exacta de la actualización en `clientes`; únicamente consta en bitácora la autenticación de `app-ventas-web` a las `2026-11-24T12:55:56.810+00:00`.

3. **¿Qué valor tenía antes?**  
   **No hay evidencia con esta edición.** El perfilador `system.profile` solo conserva el comando enviado (`{ $set: { rfc: 'GAMA780912XYZ' } }`), pero MongoDB Community no tiene disparadores de base de datos ni guarda el estado previo del documento en `system.profile` o en la bitácora.

4. **¿Cambió alguien los privilegios de `app_ventas`?**  
   **No hay evidencia con esta edición** de quién ejecutó un cambio de permisos ni del momento exacto. Tanto `db.system.profile` como la bitácora de `mongod` arrojaron `0` coincidencias para `grantRolesToUser`. Únicamente mediante el control compensatorio manual (`auditoria.instantaneas_privilegios`) se detectó que entre las `2026-11-24T12:56:06.237Z` y las `2026-11-24T12:56:06.273Z` el usuario `app_ventas` pasó de tener solo `readWrite` a incluir `dbAdmin` en `comercial`, sin evidencia de qué sesión o usuario otorgó ese rol.
