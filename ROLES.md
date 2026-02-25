# Sistema de Roles - Farmacia App

## Descripción
La aplicación ahora cuenta con un sistema de roles que controla qué acciones pueden realizar los diferentes usuarios.

## Roles Disponibles

### 1. **Admin** (Viviana)
**Credenciales:**
- Usuario: `viviana`
- Contraseña: `viviana1234`

**Permisos:**
- ✅ Ver productos
- ✅ Crear productos
- ✅ Editar productos
- ✅ Eliminar productos
- ✅ Registrar ventas
- ✅ Ver reportes

### 2. **Vendedor** (Vendedora)
**Credenciales:**
- Usuario: `vendedora`
- Contraseña: `vendedora1234`

**Permisos:**
- ✅ Ver productos (solo lectura)
- ❌ Crear productos (BLOQUEADO)
- ❌ Editar productos (BLOQUEADO)
- ❌ Eliminar productos (BLOQUEADO)
- ✅ Registrar ventas
- ✅ Ver reportes

## Cambios Implementados

### Base de Datos
- Se agregó la columna `role` a la tabla `usuarios`
- Valores posibles: `'admin'` o `'vendedor'`

### Middleware de Autorización
- Archivo: `backend/middleware/roleMiddleware.js`
- Verifica el rol del usuario antes de permitir ciertas acciones

### Rutas Protegidas
Las siguientes rutas están restringidas solo para administradores:

```
POST   /api/productos          (crear producto)
PUT    /api/productos/:id      (editar producto)
DELETE /api/productos/:id      (eliminar producto)
```

Las siguientes rutas están disponibles para todos los usuarios autenticados:

```
GET    /api/productos          (listar productos)
POST   /api/ventas             (registrar venta)
GET    /api/ventas             (ver historial)
```

## Cómo Usar

1. **Iniciar sesión como Viviana (Admin):**
   - Acceso completo a gestión de productos
   - Puede crear, editar y eliminar productos

2. **Iniciar sesión como Vendedora:**
   - Solo puede ver productos (lectura)
   - Intenta editar o crear productos → Se rechazará con mensaje de acceso denegado
   - Puede registrar ventas normalmente

## Validación en el Frontend

En el frontend, también puedes verificar el rol del usuario que inicio sesión:
- El login ahora retorna el campo `role` junto al token
- Usa este valor para mostrar/ocultar botones de edición o creación de productos
