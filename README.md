# Bikini Store — F_BStore

⚠️ **DOCUMENTACIÓN CONSOLIDADA**

Este README es un resumen. La documentación completa y técnica está consolidada en [PROJECT.md](./PROJECT.md).

Consulta `PROJECT.md` para:
 - Visión general del sistema
 - Arquitectura y diagramas
 - Modelos de datos y servicios
 - Guía de desarrollo y despliegue

---

## Estado y metadatos del repositorio

 - Hosting (Firebase): https://shopbikinistore.web.app
 - Firebase Console: https://console.firebase.google.com/project/shopbikinistore/overview

Detecté la URL remota del repositorio (local):

```
https://github.com/RonaldArc503/Bk-Store_Web.git
```

Si esa URL no corresponde al repositorio correcto del proyecto, actualiza el remote local con:

```bash
git remote set-url origin https://github.com/<tu-usuario>/<tu-repo>.git
```

También puedes actualizar la metadata del proyecto (`package.json`) si deseas que la URL pública sea distinta.

---

## Requisitos

 - Node.js 18+ (recomendado)
 - npm 8/9 o Yarn/Pnpm
 - Firebase CLI (`npm i -g firebase-tools`) para despliegues

## Instalación

```bash
npm install
```

## Desarrollo (servidor local)

```bash
npm run dev
```

Abre http://localhost:5173 (o la URL que indique Vite) para ver la app en modo desarrollo.

## Build para producción

```bash
npm run build
npm run preview   # opcional, para previsualizar el build
```

## Despliegue a Firebase Hosting

1. Instala y autentica Firebase CLI: `npm i -g firebase-tools` y `firebase login`.
2. Selecciona el proyecto: `firebase use --add` (elige `shopbikinistore` si aplica).
3. Construye y despliega:

```bash
npm run build
firebase deploy --only hosting
```

---

## Estructura principal del proyecto

Raíz del repo (resumen):

 - `public/` — archivos estáticos públicos
 - `src/` — código fuente React + TypeScript
 - `firebase.json` — configuración de Firebase Hosting
 - `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`

Dentro de `src/`:

 - `app/` — inicialización (ej. `firebase.ts`, `routes.tsx`)
 - `auth/` — servicios y páginas de autenticación (login/register)
 - `components/` — componentes reutilizables (Navbar, Sidebar, Modals...)
 - `context/` — providers React (AuthContext, CartContext)
 - `hooks/` — hooks personalizados
 - `pages/` — vistas/route pages (POS, Inventory, Dashboard, UserManagement...)
 - `services/` — lógica de acceso a datos y API (ProductService, InventoryService, CajaService, UserService)
 - `styles/` — estilos globales (Tailwind entry)
 - `types/` — definiciones TypeScript
 - `utils/` — helpers y utilidades

Consulta [PROJECT.md](./PROJECT.md#estructura-de-carpetas) para una lista completa y descripciones.

---

## Dependencias principales

 - `react` 19.x
 - `typescript` ~6.0
 - `vite` 8.x
 - `tailwindcss`
 - `firebase` (Realtime Database + Auth + Hosting)

Revisa `package.json` para la lista completa de dependencias.

---

## Git: información errónea en el repositorio

Si en tu entorno o en la interfaz remota (GitHub) aparece información que no corresponde con este proyecto, probablemente el `remote.origin.url` local esté apuntando a otra repo.

Verifica la URL actual con:

```bash
git remote -v
```

Si necesitas que lo corrija por ti, dime la URL correcta y lo actualizo (`git remote set-url origin <url>`).

---

## Estado (nota)

La documentación principal está en `PROJECT.md`. Aquí no se declaran estados absolutos de despliegue; verifica la consola de Firebase y los logs de CI/CD antes de considerar un entorno como "producción".

Última actualización: 14 Abril 2026

---

Si deseas que actualice el `remote` local o añada la URL correcta al `package.json` (`repository` / `homepage`), dime la URL exacta y lo hago por ti.
