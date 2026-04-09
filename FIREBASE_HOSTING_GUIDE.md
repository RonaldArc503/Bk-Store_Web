# Firebase Hosting Deployment Guide

## 📋 Configuración Completada

El proyecto está configurado para Firebase Hosting con:

### ✅ `firebase.json`
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
- **`"public": "dist"`** → Sube la carpeta `dist/` (compilada con Vite)
- **`rewrites`** → Redirige todas las rutas a `index.html` (necesario para SPA React Router)

### ✅ `vite.config.ts`
```typescript
base: process.env.NODE_ENV === 'production' ? '/Bk-Store_Web/' : '/',
```

- **Desarrollo**: base `/` (http://localhost:5173/)
- **Producción**: base `/Bk-Store_Web/` (GitHub Pages compatible)

## 🚀 Pasos para Deployar

### 1. Build de la aplicación
```bash
npm run build
```
Genera: `dist/` (carpeta lista para producción)

### 2. Deploy a Firebase Hosting
```bash
firebase deploy
```

O con opciones específicas:
```bash
firebase deploy --only hosting
```

### 3. Verificar el deploy
```bash
firebase serve  # prueba localmente
```

## 📍 URLs Después del Deploy

### GitHub Pages (autodeploy por Actions)
```
https://bikinistore.github.io/Bk-Store_Web/
```

### Firebase Hosting (manual con CLI)
```
https://shopbikinistore.web.app/
```

## 🔐 Prerequisitos

### Ya completados ✅
- [x] Firebase project creado (`shopbikinistore`)
- [x] Firebase Realtime Database activada
- [x] Vite configurado
- [x] GitHub Actions workflow (autopublish a GitHub Pages)

### Pendientes (si usas Firebase Hosting)
- [ ] Firebase CLI instalada: `npm install -g firebase-tools`
- [ ] Login en Firebase: `firebase login`
- [ ] Inicialización: `firebase init` (ya configurado con firebase.json)

## 📦 Estructura del Deploy

### Antes de build:
```
proyecto/
├── src/
├── public/
├── dist/          ← Vacío o no existe
├── vite.config.ts
└── package.json
```

### Después de `npm run build`:
```
proyecto/
├── dist/          ← ✅ Aquí está la app compilada
│   ├── index.html
│   ├── assets/
│   │   ├── *.js
│   │   ├── *.css
│   │   └── ...
│   └── ...
```

### Lo que sube Firebase:
```
dist/
├── index.html       → Sirve en /
├── assets/          → Scripts, estilos, etc
└── ... (recursos estáticos)
```

## ⚙️ Alternativas de Deploy

### Opción 1: GitHub Pages (RECOMENDADO ACTUAL)
✅ Automático con GitHub Actions
✅ Gratis
✅ Ya configurado

**URL**: `https://bikinistore.github.io/Bk-Store_Web/`

### Opción 2: Firebase Hosting
✅ Más controles
✅ Rewrite rules integradas
✅ Mismo proveedor que Realtime Database

**URL**: `https://shopbikinistore.web.app/`

**Para activar:**
```bash
firebase deploy --only hosting
```

### Opción 3: Vercel (alternativa moderna)
```bash
vercel deploy
```

## 🔧 Troubleshooting

### "Cannot find dist/"
```bash
npm run build  # primero compila
firebase deploy
```

### "404 en rutas React Router"
✅ Ya solucionado con `rewrites` en firebase.json

### "Estilos/JS no cargan"
Verifica `vite.config.ts` tiene `base` correcta.

## 📊 Comparativa de Deployment

| Aspecto | GitHub Pages | Firebase Hosting |
|---------|--------------|------------------|
| **Setup** | Ya configurado | `firebase init` |
| **Build** | Automático (Actions) | Manual `npm run build` |
| **Deploy** | `git push` | `firebase deploy` |
| **Gratis** | Sí | Sí (hasta 10GB/mes) |
| **URL** | /Bk-Store_Web/ | .web.app |
| **Base path** | `/Bk-Store_Web/` | `/` |

## ✅ Status Actual

```
✅ firebase.json:     Configurado
✅ vite.config.ts:    Base path dinámico
✅ GitHub Actions:    Deploy automático
✅ dist/:             Generada en build
✅ Ready to deploy
```

## 🎯 Para Deployar Ahora

### GitHub Pages (automático)
```bash
git push origin main
# Se despliega automáticamente
```

### Firebase Hosting (manual)
```bash
npm run build
firebase deploy --only hosting
```

---

**Nota**: Ambos métodos funcionan. GitHub Pages es automático, Firebase Hosting es más flexible.

