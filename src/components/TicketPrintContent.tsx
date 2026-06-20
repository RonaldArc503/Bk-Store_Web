/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPresetIconComponent } from '../constants/branding'
import type { getResolvedBranding } from '../constants/branding'

export type TicketPrintContentProps = {
  orderInfo: any
  branding: ReturnType<typeof getResolvedBranding>
  empleadoInfo: { nombre: string; rol: string }
  userEmail?: string | null
  paymentLabels: Record<string, string>
}

export function TicketPrintContent({
  orderInfo,
  branding,
  empleadoInfo,
  userEmail,
  paymentLabels,
}: TicketPrintContentProps) {
  const tTotal = Number(orderInfo.total || 0)
  const tBase = Math.round((tTotal / 1.13) * 100) / 100
  const tIva = Math.round((tTotal - tBase) * 100) / 100
  const tMethod = paymentLabels[orderInfo.method] || orderInfo.method || 'Efectivo'
  const tCashReceived = Number(orderInfo.cashReceived || 0)
  const tChangeAmount = Number(orderInfo.changeAmount || 0)
  const showCashBreakdown = orderInfo.method === 'efectivo' && tCashReceived > 0
  const tTicketId = String(orderInfo.orderId || orderInfo.id || '').slice(-8).toUpperCase()
  const BrandIcon = getPresetIconComponent(branding.presetIcon)

  return (
    <>
      <div className="text-center mb-4">
        {branding.iconMode === 'custom' && branding.customImageUrl ? (
          <img
            src={branding.customImageUrl}
            alt={branding.appName}
            className="w-11 h-11 rounded-xl object-cover mx-auto mb-2"
          />
        ) : (
          <div className="w-11 h-11 bg-[#8CC63F] text-white rounded-xl flex items-center justify-center mx-auto mb-2">
            <BrandIcon size={20} />
          </div>
        )}
        <h2 className="text-sm font-bold uppercase text-gray-900">{branding.appName}</h2>
        {branding.subtitle ? (
          <p className="text-sm uppercase text-gray-500 mt-0.5">{branding.subtitle}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-gray-500 mb-3 px-1">
        <p>
          Doc N°: <span className="font-medium text-gray-700">{tTicketId}</span>
        </p>
        <p className="text-right">
          Caja: <span className="font-medium text-gray-700">1</span>
        </p>
        <p className="col-span-2">
          Fecha: <span className="font-medium text-gray-700">{orderInfo.date}</span>
        </p>
        <p className="col-span-2">
          Empleado:{' '}
          <span className="font-medium text-gray-700">
            {empleadoInfo.nombre || userEmail || 'Cajero'}
            {empleadoInfo.rol ? ` (${empleadoInfo.rol})` : ''}
          </span>
        </p>
        <p className="col-span-2">
          NOMBRE: <span className="font-medium text-gray-700">Consumidor Final</span>
        </p>
      </div>

      <div className="border-t border-gray-200">
        <div className="grid grid-cols-[32px_1fr_60px_60px] gap-1 py-2 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
          <span>Cant.</span>
          <span>Artículo</span>
          <span className="text-right">P. Unit.</span>
          <span className="text-right">Total</span>
        </div>
        {orderInfo.items.map((it: any, idx: number) => {
          const qty = Number(it.quantity || 0)
          const lt = Number(it.lineTotal || 0)
          const up = qty > 0 ? lt / qty : 0
          return (
            <div
              key={idx}
              className="grid grid-cols-[32px_1fr_60px_60px] gap-1 py-2 px-1 text-xs border-b border-gray-50"
            >
              <span className="text-gray-600">{qty}</span>
              <span className="text-gray-800 font-medium truncate">{it.name}</span>
              <span className="text-right text-gray-500">${up.toFixed(2)}</span>
              <span className="text-right font-medium text-gray-900">${lt.toFixed(2)}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 space-y-1.5 text-xs px-1">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal (sin IVA)</span>
          <span>${tBase.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>IVA 13%</span>
          <span>${tIva.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-between items-center font-bold text-xs mt-3 pt-3 border-t-2 border-gray-900 text-gray-900 px-1">
        <span>TOTAL</span>
        <span>${tTotal.toFixed(2)}</span>
      </div>

      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Metodo de pago</span>
          <span className="font-semibold text-gray-800">{tMethod}</span>
        </div>
        {showCashBreakdown ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Efectivo</span>
              <span className="font-semibold text-[#8CC63F]">${tCashReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cambio</span>
              <span className="font-semibold text-gray-800">
                {tChangeAmount < 0 ? `-$${Math.abs(tChangeAmount).toFixed(2)}` : `$${tChangeAmount.toFixed(2)}`}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="text-gray-500">Pagado</span>
            <span className="font-semibold text-[#8CC63F]">${tTotal.toFixed(2)}</span>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] italic text-gray-400 mt-2 pb-1">
        No se aceptan cambios ni devoluciones en prendas de ropa interior
      </p>
      <p className="text-center text-xs text-gray-400 mt-3 pb-1">Gracias por tu preferencia</p>
    </>
  )
}
