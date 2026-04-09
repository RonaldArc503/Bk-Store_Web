# 🚀 GitHub Pages - Guía de Configuración

## Estado Actual ✅
- **Workflow**: `.github/workflows/deploy.yml` creado
- **Vite Config**: `base: '/Bk-Store_Web/'` configurado
- **Build**: Exitoso ✓
- **Git**: Cambios pusheados ✓

## URL de tu sitio
```
https://ronaldarc503.github.io/Bk-Store_Web/
```

## ¿Qué sucede ahora?

### 1️⃣ GitHub Actions se ejecutará automáticamente
- Cada vez que hagas `git push` a `main`
- El workflow compilará tu app
- Desplegará en GitHub Pages

### 2️⃣ Ver progreso del deployment
1. Ve a tu repo: `https://github.com/RonaldArc503/Bk-Store_Web`
2. Click en **"Actions"**
3. Ver el último workflow ejecutándose
4. Esperar a que termine (1-2 minutos)

### 3️⃣ Activar GitHub Pages en Settings
1. Ve a `Settings → Pages`
2. Bajo "Build and deployment"
3. En "Source", selecciona: **"GitHub Actions"**
4. Guardar

## 📝 Archivos Configurados

### `.github/workflows/deploy.yml`
- Ejecuta `npm install`
- Ejecuta `npm run build`
- Deploya carpeta `dist/` a GitHub Pages
- Se ejecuta automáticamente en cada push

### `vite.config.ts`
- `base: '/Bk-Store_Web/'` - Configuración correcta para subdominio
- Asegura que los assets carguen correctamente

## 🔄 Workflow del Deployment

```
git push → GitHub Actions ejecuta → npm install
          → npm run build → Deploy dist/ → ✅ Sitio Live
```

## ✅ Verificación

Después de hacer push, verifica:
1. ✅ Workflow en "Actions" completed
2. ✅ GitHub Pages enabled en Settings
3. ✅ Sitio accesible en la URL

## 💡 Notas Importantes

- **Firebase Environment**: Las variables `.env` no se publican (seguridad)
- **Rutas**: React Router debe usar `HashRouter` para GitHub Pages (opcional)
- **Assets**: Todos se cargan con la base URL correcta

## 🛠️ Comandos Útiles

```bash
# Ver logs local
npm run dev

# Build local
npm run build

# Preview del build
npm run preview

# Limpiar y reconstruir
rm -rf dist && npm run build
```

## ❓ Problemas Comunes

### "Página en blanco"
→ Verifica que `base` en `vite.config.ts` es `/Bk-Store_Web/`

### "Assets no cargan"
→ Verifica que el workflow completó exitosamente

### "404 en rutas"
→ Agrega `HashRouter` en lugar de `BrowserRouter` (opcional)

---
**Configuración completada**: Tu sitio se desplegará automáticamente en cada push 🎉
