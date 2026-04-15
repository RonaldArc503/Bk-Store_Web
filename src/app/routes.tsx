/**
 * App Routes
 * Define todas las rutas de la aplicación
 */

import React from 'react'

// Páginas activas del sistema
const Login = React.lazy(() => import('../auth/pages/Login'))
const Register = React.lazy(() => import('../auth/pages/Register'))
const Dashboard = React.lazy(() => import('../pages/Dashboard'))
const POS = React.lazy(() => import('../pages/POS'))
const CorteDeCaja = React.lazy(() => import('../pages/CorteDeCaja'))
const Inventory = React.lazy(() => import('../pages/Inventory'))
const UserManagement = React.lazy(() => import('../pages/UserManagement'))
const Configuracion = React.lazy(() => import('../pages/Configuracion'))
const Reports = React.lazy(() => import('../pages/Reports')) // 👈 recuperado
const NotFound = React.lazy(() => import('../pages/NotFound'))

export interface Route {
  path: string
  component: React.ComponentType
  name: string
  private?: boolean
  icon?: string
}

export const routes: Route[] = [
  {
    path: '/',
    component: Dashboard,
    name: 'Dashboard',
    private: true,
    icon: '📊'
  },
  {
    path: '/dashboard',
    component: Dashboard,
    name: 'Dashboard',
    private: true,
    icon: '📊'
  },
  {
    path: '/inventory',
    component: Inventory,
    name: 'Inventario',
    private: true,
    icon: '📦'
  },
  {
    path: '/pos',
    component: POS,
    name: 'Punto de Venta',
    private: true,
    icon: '💳'
  },
  {
    path: '/corte',
    component: CorteDeCaja,
    name: 'Corte de Caja',
    private: true,
    icon: '💰'
  },
  {
    path: '/reports',
    component: Reports,
    name: 'Reportes',
    private: true,
    icon: '📄'
  },
  {
    path: '/users',
    component: UserManagement,
    name: 'Gestión de Usuarios',
    private: true,
    icon: '👥'
  },
  {
    path: '/configuracion',
    component: Configuracion,
    name: 'Configuración',
    private: true,
    icon: '⚙️'
  },
  {
    path: '/login',
    component: Login,
    name: 'Login'
  },
  {
    path: '/register',
    component: Register,
    name: 'Registrarse'
  },
  {
    path: '*',
    component: NotFound,
    name: 'No encontrado'
  }
]