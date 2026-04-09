import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { User } from '../../types'

const mockUsers: Record<string, { password: string; profile: User }> = {
  admin: {
    password: 'admin123',
    profile: {
      id: '1',
      name: 'Administrador',
      email: 'admin@bikinistore.local',
      role: 'admin',
    },
  },
  inventario: {
    password: 'inventario123',
    profile: {
      id: '2',
      name: 'Usuario Inventario',
      email: 'inventario@bikinistore.local',
      role: 'user',
    },
  },
  caja: {
    password: 'caja123',
    profile: {
      id: '3',
      name: 'Usuario Caja',
      email: 'caja@bikinistore.local',
      role: 'user',
    },
  },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedUsername = username.trim().toLowerCase()
    const candidate = mockUsers[normalizedUsername]

    if (!candidate || candidate.password !== password.trim()) {
      setError('Credenciales invalidas. Usa uno de los usuarios de prueba.')
      return
    }

    setError('')
    login(candidate.profile)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-lime-500 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bikini Store</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sistema de Inventario y Punto de Venta
          </p>
        </div>

        {/* Form Section */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Usuario
            </label>
            <input
              type="text"
              placeholder="Ingrese su usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-lime-500 hover:bg-lime-600 text-white font-medium py-2.5 rounded-lg transition-colors duration-200"
          >
            Iniciar Sesión
          </button>
        </form>

        {/* Test Users Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 text-center mb-3">
            Usuarios de prueba:
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex">
              <span className="font-semibold text-gray-900 w-20">Admin:</span>
              <span className="text-gray-600">admin / admin123</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-900 w-20">Inventario:</span>
              <span className="text-gray-600">inventario / inventario123</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-900 w-20">Caja:</span>
              <span className="text-gray-600">caja / caja123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
