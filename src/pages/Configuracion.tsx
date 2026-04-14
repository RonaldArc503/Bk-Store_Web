import { Settings } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'

/**
 * Pantalla de configuración (placeholder).
 * Evita 404 al usar el ítem del menú lateral.
 */
export default function ConfiguracionPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="configuracion" />

      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-0">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-lime-100 dark:bg-lime-950/50 flex items-center justify-center">
              <Settings className="w-7 h-7 text-lime-600 dark:text-lime-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Configuración
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Preferencias del sistema
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Aquí podrás ajustar opciones de la tienda cuando estén disponibles (idioma,
              notificaciones, impresión, etc.).
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
