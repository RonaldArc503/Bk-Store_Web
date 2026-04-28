import { FileText } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="reportes" />
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-0">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Reportes</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Generación de reportes del sistema</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Próximamente podrás generar y descargar reportes de ventas, inventario y cortes de caja.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
