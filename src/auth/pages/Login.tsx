import { useState } from 'react'
import { ShoppingCart, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { loginEmail } from '../auth.service'

function getLoginErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === 'Credenciales invalidas') {
    return err.message
  }

  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code ?? '')
      : ''

  if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
    return 'Correo o contraseña incorrectos'
  }
  if (code === 'auth/user-disabled') {
    return 'Esta cuenta está deshabilitada'
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos. Intenta de nuevo en unos minutos'
  }
  if (code === 'auth/network-request-failed') {
    return 'Error de red. Revisa tu conexión a internet'
  }

  if (err instanceof Error && err.message === 'Usuario no autorizado o inactivo') {
    return 'Tu cuenta no está activa o no está registrada en el sistema'
  }
  if (err instanceof Error && err.message.includes('sesión')) {
    return err.message
  }
  if (err instanceof Error && err.message) {
    return err.message
  }

  return 'Error al iniciar sesión'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginEmail(email, password)
      login(data as { user: { uid: string; email: string | null; displayName: string | null }; token: string })
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-page-bg flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-transparent dark:border-gray-800 p-8 w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-lime-500 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bikini Store</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Sistema de Inventario y Punto de Venta
          </p>
        </div>

        {/* Form Section */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white font-medium py-2.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            Iniciar Sesión
          </button>
        </form>

      </div>
    </div>
  )
}
