# LAB-02: Trazabilidad en MongoDB Community

Materia: Gestión de Seguridad y Desempeño de Bases de Datos  
Unidad III: Auditoría, trazabilidad y gobierno práctico de datos  
Alumno: Genaro Isaac Cárdenas Soto (@darksitoV)

## Despliegue y versión del servidor

La práctica se realizó en un contenedor de Podman con la imagen oficial `mongo:7` arrancado con `--auth` (contenedor `dba-u3-mongo`, base de datos `comercial`).

Versión del servidor:

```text
7.0.43 (MongoDB Community Edition, modules: [])
```

Tanto la sesión de `admin` como las de `app_ventas` se corrieron con `mongosh` dentro del contenedor apuntando a `127.0.0.1:27017`. El servidor se conserva para el cierre de la unidad en el LAB-03.
