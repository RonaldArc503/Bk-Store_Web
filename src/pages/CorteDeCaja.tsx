import React, { useState, useEffect } from 'react'
import { Sidebar } from '../components/Sidebar'
import { ChevronLeft, Lock, Unlock, Banknote, CreditCard, QrCode, MinusCircle, Plus, X } from 'lucide-react'
import { CorteService } from '../services/CorteService'
import { useAuth } from '../hooks/useAuth'
import { CajaService } from '../services/CajaService'

export default function CorteDeCaja() {
  const { user } = useAuth()

  const [isCajaOpen, setIsCajaOpen] = useState(false)
  const [remesas, setRemesas] = useState<{ id: number; monto: number; motivo?: string }[]>([])
  const [isRemesaModalOpen, setIsRemesaModalOpen] = useState(false)
  const [newRemesa, setNewRemesa] = useState<{ monto: string; motivo: string }>({ monto: '', motivo: '' })

  const [efectivoContado, setEfectivoContado] = useState('0.00')
  const [transferenciasContado, setTransferenciasContado] = useState('0.00')
  const [qrContado, setQrContado] = useState('0.00')
  const [notas, setNotas] = useState('')

  // Apertura editable por el usuario
  const [aperturaMonto, setAperturaMonto] = useState('')
  const [aperturaFecha, setAperturaFecha] = useState(() => new Date().toISOString().slice(0, 16)) // datetime-local
  const [aperturaUsuario, setAperturaUsuario] = useState(user?.displayName ?? 'Usuario de Caja')
  const [isAperturaSaved, setIsAperturaSaved] = useState(false)

  // Ventas del día (editable)
  const [ventasEfectivo, setVentasEfectivo] = useState('')
  const [ventasTransferencia, setVentasTransferencia] = useState('')
  const [ventasQr, setVentasQr] = useState('')

  const ventasDia = {
    efectivo: parseFloat(ventasEfectivo || '0'),
    transferencia: parseFloat(ventasTransferencia || '0'),
    qr: parseFloat(ventasQr || '0'),
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Verify actual caja exists and is not closed in Firebase for this user
        const active = await CajaService.getActiveCaja(user?.uid)
        if (!mounted) return

        if (active && active.status !== 'closed') {
          // Caja is actually open in Firebase, keep it open
          setIsCajaOpen(true)
          setAperturaMonto(String(active.apertura?.monto ?? ''))
          setAperturaFecha(active.apertura?.fecha ? new Date(active.apertura.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16))
          setAperturaUsuario(active.apertura?.usuario ?? user?.displayName ?? 'Usuario de Caja')
          setVentasEfectivo(String(active.totals?.efectivo ?? ''))
          setVentasTransferencia(String(active.totals?.transferencia ?? ''))
          setVentasQr(String(active.totals?.qr ?? ''))
          setRemesas(active.remesas || [])
          setIsAperturaSaved(Boolean(active.apertura))
        } else {
          // No active caja: closed by default
          setIsCajaOpen(false)
          setIsAperturaSaved(false)
        }
      } catch (err) {
        console.error('Error loading caja state', err)
        // On error, default to closed
        setIsCajaOpen(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  const handleSaveApertura = async () => {
    try {
      if (isAperturaSaved) {
        alert('Apertura ya guardada')
        return
      }

      // Only include createdBy if user is authenticated
      const aperturaInfo: { monto: number; fecha: string; usuario: string; createdBy?: string } = {
        monto: parseFloat(aperturaMonto || '0'),
        fecha: aperturaFecha ? new Date(aperturaFecha).toISOString() : new Date().toISOString(),
        usuario: aperturaUsuario,
      }
      if (user?.uid) {
        aperturaInfo.createdBy = user.uid
      }

      const active = await CajaService.getActiveCaja(user?.uid)
        if (active && active.id) {
        // Already an active caja — mark as saved
        setIsAperturaSaved(true)
        setIsCajaOpen(true)
        alert('Apertura ya registrada en la caja activa')
        return
      }

      await CajaService.openCaja(aperturaInfo)
      setIsAperturaSaved(true)
      setIsCajaOpen(true)
      alert('Apertura guardada correctamente')
    } catch (err) {
      console.error('Error saving apertura', err)
      alert('Error al guardar la apertura')
    }
  }

  const handleOpenView = async () => {
    try {
      const active = await CajaService.getActiveCaja(user?.uid)
      if (active) {
        // Load active caja (keep apertura locked)
        setIsCajaOpen(active.status !== 'closed')
        setAperturaMonto(String(active.apertura?.monto ?? ''))
        setAperturaFecha(active.apertura?.fecha ? new Date(active.apertura.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16))
        setAperturaUsuario(active.apertura?.usuario ?? user?.displayName ?? 'Usuario de Caja')
        setVentasEfectivo(String(active.totals?.efectivo ?? ''))
        setVentasTransferencia(String(active.totals?.transferencia ?? ''))
        setVentasQr(String(active.totals?.qr ?? ''))
        setRemesas(active.remesas || [])
        setIsAperturaSaved(Boolean(active.apertura))
      } else {
        // No active caja: open view for user input (inputs enabled)
        setIsAperturaSaved(false)
        setAperturaMonto('')
        setAperturaFecha(new Date().toISOString().slice(0, 16))
        setAperturaUsuario(user?.displayName ?? 'Usuario de Caja')
        setVentasEfectivo('')
        setVentasTransferencia('')
        setVentasQr('')
        setRemesas([])
        setIsCajaOpen(true)
      }
    } catch (err) {
      console.error('Error opening caja view', err)
      // Fallback: open the view for input
      setIsAperturaSaved(false)
      setIsCajaOpen(true)
    }
  }

  const totalVentas = ventasDia.efectivo + ventasDia.transferencia + ventasDia.qr

  const totalRemesas = remesas.reduce((acc, r) => acc + (r.monto || 0), 0)
  const esperadoEfectivo = parseFloat(aperturaMonto || '0') + ventasDia.efectivo - totalRemesas

  const handleAddRemesa = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newRemesa.monto || parseFloat(newRemesa.monto) <= 0) return
    setRemesas([...remesas, { id: Date.now(), monto: parseFloat(newRemesa.monto), motivo: newRemesa.motivo }])
    setNewRemesa({ monto: '', motivo: '' })
    setIsRemesaModalOpen(false)
  }

  const removeRemesa = (id: number) => setRemesas((prev) => prev.filter((r) => r.id !== id))

  const handleCerrarCaja = async () => {
    if (!window.confirm('¿Está seguro que desea cerrar la caja? Esta acción no se puede deshacer.')) return

    const corte = {
      aperturaInfo: {
        monto: parseFloat(aperturaMonto || '0'),
        fecha: aperturaFecha ? new Date(aperturaFecha).toISOString() : new Date().toISOString(),
        usuario: aperturaUsuario,
      },
      ventasDia: {
        efectivo: ventasDia.efectivo,
        transferencia: ventasDia.transferencia,
        qr: ventasDia.qr,
      },
      totalVentas,
      remesas,
      totalRemesas,
      efectivoContado: parseFloat(efectivoContado || '0'),

      transferenciasContado: parseFloat(transferenciasContado || '0'),
      qrContado: parseFloat(qrContado || '0'),
      esperadoEfectivo,
      notas,
      createdBy: user?.uid || null,
      createdAt: new Date().toISOString(),
    }
    try {
      const created = await CorteService.saveCorte(corte)
      // If there's an active caja, close it and attach corte info
      try {
        const active = await CajaService.getActiveCaja(user?.uid)
        if (active && active.id) {
          await CajaService.closeCaja(active.id, { corteId: created.id, corte })
        }
      } catch (err) {
        console.error('Error closing active caja after corte:', err)
      }

      setIsCajaOpen(false)
      alert('Cierre de caja guardado correctamente')
    } catch (err) {
      console.error('Error saving corte', err)
      alert('Error al guardar el cierre de caja')
    }
  }

  if (!isCajaOpen) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        <Sidebar activeItem="corte" />
        <div className="flex-1 p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 border-b pb-4 md:pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl md:text-2xl font-bold">Corte de Caja</h2>
              </div>
              <p className="text-gray-500 text-sm md:text-base">Gestione la apertura y cierre de caja diario</p>
            </div>
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 rounded-lg text-sm md:text-base">
                <Lock size={18} />
                Caja Cerrada
              </div>
              <button onClick={() => handleOpenView()} className="px-3 md:px-4 py-2 bg-[#8CC63F] text-white rounded-lg text-sm md:text-base">Abrir Caja</button>
            </div>
          </div>

          <div className="w-full border rounded-2xl p-4 md:p-6">
            <h3 className="text-lg font-bold mb-4">Último Cierre de Caja</h3>
            <p className="text-gray-500 text-sm md:text-base">Cierre guardado en la base de datos.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeItem="corte" />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl md:text-2xl font-bold">Corte de Caja</h2>
            </div>
            <p className="text-gray-500 text-sm md:text-base">Gestione la apertura y cierre de caja diario</p>
          </div>
          <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg text-sm md:text-base">
            <Unlock size={18} />
            Caja Abierta
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 w-full">
          <div className="border rounded-2xl p-4 md:p-6 bg-white">
            <h3 className="font-bold mb-4 text-lg md:text-base">Información de Apertura</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="text-gray-500 text-xs md:text-sm block mb-1">Monto de Apertura</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 md:p-3 border rounded-xl text-xl md:text-2xl font-bold text-[#8CC63F]"
                  value={aperturaMonto}
                  onChange={(e) => setAperturaMonto(e.target.value)}
                  placeholder="0.00"
                  disabled={isAperturaSaved}
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs md:text-sm block mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  className="w-full p-2 md:p-3 border rounded-xl text-gray-900 text-sm md:text-base"
                  value={aperturaFecha}
                  onChange={(e) => setAperturaFecha(e.target.value)}
                  disabled={isAperturaSaved}
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs md:text-sm block mb-1">Usuario Responsable</label>
                <input
                  type="text"
                  className="w-full p-2 md:p-3 border rounded-xl text-gray-900 text-sm md:text-base"
                  value={aperturaUsuario}
                  onChange={(e) => setAperturaUsuario(e.target.value)}
                  disabled={isAperturaSaved}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              {!isAperturaSaved ? (
                <button onClick={handleSaveApertura} className="px-4 py-2 bg-[#8CC63F] text-white rounded-lg">Guardar Apertura</button>
              ) : (
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600">Apertura guardada</div>
              )}
            </div>
          </div>

          <div className="border rounded-2xl p-4 md:p-6 bg-white">
            <h3 className="font-bold mb-2 text-lg md:text-base">Resumen de Ventas del Día</h3>
            <p className="text-gray-500 text-sm mb-4">Ingresos agrupados por método de pago</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <Banknote size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs">Efectivo</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 bg-transparent outline-none" value={ventasEfectivo} onChange={(e) => setVentasEfectivo(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs">Transferencia</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 bg-transparent outline-none" value={ventasTransferencia} onChange={(e) => setVentasTransferencia(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <QrCode size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs">Código QR</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 bg-transparent outline-none" value={ventasQr} onChange={(e) => setVentasQr(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-[#8CC63F]/5 p-4 rounded-xl border border-[#8CC63F]/30">
                <div className="w-10 h-10 bg-[#8CC63F]/20 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <Banknote size={20} />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium">Total</p>
                  <p className="font-bold text-[#8CC63F]">${totalVentas.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-2xl p-4 md:p-6 bg-white">
            <h3 className="font-bold mb-2 text-lg md:text-base">Remesas</h3>
            <p className="text-gray-500 text-sm mb-4">Registre las remesas realizadas durante el día</p>
            <div className="flex flex-col sm:flex-row items-end gap-3 md:gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-gray-600 text-sm font-medium mb-1">Monto de Remesa</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full p-3 bg-white border rounded-xl" value={newRemesa.monto} onChange={(e) => setNewRemesa({ ...newRemesa, monto: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="block text-gray-600 text-sm font-medium mb-1">Motivo de Remesa</label>
                <input type="text" placeholder="Motivo de la remesa..." className="w-full p-3 bg-white border rounded-xl" value={newRemesa.motivo} onChange={(e) => setNewRemesa({ ...newRemesa, motivo: e.target.value })} />
              </div>
              <div>
                <button onClick={() => handleAddRemesa()} className="flex items-center gap-2 text-gray-900">
                  <Plus size={18} /> Agregar Remesa
                </button>
              </div>
            </div>

            {remesas.length > 0 && (
              <div className="mb-4">
                <div className="bg-orange-50 p-4 rounded-xl mb-3">
                  <div className="flex items-center gap-2 text-orange-600 font-medium mb-2">
                    <MinusCircle size={18} /> Total Remesas del Día
                  </div>
                  <p className="text-2xl font-bold text-orange-600">-${totalRemesas.toFixed(2)}</p>
                </div>

                <div className="space-y-2">
                  {remesas.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-white border rounded p-3">
                      <div>
                        <p className="font-medium">-${r.monto.toFixed(2)}</p>
                        {r.motivo && <p className="text-xs text-gray-500">{r.motivo}</p>}
                      </div>
                      <button onClick={() => removeRemesa(r.id)} className="text-red-500 text-sm">Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              <div>
                <label className="block text-gray-900 text-sm font-bold mb-2">Efectivo Contado (Total en Caja)</label>
              <input type="number" className="w-full p-3 bg-gray-50 rounded-xl mb-3 md:mb-4" value={efectivoContado} onChange={(e) => setEfectivoContado(e.target.value)} />

                <div className="bg-blue-50 p-3 md:p-4 rounded-lg text-sm md:text-base">
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Efectivo contado:</span>
                    <span className="font-bold">${parseFloat(efectivoContado || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Apertura (se resta):</span>
                    <span className="font-bold">-${parseFloat(aperturaMonto || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#8CC63F] font-bold">
                    <span>Ventas en efectivo:</span>
                    <span>${Math.max(0, parseFloat(efectivoContado || '0') - parseFloat(aperturaMonto || '0')).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-900 text-sm font-bold mb-2">Transferencias</label>
                <input type="number" className="w-full p-3 bg-gray-50 rounded-xl mb-2" value={transferenciasContado} onChange={(e) => setTransferenciasContado(e.target.value)} />
                <p className="text-gray-500 text-sm">Esperado: ${ventasDia.transferencia.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-gray-900 text-sm font-bold mb-2">Códigos QR</label>
                <input type="number" className="w-full p-3 bg-gray-50 rounded-xl mb-2" value={qrContado} onChange={(e) => setQrContado(e.target.value)} />
                <p className="text-gray-500 text-sm">Esperado: ${ventasDia.qr.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <label className="block text-gray-900 text-sm font-bold mb-2">Notas / Observaciones</label>
              <textarea className="w-full p-3 md:p-4 bg-gray-50 rounded-xl h-20 md:h-24" value={notas} onChange={(e) => setNotas(e.target.value)}></textarea>
            </div>

            <button onClick={handleCerrarCaja} className="w-full mt-4 md:mt-6 bg-[#C81E41] text-white font-bold py-3 md:py-4 rounded-xl">Cerrar Caja</button>
          </div>
        </div>

        {/* Modal Remesa */}
        {isRemesaModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-lg">Agregar Remesa</h3>
                  <p className="text-sm text-gray-500">Ingrese los detalles de la remesa</p>
                </div>
                <button onClick={() => setIsRemesaModalOpen(false)} className="text-gray-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddRemesa} className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Monto de Remesa</label>
                  <input type="number" step="0.01" className="w-full p-3 border rounded-xl" value={newRemesa.monto} onChange={(e) => setNewRemesa({ ...newRemesa, monto: e.target.value })} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Motivo</label>
                  <input type="text" className="w-full p-3 border rounded-xl" value={newRemesa.motivo} onChange={(e) => setNewRemesa({ ...newRemesa, motivo: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsRemesaModalOpen(false)} className="flex-1 py-3 border rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-[#8CC63F] text-white rounded-xl">Agregar Remesa</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
