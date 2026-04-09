# F_BStore

Modern React + TypeScript + Tailwind CSS project with clean MVC architecture.

## Tech Stack

- **React 19.2** - Latest React library
- **TypeScript 6.0** - Type-safe JavaScript  
- **Vite 8.0** - Lightning-fast build tool
- **Tailwind CSS 4.2** - Utility-first CSS
- **ESLint** - Code quality

## Quick Start

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check code quality
```

**Server running at:** http://localhost:5174

## Project Structure (MVC)

```
src/
├── models/       # Data types & interfaces
├── services/     # API communication
├── controllers/  # Business logic as hooks
├── context/      # Global state management
├── routes/       # Navigation & protection
├── pages/        # Page components (9 templates)
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
├── utils/        # Helper functions
├── styles/       # Global CSS + Tailwind
├── assets/       # Images & resources
├── App.tsx       # Main component
└── main.tsx      # Entry point
```

## Architecture

### Models (`models/Domain.ts`)
TypeScript types for data entities: `Product`, `User`, `Cart`, `Order`

### Services (`services/`)
API communication layer:
- `ApiService` - Base HTTP client
- `ProductService` - Product operations
- `AuthService` - Authentication

### Controllers (`controllers/`)
Business logic as custom React hooks:
- `useProductController` - Product logic
- `useAuthController` - Auth logic

### Context (`context/`)
Global state management:
- `AuthContext` - User authentication
- `CartContext` - Shopping cart

### Routes (`routes/`)
Navigation configuration with private route protection

### Pages & Components
Pre-built pages and reusable components

## Key Features

✅ MVC architecture for scalability  
✅ TypeScript for type safety  
✅ Tailwind CSS for styling  
✅ Global state with Context API  
✅ Custom hooks for logic reuse  
✅ Protected routes  
✅ Clean folder structure  

## Environment Variables

Copy `.env.example` to `.env` and configure:
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=F_BStore
```

## Documentation

See [MVC_ARCHITECTURE.md](./MVC_ARCHITECTURE.md) for detailed architecture guide with patterns and examples.

## Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vite.dev)
- [Tailwind Docs](https://tailwindcss.com)
- [TypeScript Docs](https://www.typescriptlang.org)
