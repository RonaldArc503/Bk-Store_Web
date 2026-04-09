# Refactor: Arquitectura Escalable (Productos + Inventario Separados)

## 🎯 Objetivo
Separar correctamente la lógica de **productos** (catálogo) y **inventario** (stock + precios) para una arquitectura escalable y profesional.

## 📊 Estructura de Base de Datos

### 🟢 Tabla: `productos` (Catálogo)
```json
{
  "productos": {
    "prod-001": {
      "id": "prod-001",
      "codigo": "7501234567890",
      "nombre": "Bikini Floral Rojo",
      "tipo": "Bikini",
      "material": "Lycra",
      "genero": "Femenino",
      "descripcion": "Bikini con patrón floral",
      "estado": "Activo",
      "createdAt": "2026-04-08",
      "updatedAt": "2026-04-08"
    }
  }
}
```

**Datos limpios del producto** (sin stock, sin precios)

### 🟡 Tabla: `inventario` (Stock + Precios)
```json
{
  "inventario": {
    "inv-001": {
      "id": "inv-001",
      "productoId": "prod-001",  // FK a productos
      "stock": 50,
      "stockMinimo": 24,
      "costo": 35,
      "precioUnitario": 70,
      "precioMediaDocena": 65,
      "precioDocena": 60,
      "updatedAt": "2026-04-08"
    }
  }
}
```

**Todo lo operacional y financiero** (stock, precios)

### 🔄 Tabla: `movimientos` (Historial)
```json
{
  "movimientos": {
    "mov-001": {
      "id": "mov-001",
      "productoId": "prod-001",
      "tipo": "entrada",              // "entrada" | "salida" | "ajuste"
      "cantidad": 50,
      "motivo": "stock inicial",
      "fecha": "2026-04-08T10:30:00Z"
    },
    "mov-002": {
      "id": "mov-002",
      "productoId": "prod-001",
      "tipo": "salida",
      "cantidad": 2,
      "motivo": "venta",
      "fecha": "2026-04-08T14:45:00Z"
    }
  }
}
```

**Trazabilidad de movimientos** (auditoría)

## 🏗️ Servicios

### 1. **ProductService** - Catálogo
```typescript
ProductService.createProducto(input)    // crear producto
ProductService.updateProducto(input)    // editar info
ProductService.getProductos()           // listar productos
ProductService.deleteProducto(id)       // eliminar
ProductService.generateBarcode()        // generar código
```

**Responsabilidad**: Información básica del producto

### 2. **InventarioService** - Stock + Precios
```typescript
// Nueva API (específica)
InventarioService.getInventario()                    // listar inventario
InventarioService.createInventario(input)            // crear con stock inicial
InventarioService.updateInventario(input)            // editar precios/stock mín
InventarioService.descontarStock(id, cantidad)      // descontar (ventas)
InventarioService.agregarStock(id, cantidad)        // agregar (devoluciones)
InventarioService.getInventarioByProductoId(id)    // obtener por producto

// Compatibilidad (heredada)
InventoryService.getProducts()          // obtener con combinación
InventoryService.createProductWithInventory()  // crear ambos en 1 flujo
InventoryService.deleteProduct()        // elimina productos + inventario
```

**Responsabilidad**: Stock, precios, operaciones financieras

### 3. **MovimientosService** - Historial
```typescript
MovimientosService.registrarEntrada(productoId, cantidad, motivo)
MovimientosService.registrarSalida(productoId, cantidad, motivo)
MovimientosService.registrarAjuste(productoId, cantidad, motivo)
MovimientosService.getMovimientosByProducto(productoId)
MovimientosService.getResumenMovimientos(productoId)
```

**Responsabilidad**: Trazabilidad y auditoría

## 🔄 Flujo de Creación (UX)

### Usuario:
1. Click en **"Agregar Producto"**
2. Llena formulario:
   - Nombre, código, tipo, material, género (🟢 Producto)
   - Stock inicial, stock mínimo, costo, precios (🟡 Inventario)
3. Click **"Crear Producto"**

### Sistema (internamente):
```typescript
const result = await InventoryService.createProductWithInventory({
  codigo: "7501234567890",
  nombre: "Bikini Floral Rojo",
  tipo: "Bikini",
  material: "Lycra",
  genero: "Femenino",
  stock: 50,
  stockMinimo: 24,
  costo: 35,
  precioUnitario: 70,
  precioMediaDocena: 65,
  precioDocena: 60,
})

// Paso 1: Crear producto
const producto = await ProductService.createProducto({
  codigo: "7501234567890",
  nombre: "Bikini Floral Rojo",
  tipo: "Bikini",
  material: "Lycra",
  genero: "Femenino",
})

// Paso 2: Crear inventario
const inventario = await InventarioService.createInventario({
  productoId: producto.id,
  stock: 50,
  stockMinimo: 24,
  costo: 35,
  precioUnitario: 70,
  precioMediaDocena: 65,
  precioDocena: 60,
})

// Paso 3: Registrar movimiento (entrada inicial)
await MovimientosService.registrarEntrada(
  producto.id,
  50,
  "stock inicial"
)
```

## 📱 Vistas en UI

### Dashboard Inventario (Panel principal)
Muestra los datos **combinados** (para UX simple):

| Producto | Stock | Precio Unit. | Stock Mín. | Estado |
|----------|-------|--------------|-----------|--------|
| Bikini Floral Rojo | 48 | $70 | 24 | ⚠️ |
| Short Negro | 12 | $80 | 20 | ⚠️ |

**Internamente**: Lee de `inventario` + `productos`

### Modal de Editar
```
📋 PESTAÑA 1: Información del Producto
├─ Nombre: "Bikini Floral Rojo"
├─ Código: "7501234567890"
├─ Tipo: "Bikini"
├─ Material: "Lycra"
└─ Género: "Femenino"

💰 PESTAÑA 2: Inventario
├─ Stock: 48
├─ Stock Mínimo: 24
├─ Costo: $35
├─ Precio Unitario: $70
├─ Precio Media Docena: $65
└─ Precio Docena: $60
```

## 🔌 Integración con Ventas (Futuro)

### Cuando se registra una venta:
```typescript
// Descontar stock
const inventario = await InventarioService.descontarStock(
  inventarioId,
  cantidad,
  "venta"
)

// Sistema registra automáticamente:
// - Descuenta cantidad en inventario
// - Registra movimiento tipo "salida"
// - Guarda motivo "venta"
```

### Cuando hay devolución:
```typescript
const inventario = await InventarioService.agregarStock(
  inventarioId,
  cantidad,
  "devolución por defecto"
)

// Registra movimiento tipo "entrada"
```

## 📊 Escalabilidad Futura

### 🏪 Múltiples Sucursales (Próxima fase)
```json
{
  "sucursales/sucursal-001/inventario": { ... }
  "sucursales/sucursal-002/inventario": { ... }
}
```

### 📈 Kardex Completo
```json
{
  "kardex": {
    "kardex-001": {
      "productoId": "prod-001",
      "fecha": "2026-04-08",
      "saldo": 48,
      "saldoValor": 3360.00
    }
  }
}
```

### 🎯 Reportes
- Movimientos por período
- Stock valorizado
- Rotación de inventario
- Productos con bajo stock

## ✅ Ventajas de la Nueva Arquitectura

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Organización** | Todo mezclado | Separado por responsabilidad |
| **Escalabilidad** | Difícil agregar sucursales | Fácil de replicar |
| **Auditoría** | No hay trazabilidad | Registro completo de movimientos |
| **Mantenimiento** | Código acoplado | Servicios independientes |
| **Reportes** | Limitados | Muchas opciones |
| **Performance** | Una tabla grande | Consultas específicas |

## 🔑 Puntos Clave

✅ **Productos** = Catálogo limpio (sin dinero, sin stock)
✅ **Inventario** = Operacional (dinero, stock, precios)
✅ **Movimientos** = Historial (auditoría)
✅ **UI Unificada** = Usuario sigue usando una pantalla
✅ **Datos Separados** = Arquitectura profesional

## 📝 Tipos de Datos

Ubicación: `src/types/product.ts`

```typescript
// 🟢 PRODUCTOS
Producto {} 
CreateProductoInput {}
UpdateProductoInput {}

// 🟡 INVENTARIO
Inventario {}
CreateInventarioInput {}
UpdateInventarioInput {}

// 🔄 MOVIMIENTOS
Movimiento {}
CreateMovimientoInput {}

// 📦 VISTA UNIFICADA
ProductoConInventario {} // {producto + inventario}

// 📌 COMPATIBLE
Product {} // para herencia
```

## 🚀 Status

✅ **Architecture**: Refactorizada
✅ **Services**: Implementados
✅ **Build**: Sin errores
✅ **Compatibilidad**: Mantenida

---

**Próximo paso**: Implementar vistas separadas (Productos vs Inventario) cuando sea necesario.
