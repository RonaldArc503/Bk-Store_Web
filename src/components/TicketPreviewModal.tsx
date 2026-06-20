import type { ReactNode } from 'react'
import { Printer, Receipt } from 'lucide-react'

type TicketPreviewModalProps = {
  open: boolean
  onClose: () => void
  onPrint: () => void
  onPdf: () => void
  printing?: boolean
  children: ReactNode
}

export function TicketPreviewModal({
  open,
  onClose,
  onPrint,
  onPdf,
  printing = false,
  children,
}: TicketPreviewModalProps) {
  if (!open) return null

  return (
    <div
      id="ticket-print-root"
      className="fixed inset-0 bg-gray-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full sm:max-w-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div
          id="print-area"
          className="bg-white p-5 rounded-xl shadow-sm text-xs text-gray-900 print:bg-white print:text-black"
        >
          {children}
        </div>
        <div className="ticket-modal-chrome mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={printing}
            className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Printer size={16} />
            {printing ? 'Imprimiendo…' : 'Imprimir'}
          </button>
          <button
            type="button"
            onClick={onPdf}
            className="flex-1 py-2.5 bg-[#8CC63F] text-white rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
          >
            <Receipt size={16} />
            PDF
          </button>
        </div>
      </div>
    </div>
  )
}
