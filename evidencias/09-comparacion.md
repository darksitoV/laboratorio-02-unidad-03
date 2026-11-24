# Evidencia 09: Comparación de trazabilidad entre PostgreSQL, MongoDB Community y MongoDB Enterprise/Atlas

Estudiante: Genaro Isaac Cárdenas Soto (@darksitoV)  
Actividad: Actividad 9 (Comparar los tres escenarios)

| Evento auditable | PostgreSQL (bitácora + disparador) | MongoDB Community (perfilador + bitácora) | MongoDB Enterprise/Atlas (auditoría nativa) |
| :--- | :--- | :--- | :--- |
| Acceso exitoso | Sí (`log_connections = on`) | Sí (en bitácora JSON de `mongod`, volátil en RAM si usa `getLog`) | Sí (Documentado, no practicado) |
| Acceso fallido | Sí (`FATAL` + `DETAIL` en bitácora) | Sí (`Failed to authenticate` en bitácora JSON) | Sí (Documentado, no practicado) |
| Cambio de privilegios | Sí (`GRANT`/`REVOKE` con `log_statement = ddl` o `mod`) | No (ni `system.profile` ni `getLog` registran `grantRolesToUser`; solo detectable parcialmente entre instantáneas sin autor ni hora exacta) | Sí (Documentado, no practicado) |
| Cambio de estructura | Sí (`CREATE`/`ALTER`/`DROP` en bitácora) | Parcial (solo si el perfilador está en nivel 2 o filtro para `command`; no hay auditoría nativa de DDL ni permanencia automática) | Sí (Documentado, no practicado) |
| Modificación de datos | Sí (`log_statement = mod` + filas en tabla de auditoría) | Parcial (el perfilador nivel 2 o filtrado por escritura captura `insert`/`update`/`remove`, pero en colección temporal de 1 MB y para monitoreo de desempeño) | Sí (requiere `auditAuthorizationSuccess: true`; Documentado, no practicado) |
| Valor anterior del dato | Sí (disparador con `OLD`/`NEW` en `JSONB`) | No (el perfilador solo guarda la petición `command`, nunca el estado anterior del documento) | No (registra eventos de seguridad/operación y filtros, no historial automático antes/después; Documentado, no practicado) |
| Lectura de datos sensibles | No (con `mod`; exigiría `log_statement = all` o `pgaudit`) | Parcial (el perfilador en nivel 2 registra `query`, pero con alto costo en rendimiento, límite de 1 MB y al filtrarse por escrituras deja de capturarse) | Sí (con `auditAuthorizationSuccess: true`; Documentado, no practicado) |
| Cambio de configuración del registro | Sí (`parameter ... changed to ...` en bitácora) | Sí (`Profiler settings changed` en bitácora, correlacionable por `ctx` dentro del mismo arranque) | Sí (Documentado, no practicado) |
