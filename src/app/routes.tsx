/**
 * App Routes
 * Define todas las rutas de la aplicación
 */

import React from 'react'

// Páginas
const Products = React.lazy(() => import('../pages/Products'))
const ProductDetail = React.lazy(() => import('../pages/ProductDetail'))
const Cart = React.lazy(() => import('../pages/Cart'))
const Checkout = React.lazy(() => import('../pages/Checkout'))
const Login = React.lazy(() => import('../auth/pages/Login'))
const Register = React.lazy(() => import('../auth/pages/Register'))
const Dashboard = React.lazy(() => import('../pages/Dashboard'))
const Inventory = React.lazy(() => import('../pages/Inventory'))
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
    path: '/inventory',
    component: Inventory,
    name: 'Inventario',
    private: true,
    icon: '📦'
  },
  {
    path: '/products',
    component: Products,
    name: 'Productos',
    icon: '📦'
  },
  {
    path: '/products/:id',
    component: ProductDetail,
    name: 'Detalle Producto'
  },
  {
    path: '/cart',
    component: Cart,
    name: 'Carrito',
    icon: '🛒'
  },
  {
    path: '/checkout',
    component: Checkout,
    name: 'Checkout',
    private: true
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
    path: '/dashboard',
    component: Dashboard,
    name: 'Dashboard',
    private: true,
    icon: '📊'
  },
  {
    path: '*',
    component: NotFound,
    name: 'No encontrado'
  }
]
