/**
 * App Routes
 * Define todas las rutas de la aplicacion
 */

import React from 'react'
import type { ModuleKey } from '../auth/permissions'

const Login = React.lazy(() => import('../auth/pages/Login'))
const Register = React.lazy(() => import('../auth/pages/Register'))
const Dashboard = React.lazy(() => import('../pages/Dashboard'))
const POS = React.lazy(() => import('../pages/POS'))
const CorteDeCaja = React.lazy(() => import('../pages/CorteDeCaja'))
const Inventory = React.lazy(() => import('../pages/Inventory'))
const UserManagement = React.lazy(() => import('../pages/UserManagement'))
const Configuracion = React.lazy(() => import('../pages/Configuracion'))
const Reports = React.lazy(() => import('../pages/Reports'))
const NotFound = React.lazy(() => import('../pages/NotFound'))

export interface Route {
  path: string
  component: React.ComponentType
  name: string
  private?: boolean
  icon?: string
  moduleKey?: ModuleKey
  requiredAccess?: 'view' | 'full'
}

export const routes: Route[] = [
  {
    path: '/',
    component: Dashboard,
    name: 'Dashboard',
    private: true,
    icon: 'dashboard',
    moduleKey: 'dashboard',
  },
  {
    path: '/dashboard',
    component: Dashboard,
    name: 'Dashboard',
    private: true,
    icon: 'dashboard',
    moduleKey: 'dashboard',
  },
  {
    path: '/inventory',
    component: Inventory,
    name: 'Inventario',
    private: true,
    icon: 'inventory',
    moduleKey: 'inventory',
    requiredAccess: 'view',
  },
  {
    path: '/pos',
    component: POS,
    name: 'Punto de Venta',
    private: true,
    icon: 'pos',
    moduleKey: 'pos',
    requiredAccess: 'full',
  },
  {
    path: '/corte',
    component: CorteDeCaja,
    name: 'Corte de Caja',
    private: true,
    icon: 'cash',
    moduleKey: 'corte',
    requiredAccess: 'view',
  },
  {
    path: '/reports',
    component: Reports,
    name: 'Reportes',
    private: true,
    icon: 'reports',
    moduleKey: 'reports',
  },
  {
    path: '/users',
    component: UserManagement,
    name: 'Gestion de Usuarios',
    private: true,
    icon: 'users',
    moduleKey: 'users',
  },
  {
    path: '/configuracion',
    component: Configuracion,
    name: 'Configuracion',
    private: true,
    icon: 'settings',
    moduleKey: 'configuracion',
  },
  {
    path: '/login',
    component: Login,
    name: 'Login',
  },
  {
    path: '/register',
    component: Register,
    name: 'Registrarse',
  },
  {
    path: '*',
    component: NotFound,
    name: 'No encontrado',
  },
]
