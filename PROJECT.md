# F_BStore - BikiniStore Sistema Integral 📱

Plataforma completa de gestión para tienda de bikinis con **Punto de Venta (POS)**, **Corte de Caja**, **Gestión de Inventario** y **Administración de Usuarios**, construida con React + TypeScript + Firebase.

---

## 📑 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura Sistema](#arquitectura-sistema)
4. [Estructura de Carpetas](#estructura-de-carpetas)
5. [Dependencias Entre Componentes](#dependencias-entre-componentes)
6. [Servicios Base de Datos](#servicios-base-de-datos)
7. [Modelos de Datos](#modelos-de-datos)
8. [Funcionalidades Principales](#funcionalidades-principales)
9. [Gestión de Estado](#gestión-de-estado)
10. [Rutas y Autenticación](#rutas-y-autenticación)
11. [Guía de Desarrollo](#guía-de-desarrollo)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 Visión General

### Propósito
Sistema integral para operaciones de tienda de bikinis con:
- ✅ **Punto de Venta (POS)**: Venta en tiempo real con búsqueda de productos
- ✅ **Control de Caja**: Apertura de caja con monto inicial, registro de ventas, remesas y cierre de corte
- ✅ **Gestión de Inventario**: CRUD completo de productos con precios dinámicos
- ✅ **Administración de Usuarios**: Control de roles y permisos (Admin, Bodeguero, Caja, Vendedor)
- ✅ **Autenticación**: Firebase Auth con email/password + Google OAuth
- ✅ **Persistencia**: Firebase Realtime Database para todos los datos operacionales

### Estado Actual
- 🎯 **BUILD**: Compilación TypeScript: ✅ EXITOSA (0 errores)
- 🎯 **DEPLOY**: Firebase Hosting: ✅ EXITOSA (Exit Code: 0)
- 🎯 **FEATURES**: POS + Corte de Caja + Inventario + Usuarios: ✅ FUNCIONALES
- 🎯 **UI**: Responsive mobile-first (Tailwind CSS): ✅ COMPLETA

---

## 🛠️ Stack Tecnológico

### Frontend
| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| **React** | 19.2 | Framework UI |
| **TypeScript** | 6.0 | Type safety |
| **Vite** | 8.0 | Build tool (lightning-fast) |
| **Tailwind CSS** | 4.2 | Utility-first styling |
| **lucide-react** | Latest | Iconografía |
| **react-router-dom** | Latest | Enrutamiento SPA |

### Backend & Persistencia
| Servicio | Uso |
|---------|-----|
| **Firebase Realtime Database** | Persistencia de productos, inventario, cajas, órdenes, usuarios |
| **Firebase Auth** | Autenticación email/password + Google OAuth |
| **Firebase Hosting** | Deployment de aplicación |

### Herramientas Desarrollo
| Herramienta | Uso |
|-----------|-----|
| **ESLint** | Linting código |
| **Git** | Control de versiones |
| **GitHub Actions** | CI/CD automático |

---

## 🏛️ Arquitectura Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (SPA)                      │
│                   Vite + TypeScript                          │
└────┬───────────────────────────────────────────────────┬────┘
     │                                                    │
     ├─── Pages (Lazy-loaded)                            │
     │    ├── POS.tsx (Punto de Venta)                   │
     │    ├── CorteDeCaja.tsx (Cash Register)            │
     │    ├── Inventory.tsx (CRUD Productos)             │
     │    ├── UserManagement.tsx (Gestión Usuarios)      │
     │    ├── Dashboard.tsx                              │
     │    └── Login/Register (Auth)                      │
     │                                                    │
     ├─── Services (Business Logic)                       │
     │    ├── ProductService (Catálogo)                  │
    │    ├── InventoryService (Stock + Precios)        │
     │    ├── MovimientosService (Auditoría)             │
     │    ├── CajaService (Cash Register API)            │
     │    ├── UserService (Usuarios)                     │
     │    └── AuthService (Auth Firebase)                │
     │                                                    │
     ├─── Context (State Management)                     │
     │    ├── AuthContext (Usuario autenticado)          │
     │    └── CartContext (Carrito de compras)           │
     │                                                    │
     ├─── Components (UI Reutilizable)                   │
     │    ├── Sidebar (Navegación)                       │
     │    ├── InventoryModal (Formulario productos)      │
     │    ├── UserModal (Formulario usuarios)            │
     │    ├── ProtectedRoute (Private routes)            │
     │    └── Loader (Loading states)                    │
     │                                                    │
     └─── Hooks (Logic Reuse)                            │
          ├── useAuth (Auth logic)                       │
          └── useLocalStorage (Local persistence)        │
                                                         │
             ↓ HTTP + Firebase SDK
                                                         │
┌─────────────────────────────────────────────────────────────┐
│          Firebase Realtime Database (Backend)                │
│                                                              │
│  ├── /productos         (Catálogo de productos)            │
│  ├── /inventario        (Stock + Precios por producto)     │
│  ├── /movimientos       (Historial de cambios)             │
│  ├── /cajas             (Registros de cajas abierta)        │
│  ├── /orders            (Órdenes de venta)                 │
│  ├── /cortes            (Cierres de caja)                  │
│  └── /users             (Usuarios del sistema)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Carpetas

```
src/
├── app/
│   ├── firebase.ts              # Configuración Firebase
│   └── routes.tsx               # Definición de rutas
│
├── auth/
│   ├── auth.service.ts          # Firebase Auth API
│   ├── AuthContext.tsx          # Auth state management
│   └── pages/
│       ├── Login.tsx
│       └── Register.tsx
│
├── components/                  # UI Reutilizable
│   ├── Button.tsx
│   ├── Sidebar.tsx              # Navegación principal
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx        # Private route wrapper
│   ├── InventoryModal.tsx        # Form crear/editar productos
│   ├── UserModal.tsx             # Form crear/editar usuarios
│   └── Loader.tsx
│
├── context/
│   ├── AuthContext.tsx          # User authentication state
│   └── CartContext.tsx          # Shopping cart state
│
├── hooks/
│   ├── useAuth.ts               # Auth hook
│   └── useLocalStorage.ts        # Local storage persistence
│
├── pages/
│   ├── Dashboard.tsx            # Admin dashboard
│   ├── POS.tsx                  # 🆕 Punto de Venta
│   ├── CorteDeCaja.tsx          # 🆕 Cash register management
│   ├── Inventory.tsx            # Gestión de inventario
│   ├── UserManagement.tsx        # Gestión de usuarios
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── Products.tsx
│   ├── ProductDetail.tsx
│   ├── Home.tsx
│   ├── NotFound.tsx
│   ├── Login.tsx
│   └── Register.tsx
│
├── services/                    # Business Logic Layer
│   ├── ApiService.ts            # Base HTTP client
│   ├── AuthService.ts           # Auth operations
│   ├── ProductService.ts        # Catálogo productos
│   ├── InventoryService.ts     # Stock + Precios
│   ├── InventoryService.ts      # Legacy compatibility
│   ├── MovimientosService.ts    # Historial auditoría
│   ├── CajaService.ts           # 🆕 Cash register API
│   └── UserService.ts           # Gestión usuarios
│
├── types/
│   ├── index.ts                 # Core types
│   └── product.ts               # Product types
│
├── utils/
│   ├── helpers.ts               # Utilidades generales
│   └── initDemo.ts              # Demo data initialization
│
├── styles/
│   └── index.css                # Global + Tailwind
│
├── App.tsx                      # Main app component
└── main.tsx                     # Entry point

public/                         # Static assets
```

---

## 🔗 Dependencias Entre Componentes

### 1. **Flujo POS (Punto de Venta)**

```
POS.tsx
├── InventoryService
│   └── Firebase /inventario → Carga productos
│
├── CajaService
│   ├── Firebase /cajas → Lee caja activa
│   ├── Firebase /cajas/{id} → Actualiza totales
│   └── Firebase /movimientos → Registra movimiento
│
└── Resultado:
    ├── Order guardado en /orders
    ├── Inventario decrementado
    └── Caja actualizada con venta
```

**Archivos Involucrados:**
- `src/pages/POS.tsx` → UI Punto de Venta
- `src/services/InventoryService.ts` → Obtiene productos
- `src/services/CajaService.ts` → Guarda venta en caja
- Firebase `/inventario`, `/orders`, `/cajas`, `/movimientos`

---

### 2. **Flujo Corte de Caja**

```
CorteDeCaja.tsx
├── Apertura:
│   ├── CajaService.openCaja()
│   ├── Firebase /cajas → Crea nueva caja
│   └── localStorage cajaOpenState → Persiste estado
│
├── Ventas:
│   ├── Lee /cajas/{cajaId} → Obtiene totales actuales
│   └── Muestra resumen de movimientos
│
└── Cierre:
    ├── CajaService.closeCaja()
    ├── Firebase /cortes → Guarda corte
    └── localStorage.removeItem('cajaOpenState') → Limpia
```

**Archivos Involucrados:**
- `src/pages/CorteDeCaja.tsx` → UI Cash Register
- `src/services/CajaService.ts` → Operaciones caja
- `src/components/Sidebar.tsx` → Envía createdBy
- localStorage `cajaOpenState` → Persistence
- Firebase `/cajas`, `/cortes`, `/movimientos`

---

### 3. **Flujo Gestión de Inventario**

```
Inventory.tsx
├── InventoryService.getProductos()
│   └── Firebase /inventario → Carga con precios
│
├── InventoryModal.tsx
│   ├── Create: ProductService + InventoryService
│   ├── Update: InventoryService.updateProducto()
│   └── Firebase /productos + /inventario
│
└── Búsqueda:
    └── InventoryService.searchProducts()
```

**Archivos Involucrados:**
- `src/pages/Inventory.tsx` → UI Gestión
- `src/components/InventoryModal.tsx` → Formulario
- `src/services/ProductService.ts` → Catálogo
- `src/services/InventoryService.ts` → Stock/Precios
- Firebase `/productos`, `/inventario`

---

### 4. **Flujo Gestión de Usuarios**

```
UserManagement.tsx
├── UserService.getUsers()
│   └── Firebase /users → Carga usuarios
│
├── UserModal.tsx
│   ├── Create/Update usuario
│   └── Firebase /users/{username}
│
└── Operaciones:
    ├── Cambiar estado (activo/inactivo)
    ├── Eliminar usuario
    └── Calcular estadísticas
```

**Archivos Involucrados:**
- `src/pages/UserManagement.tsx` → UI Gestión
- `src/components/UserModal.tsx` → Formulario
- `src/services/UserService.ts` → User CRUD
- Firebase `/users`

---

### 5. **Integración Completa: POS → Caja**

```
Usuario vende en POS
    ↓
POS.tsx → processPayment()
    ├─1. Guarda order en /orders
    ├─2. CajaService.addSaleToCaja() → Actualiza /cajas/{cajaId}
    │   ├─ total += montoVenta
    │   ├─ cantidadMovimientos++
    │   └─ Registra movimiento en /movimientos
    │
    └─3. InventoryService.descontarStock() para cada item
        └─ Decrementa stock en /inventario
            ↓
CorteDeCaja.tsx muestra venta en tiempo real
```

---

## 🗄️ Servicios Base de Datos

### 1. **ProductService** - Catálogo de Productos

**Responsabilidad:** Información base del producto (nombre, código, tipo, etc.)

**Métodos:**
```typescript
createProducto(input)           // Crear producto
updateProducto(input)           // Editar producto
getProductos()                  // Listar todos
getProductoById(id)             // Obtener uno
deleteProducto(id)              // Eliminar
generateBarcode()               // Generar código barras
```

**Base de Datos:**
```
/productos/{id}
├── codigo               (string - barcode)
├── nombre               (string)
├── tipo                 (string - Bikini, Short, etc)
├── material             (string)
├── genero               (string - Femenino, Masculino, Unisex)
├── estado               (string - Activo, Inactivo)
├── createdAt            (string - ISO date)
└── updatedAt            (string - ISO date)
```

---

### 2. **InventoryService** - Stock + Precios

**Responsabilidad:** Inventario operacional (stock, precios, movimientos)

**Métodos:**
```typescript
getProductos()                          // Obtener con inventario
getInventario()                         // Listar inventario
createInventario(input)                 // Crear con stock inicial
updateInventario(input)                 // Actualizar precios/stock
descontarStock(id, cantidad)           // Vender producto
agregarStock(id, cantidad)              // Devolver/agregar
getInventarioByProductoId(id)          // Obtener por producto
searchProducts(query)                   // Buscar
getInventoryStats()                    // Estadísticas
```

**Base de Datos:**
```
/inventario/{id}
├── productoId           (string - FK a /productos)
├── stock                (number - cantidad actual)
├── stockMinimo          (number - nivel alerta)
├── costo                (number - costo compra)
├── precioUnitario       (number - precio 1 unidad)
├── precioMediaDocena    (number - precio 6 unidades)
├── precioDocena         (number - precio 12 unidades)
└── updatedAt            (string - ISO date)
```

---

### 3. **MovimientosService** - Auditoría e Historial

**Responsabilidad:** Registrar todos los cambios de stock (trazabilidad)

**Métodos:**
```typescript
registrarEntrada(productoId, cantidad, motivo)      // Stock entrada
registrarSalida(productoId, cantidad, motivo)       // Stock salida
registrarAjuste(productoId, cantidad, motivo)       // Ajuste
getMovimientosByProducto(productoId)                // Historial
getResumenMovimientos(productoId)                   // Resumen
```

**Base de Datos:**
```
/movimientos/{id}
├── productoId           (string - FK a /productos)
├── tipo                 (string - "entrada", "salida", "ajuste")
├── cantidad             (number)
├── motivo               (string - "venta", "devolución", etc)
└── fecha                (string - ISO datetime)
```

---

### 4. **CajaService** - Gestión de Caja (🆕)

**Responsabilidad:** Operaciones de caja (apertura, ventas, cierre)

**Métodos:**
```typescript
openCaja(input)                      // Abrir caja con monto inicial
getActiveCaja()                      // Obtener caja abierta
getCajaById(cajaId)                 // Obtener caja específica
addSaleToCaja(cajaId, monto)        // Registrar venta
closeCaja(cajaId)                   // Cerrar caja
```

**Base de Datos:**
```
/cajas/{id}
├── usuarioApertura      (string - usuario que abrió)
├── fechaApertura        (string - ISO datetime)
├── montoApertura        (number - dinero inicial)
├── total                (number - total acumulado)
├── cantidadMovimientos  (number - # de transacciones)
├── estado               (string - "abierta", "cerrada")
└── fechaCierre          (string - ISO datetime, nullable)

/cortes/{id}            (Historial de cierres)
├── cajaId               (string - FK a caja)
├── montoApertura        (number)
├── montoVentas          (number)
├── total                (number)
├── usuarioCierre        (string)
├── fechaCierre          (string)
└── observaciones        (string)
```

**localStorage:**
```
cajaOpenState           (string - "true" | "false")
cajaOpenId              (string - ID de caja abierta)
```

---

### 5. **UserService** - Gestión de Usuarios

**Responsabilidad:** CRUD de usuarios con roles y estados

**Métodos:**
```typescript
getUsers()                              // Listar usuarios
getUserById(id)                         // Obtener usuario
createUser(input)                       // Crear usuario
updateUser(input)                       // Editar usuario
toggleUserStatus(id)                   // Activar/desactivar
deleteUser(id)                         // Eliminar usuario
getUserStats()                         // Estadísticas
groupUsersByRole()                     // Agrupar por rol
```

**Roles Disponibles:**
- `Administrador` - Acceso total
- `Bodeguero` - Gestión inventory
- `Caja` - Operaciones caja
- `Vendedor` - Ventas POS

**Base de Datos:**
```
/users/{username}
├── id                   (string)
├── usuario              (string - username único)
├── nombreCompleto       (string)
├── email                (string)
├── rol                  (string - Admin, Bodeguero, Caja, Vendedor)
├── estado               (string - "Activo", "Inactivo")
├── contraseña           (string - texto plano en dev, hash en prod)
├── fechaCreacion        (string - MM/DD/YYYY)  
└── fechaActualizacion   (string - MM/DD/YYYY)
```

---

### 6. **AuthService** - Autenticación Firebase

**Responsabilidad:** Google + Email/Password authentication

**Métodos:**
```typescript
signup(email, password)                 // Registrar usuario
signin(email, password)                 // Iniciar sesión
signout()                              // Cerrar sesión
signInWithGoogle()                     // OAuth Google
getCurrentUser()                       // Usuario actual
```

---

## 📊 Modelos de Datos

### Types - `src/types/index.ts`

```typescript
// Autenticación
interface User {
  uid: string
  email: string
  displayName?: string
  role?: UserRole
}

type UserRole = "Administrador" | "Bodeguero" | "Caja" | "Vendedor"

// Carrito
interface CartItem {
  id: string
  nombre: string
  precio: number
  cantidad: number
  lineTotal: number
}

interface Order {
  id: string
  items: CartItem[]
  total: number
  fecha: string
  createdBy?: string
  estado: "pendiente" | "completada"
}

// Caja
interface Caja {
  id: string
  fechaApertura: string
  montoApertura: number
  usuarioApertura: string
  total: number
  cantidadMovimientos: number
  estado: "abierta" | "cerrada"
  fechaCierre?: string
}

interface Corte {
  id: string
  cajaId: string
  montoApertura: number
  montoVentas: number
  total: number
  usuarioCierre: string
  fechaCierre: string
}
```

### Types - `src/types/product.ts`

```typescript
interface Product {
  id: string
  codigo: string                  // Barcode
  nombre: string
  tipo: string                    // Bikini, Short, etc
  material: string
  genero: string                  // Femenino, Masculino, Unisex
  stock: number
  costo: number
  precioUnitario: number
  precioMediaDocena: number
  precioDocena: number
  fechaCreacion: string
  fechaActualizacion: string
}

interface Inventario {
  id: string
  productoId: string              // Foreign Key
  stock: number
  stockMinimo: number
  costo: number
  precioUnitario: number
  precioMediaDocena: number
  precioDocena: number
  updatedAt: string
}

interface Movimiento {
  id: string
  productoId: string
  tipo: "entrada" | "salida" | "ajuste"
  cantidad: number
  motivo: string
  fecha: string                   // ISO datetime
}
```

---

## ✨ Funcionalidades Principales

### 🛍️ Punto de Venta (POS)

**Ubicación:** `/pos`

**Funcionalidades:**
- 🔍 Búsqueda de productos por nombre/código
- 🛒 Carrito de compras con cálculo automático
- 💰 Procesamiento de pagos
- 📊 Cálculo de totales con impuestos (si aplica)
- 📦 Integración con inventario (decremento automático)
- 🏦 Integración con caja (totales actualizados)
- 💾 Persistencia en `/orders`

**Archivos:**
- `src/pages/POS.tsx` (UI)
- `src/services/InventoryService.ts` (Productos)
- `src/services/CajaService.ts` (Venta → Caja)

---

### 🏦 Corte de Caja

**Ubicación:** `/corte`

**Funcionalidades:**
- 🔓 Apertura de caja con monto inicial
- 💵 Campo de monto de apertura (editable hasta guardar)
- ✅ Botón "Guardar Apertura" (bloquea inputs después)
- 📊 Visualización de ventas del día
- 💰 Registros de remesas
- 🔐 Cierre de caja con generación de corte
- 💾 Persistencia en localStorage + Firebase
- 📱 UI Responsive (mobile-first)

**Archivos:**
- `src/pages/CorteDeCaja.tsx` (UI)
- `src/services/CajaService.ts` (Operaciones)

---

### 📦 Gestión de Inventario

**Ubicación:** `/inventory`

**Funcionalidades:**
- ➕ Crear productos con precios dinámicos
- ✏️ Editar productos
- 🗑️ Eliminar productos
- 🔍 Búsqueda en tiempo real
- 📊 Estadísticas (total, stock, alertas)
- ⚠️ Alertas de stock bajo (< 24 unidades)
- 🔢 Generación de códigos de barras (13 dígitos)
- 📋 Tabla con acciones

**Archivos:**
- `src/pages/Inventory.tsx` (UI)
- `src/components/InventoryModal.tsx` (Formulario)
- `src/services/ProductService.ts` (Catálogo)
- `src/services/InventoryService.ts` (Stock)

---

### 👥 Gestión de Usuarios

**Ubicación:** `/users`

**Funcionalidades:**
- ➕ Crear usuarios
- ✏️ Editar usuarios
- 🗑️ Eliminar usuarios
- 🟢 Cambiar estado (Activo/Inactivo)
- 🔐 Asignación de roles
- 📊 Estadísticas (total, activos, por rol)
- 🔍 Búsqueda/filtro
- 💾 Demo data auto-inicializada

**Archivos:**
- `src/pages/UserManagement.tsx` (UI)
- `src/components/UserModal.tsx` (Formulario)
- `src/services/UserService.ts` (CRUD)
- `src/utils/initDemo.ts` (Demo initialization)

---

## 🧠 Gestión de Estado

### 1. **React Context** - Global State

#### AuthContext
```typescript
// Ubicación: src/context/AuthContext.tsx
interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email, password) => Promise<void>
  logout: () => Promise<void>
  signup: (email, password) => Promise<void>
}
```

**Usado por:** ProtectedRoute, Sidebar, CorteDeCaja

#### CartContext
```typescript
// Ubicación: src/context/CartContext.tsx
interface CartContextType {
  items: CartItem[]
  total: number
  addItem: (item) => void
  removeItem: (id) => void
  clear: () => void
}
```

**Usado por:** POS, Checkout

---

### 2. **localStorage** - Persistent State

**cajaOpenState** (CorteDeCaja.tsx)
- Key: `cajaOpenState`
- Value: `"true"` | `"false"`
- Purpose: Persistir apertura de caja entre recargas de página
- Límite: No se cierra automáticamente al cerrar navegador

**cajaOpenId** (CorteDeCaja.tsx)
- Key: `cajaOpenId`
- Value: ID de caja abierta
- Purpose: Saber qué caja cargar cuando se recarga página

---

### 3. **Firebase Listeners** - Real-time Updates

```typescript
// Escuchar cambios en tiempo real
InventoryService.onProductsChange(callback)
CajaService.onCajaChange(cajaId, callback)
UserService.onUsersChange(callback)
```

---

## 🔐 Rutas y Autenticación

### Rutas Públicas
```
/                   → Home (redirige a /dashboard si auth)
/login              → Login
/register           → Register
```

### Rutas Privadas (ProtectedRoute)
```
/dashboard          → Dashboard admin
/inventory          → Gestión inventario
/pos                → Punto de venta
/corte              → Corte de caja
/users              → Gestión usuarios
/cart               → Carrito
/checkout           → Pagar
/products           → Tienda online
```

### ProtectedRoute Component
```typescript
// src/components/ProtectedRoute.tsx
- Verifica si usuario autenticado
- Redirige a /login si no existe sesión
- Solo renderiza componente si isAuthenticated
```

---

## 📚 Guía de Desarrollo

### Requisitos

```bash
- Node.js 18+
- npm o yarn
- Firebase CLI (para deploy)
- Git
```

### Setup Inicial

```bash
# 1. Clonar proyecto
git clone <repo>
cd F_BStore

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar con credenciales Firebase

# 4. Iniciar servidor desarrollo
npm run dev
# Abre: http://localhost:5173/
```

### Comandos Disponibles

```bash
npm run dev         # Desarrollo (hot reload)
npm run build       # Producción (compila TypeScript)
npm run preview     # Ver build localmente
npm run lint        # Chequear código (ESLint)
npm run type-check  # Validar tipos TypeScript (tsc --noEmit)
```

### Estructura de Features

Para agregar nueva feature:

```
1. Crear archivo tipo en src/types/
2. Crear servicio en src/services/
3. Crear página en src/pages/ (si UI completa)
4. Agregar ruta en src/app/routes.tsx
5. Agregar item menú en src/components/Sidebar.tsx
6. Implementar Firebase listeners si es real-time
```

---

## 🚀 Deployment

### Firebase Hosting

#### Prerequisitos
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login en cuenta Firebase
firebase login

# Inicializar proyecto (ya hecho)
firebase init
```

#### Build y Deploy
```bash
# 1. Compilar aplicación
npm run build

# 2. Deploy a Firebase Hosting
firebase deploy --only hosting

# 3. Ver logs
firebase hosting:channel:list

# 4. Verificar URL
https://shopbikinistore.web.app/
```

#### Configuración (`firebase.json`)
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Explicación:**
- `"public": "dist"` → Carpeta que sube a servidor
- `rewrites` → Todas las rutas van a index.html (React Router)

---

### Base Path (Vite Config)

```typescript
// vite.config.ts
base: process.env.NODE_ENV === 'production' 
  ? '/Bk-Store_Web/' 
  : '/'
```

- **Desarrollo**: `/` (http://localhost:5173/)
- **Producción**: `/Bk-Store_Web/` (GitHub Pages)

---

## 🔧 Troubleshooting

### ❌ "Build fallido - TypeScript errors"

**Solución:**
```bash
# Verificar tipos
npm run type-check

# Corregir errores reportados
# Revisar líneas indicadas

# Recompilar
npm run build
```

---

### ❌ "Caja se cierra al recargar página"

**Solución:**
✅ Ya implementado. El estado persiste via:
- `localStorage.setItem('cajaOpenState', 'true')`
- Carga estado al montar CorteDeCaja.tsx
- Solo se cierra con botón "Cerrar Caja"

---

### ❌ "Productos no se cargan en POS"

**Posibles causas:**
1. Firebase no conectado → Revisar `src/app/firebase.ts`
2. Inventario vacío → Crear productos en `/inventory`
3. InventoryService error → Ver consola del navegador

**Solución:**
```bash
# 1. Chequear consola (F12)
# 2. Verificar Firebase console
# 3. Verificar conectividad internet
# 4. Recargar página (Ctrl+F5)
```

---

### ❌ "Deploy fallido"

**Solución:**
```bash
# 1. Verificar build
npm run build
# Si hay errores, corregir antes de deploy

# 2. Verificar autenticación Firebase
firebase login

# 3. Verificar proyecto
firebase projects:list

# 4. Deploy nuevamente
firebase deploy --only hosting
```

---

### ❌ localStorage no funciona

**Solución:**
```typescript
// Siempre usar try-catch
try {
  localStorage.setItem('key', 'value')
} catch (e) {
  console.warn('localStorage no disponible')
}
```

---

## 📞 Soporte & Documentación

### Files de Referencia
- **Architecture**: `ARCHITECTURE_REFACTOR.md` (estructura DB)
- **Deployment**: `FIREBASE_HOSTING_GUIDE.md`
- **Users**: `FIREBASE_USERS_VERIFICATION.md`
- **Inventory**: `INVENTORY_CRUD_DOCS.md`

### Archivos Principales (Quick Reference)

| Funcionalidad | Archivo Principal |
|--------------|-------------------|
| POS | `src/pages/POS.tsx` |
| Corte de Caja | `src/pages/CorteDeCaja.tsx` |
| Inventario | `src/pages/Inventory.tsx` |
| Usuarios | `src/pages/UserManagement.tsx` |
| Caja API | `src/services/CajaService.ts` |
| Inventario API | `src/services/InventoryService.ts` |
| Auth | `src/auth/auth.service.ts` |

---

## 📝 Notas Importantes

### ⚠️ Desarrollo
- Contraseñas guardadas en texto plano (solo dev)
- Demo data inicializada automáticamente
- Firebase Realtime DB usada (no Firestore)

### 🔒 Producción
- Implementar hashing de contraseñas (bcrypt)
- Desactivar demo data
- Configurar Firebase Security Rules
- Usar variable de entorno para API key

### 🚀 Performance
- Lazy loading de páginas
- localStorage para caja (offline support)
- Vite build: ~187KB gzipped
- Deploy time: < 1 minuto

---

## ✅ Checklist Final

- ✅ React 19.2 + TypeScript 6.0 compilado
- ✅ Firebase Realtime Database configurado
- ✅ POS integrado con inventario y caja
- ✅ Corte de Caja persiste en localStorage
- ✅ UI responsive (mobile-first Tailwind)
- ✅ Deploy a Firebase Hosting exitoso
- ✅ Documentación consolidada en PROJECT.md

---

**Última actualización:** 8 Abril 2026  
**Estado:** ✅ PRODUCCIÓN LISTA  
**Compilación:** ✅ SIN ERRORES (0 errors)  
**Build:** ✅ EXITOSO  
**Deploy:** ✅ FUNCIONAL
