import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  getItemName,
  getItemQuantity,
  getItemSubtotal,
  resolveProductId,
  type OrderItemLike,
} from '../utils/devolucionHelpers'

export type DevolucionMotivo = { value: string; label: string }

type DevolucionModalProps = {
  isOpen: boolean
  ticketLabel: string
  items: OrderItemLike[]
  devItems: Record<string, number>
  devMotivo: string
  motivos: DevolucionMotivo[]
  devTotal: number
  hasSelection: boolean
  isProcessing: boolean
  formatMoney: (value: number) => string
  onClose: () => void
  onMotivoChange: (value: string) => void
  onQtyChange: (index: number, qty: number) => void
  onConfirm: () => void
}

export function DevolucionModal({
  isOpen,
  ticketLabel,
  items,
  devItems,
  devMotivo,
  motivos,
  devTotal,
  hasSelection,
  isProcessing,
  formatMoney,
  onClose,
  onMotivoChange,
  onQtyChange,
  onConfirm,
}: DevolucionModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const safeTotal = Number.isFinite(devTotal) ? devTotal : 0

  return createPortal(
    <div className="fixed inset-0 z-[9999]" aria-hidden={!isOpen}>
      <button
        type="button"
        className="absolute inset-0 h-full w-full border-0 bg-black/50 p-0 cursor-default"
        aria-label="Cerrar devolución"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="devolucion-modal-title"
          className="pointer-events-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 id="devolucion-modal-title" className="font-semibold text-gray-900 dark:text-gray-100">
                  Procesar devolución
                </h3>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{ticketLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Volver
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Motivo
              </label>
              <select
                value={devMotivo}
                onChange={(e) => onMotivoChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {motivos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Artículos a devolver
              </p>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                    No hay líneas de producto en esta venta.
                  </p>
                ) : (
                  items.map((item, idx) => {
                    const maxQ = Math.max(0, getItemQuantity(item))
                    const curQ = Math.min(maxQ, Math.max(0, devItems[String(idx)] || 0))
                    const lineTotal = getItemSubtotal(item)
                    const unitPrice = maxQ > 0 ? lineTotal / maxQ : 0

                    return (
                      <div
                        key={`${resolveProductId(item) || getItemName(item)}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                            {getItemName(item)}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Comprados: {maxQ} · {formatMoney(lineTotal)}
                            {maxQ > 1 ? ` (${formatMoney(unitPrice)}/u)` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            aria-label="Quitar una unidad"
                            disabled={curQ <= 0}
                            onClick={() => onQtyChange(idx, curQ - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-lg font-bold text-gray-700 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-300"
                          >
                            −
                          </button>
                          <span
                            className={`w-8 text-center text-sm font-bold ${
                              curQ > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'
                            }`}
                          >
                            {curQ}
                          </span>
                          <button
                            type="button"
                            aria-label="Agregar una unidad"
                            disabled={curQ >= maxQ || maxQ <= 0}
                            onClick={() => onQtyChange(idx, curQ + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-lg font-bold text-gray-700 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {hasSelection && (
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Total a devolver
                </span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {formatMoney(safeTotal)}
                </span>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                El stock se restaurará en inventario y el monto se descontará de las ventas del día y
                la caja abierta.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-gray-200 p-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!hasSelection || isProcessing || items.length === 0}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white ${
                hasSelection && !isProcessing && items.length > 0
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'cursor-not-allowed bg-gray-300 dark:bg-gray-700'
              }`}
            >
              {isProcessing ? (
                'Procesando...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
