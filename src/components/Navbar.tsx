/**
 * Navbar Component
 * Navegación principal de la aplicación
 */

import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          F_BStore
        </Link>
        <ul className="flex gap-6 items-center">
          <li>
            <Link to="/" className="text-gray-600 hover:text-blue-600 transition">
              Home
            </Link>
          </li>
          <li>
            <Link to="/products" className="text-gray-600 hover:text-blue-600 transition">
              Shop
            </Link>
          </li>
          <li>
            <Link to="/cart" className="text-gray-600 hover:text-blue-600 transition">
              Cart
            </Link>
          </li>
          {user ? (
            <>
              <li>
                <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
                >
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  )
}
