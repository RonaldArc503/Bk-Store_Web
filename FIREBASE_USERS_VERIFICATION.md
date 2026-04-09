# Como Verificar Usuarios en Firebase Console

## ¿Se crean los usuarios en Firebase?

**SÍ**, los 4 usuarios de demo se crean automáticamente en Firebase cuando cargas la aplicación por primera vez.

### Cómo funciona el proceso:

1. **App carga** (`src/App.tsx`)
2. **Se ejecuta** `initializeDemoData()` del archivo `src/utils/initDemo.ts`
3. **Verifica** si ya hay usuarios en Firebase
4. **Si NO hay**, crea los 4 usuarios:
   - admin
   - bodeguero
   - caja
   - vendedor

### Cómo verificar los datos en Firebase Console:

#### Paso 1: Ir a Firebase Console
```
https://console.firebase.google.com/
```

#### Paso 2: Seleccionar el proyecto
- Proyecto: **shopbikinistore**

#### Paso 3: Ir a Realtime Database
- Menú izquierdo → **Build** → **Realtime Database**

#### Paso 4: Expandir el árbol de datos
```
shopbikinistore (root)
└── users/
    ├── admin/
    │   ├── id: "admin"
    │   ├── usuario: "admin"
    │   ├── nombreCompleto: "Administrador Principal"
    │   ├── rol: "Administrador"
    │   ├── estado: "Activo"
    │   ├── email: "admin@bikinistore.com"
    │   ├── contraseña: "demo123456"
    │   ├── fechaCreacion: "8/4/2026"
    │   └── fechaActualizacion: "8/4/2026"
    │
    ├── bodeguero/
    │   ├── id: "bodeguero"
    │   ├── usuario: "bodeguero"
    │   ├── nombreCompleto: "Encargado de Bodega"
    │   ├── rol: "Bodeguero"
    │   ├── estado: "Activo"
    │   └── ...
    │
    ├── caja/
    │   ├── id: "caja"
    │   ├── usuario: "caja"
    │   ├── nombreCompleto: "Usuario de Caja"
    │   ├── rol: "Caja"
    │   └── ...
    │
    └── vendedor/
        ├── id: "vendedor"
        ├── usuario: "vendedor"
        ├── nombreCompleto: "Vendedor"
        ├── rol: "Vendedor"
        └── ...
```

### Verificar desde la aplicación:

#### Opción 1: Ir a Gestión de Usuarios
1. Login con cualquier credencial (la app crea en Firebase Auth)
2. Click en **"Gestión de Usuarios"** en el sidebar
3. Deberías ver los 4 usuarios listados en la tabla

#### Opción 2: Abrir la consola del navegador
1. Abre DevTools (F12)
2. Consola
3. Busca logs como:
   ```
   "Inicializando datos de demo..."
   "✅ Datos de demo inicializados correctamente"
   ```

### Cuándo se crean:

- **Primera carga**: Se crean si NO existen en Firebase
- **Cargas posteriores**: No se crean de nuevo (ya existen)

### Modificar/Eliminar usuarios:

Desde la interfaz de **Gestión de Usuarios** puedes:
- ✅ Crear nuevos usuarios
- ✅ Editar usuarios existentes
- ✅ Cambiar estado (Activo/Inactivo)
- ✅ Eliminar usuarios

O directamente en Firebase Console:
- Expandir `users/` → Click en usuario → Edit/Delete

### Reiniciar con datos frescos:

Si quieres borrar todo y que se recrée:

#### Opción 1: Desde Firebase Console
1. Click derecho en `users/`
2. Click en **Delete** (en algunos casos está en el menú de 3 puntos)
3. Recarga la aplicación

#### Opción 2: Desde la consola del navegador (DevTools)
```javascript
// En la consola, cuando la app esté abierta:
import { clearDemoData } from './utils/initDemo'
clearDemoData()
```

Luego recarga la página.

### Verificación rápida:

Tabla esperada en **Gestión de Usuarios**:

| Usuario  | Nombre Completo           | Rol            | Estado | Email                       |
|----------|---------------------------|----------------|--------|------------------------------|
| admin    | Administrador Principal   | Administrador  | Activo | admin@bikinistore.com        |
| bodeguero| Encargado de Bodega       | Bodeguero      | Activo | bodega@bikinistore.com       |
| caja     | Usuario de Caja           | Caja           | Activo | caja@bikinistore.com         |
| vendedor | Vendedor                  | Vendedor       | Activo | vendedor@bikinistore.com     |

### Notas importantes:

⚠️ **En Desarrollo:**
- Las contraseñas se guardan en texto plano
- Los datos de demo son para testing

🔒 **Para Producción:**
- Hash las contraseñas con bcrypt
- Configura Firebase Security Rules
- Desactiva la inicialización automática
- Usa autenticación separada

---

**Status**: ✅ Sistema funcionando correctamente
