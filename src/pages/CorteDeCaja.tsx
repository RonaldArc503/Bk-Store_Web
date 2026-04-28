import React, { useState, useEffect } from 'react'
import { Sidebar } from '../components/Sidebar'
import {
  ChevronLeft,
  Lock,
  Unlock,
  Banknote,
  CreditCard,
  QrCode,
  MinusCircle,
  Plus,
  X,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { CorteService, type CorteRecord } from '../services/CorteService'
import { useAuth } from '../hooks/useAuth'
import { CajaService } from '../services/CajaService'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ─── Historial expandible ─── */

function CorteHistoryRow({ corte }: { corte: CorteRecord }) {
  const [open, setOpen] = useState(false)
  const diff =
    corte.efectivoContado - corte.esperadoEfectivo

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-lime-100 dark:bg-lime-950/40 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-lime-600 dark:text-lime-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(corte.createdAt)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cierre a las {formatTime(corte.createdAt)} · {corte.aperturaInfo?.usuario || 'Usuario'}
          </p>
        </div>
        <div className="text-right shrink-0 mr-2">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            ${fmt(corte.totalVentas ?? 0)}
          </p>
          <p className={`text-xs font-medium ${diff >= 0 ? 'text-lime-600 dark:text-lime-400' : 'text-red-500 dark:text-red-400'}`}>
            {diff >= 0 ? '+' : ''}{fmt(diff)}
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Apertura</p>
              <p className="font-medium text-gray-900 dark:text-white">${fmt(corte.aperturaInfo?.monto ?? 0)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Efectivo</p>
              <p className="font-medium text-gray-900 dark:text-white">${fmt(corte.ventasDia?.efectivo ?? 0)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Transferencia</p>
              <p className="font-medium text-gray-900 dark:text-white">${fmt(corte.ventasDia?.transferencia ?? 0)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">QR</p>
              <p className="font-medium text-gray-900 dark:text-white">${fmt(corte.ventasDia?.qr ?? 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Efectivo contado</p>
              <p className="font-medium text-gray-900 dark:text-white">${fmt(corte.efectivoContado ?? 0)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Esperado</p>
              <p className="font-medium text-gray-900 dark:text-white">${fmt(corte.esperadoEfectivo ?? 0)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Remesas</p>
              <p className="font-medium text-orange-600 dark:text-orange-400">
                {(corte.totalRemesas ?? 0) > 0 ? `-$${fmt(corte.totalRemesas)}` : '$0.00'}
              </p>
            </div>
          </div>

          {corte.notas && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Notas</p>
              <p className="text-gray-700 dark:text-gray-300 mt-0.5">{corte.notas}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Componente principal ─── */

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

  const [aperturaMonto, setAperturaMonto] = useState('')
  const [aperturaFecha, setAperturaFecha] = useState(() => new Date().toISOString().slice(0, 16))
  const [aperturaUsuario, setAperturaUsuario] = useState(user?.displayName ?? 'Usuario de Caja')
  const [isAperturaSaved, setIsAperturaSaved] = useState(false)

  const [ventasEfectivo, setVentasEfectivo] = useState('')
  const [ventasTransferencia, setVentasTransferencia] = useState('')
  const [ventasQr, setVentasQr] = useState('')

  // Validación y historial
  const [todayClosed, setTodayClosed] = useState(false)
  const [todayCorte, setTodayCorte] = useState<CorteRecord | null>(null)
  const [history, setHistory] = useState<CorteRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const ventasDia = {
    efectivo: parseFloat(ventasEfectivo || '0'),
    transferencia: parseFloat(ventasTransferencia || '0'),
    qr: parseFloat(ventasQr || '0'),
  }

  // Cargar estado de caja activa + historial
  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const [active, existing, allCortes] = await Promise.all([
          CajaService.getActiveCaja(user?.uid),
          CorteService.getTodayCorte(),
          CorteService.getAllCortes(),
        ])

        if (!mounted) return

        if (existing) {
          setTodayClosed(true)
          setTodayCorte(existing)
        }

        setHistory(allCortes)
        setLoadingHistory(false)

        if (active && active.status !== 'closed') {
          setIsCajaOpen(true)
          setAperturaMonto(String(active.apertura?.monto ?? ''))
          setAperturaFecha(
            active.apertura?.fecha
              ? new Date(active.apertura.fecha).toISOString().slice(0, 16)
              : new Date().toISOString().slice(0, 16),
          )
          setAperturaUsuario(active.apertura?.usuario ?? user?.displayName ?? 'Usuario de Caja')
          setVentasEfectivo(String(active.totals?.efectivo ?? ''))
          setVentasTransferencia(String(active.totals?.transferencia ?? ''))
          setVentasQr(String(active.totals?.qr ?? ''))
          setRemesas(active.remesas || [])
          setIsAperturaSaved(Boolean(active.apertura))
        } else {
          setIsCajaOpen(false)
          setIsAperturaSaved(false)
        }
      } catch (err) {
        console.error('Error loading caja state', err)
        setIsCajaOpen(false)
        setLoadingHistory(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveApertura = async () => {
    if (isAperturaSaved) {
      alert('Apertura ya guardada')
      return
    }
    if (todayClosed) {
      alert('Ya se realizó un cierre de caja hoy. No se puede abrir otra caja.')
      return
    }

    try {
      const aperturaInfo: { monto: number; fecha: string; usuario: string; createdBy?: string } = {
        monto: parseFloat(aperturaMonto || '0'),
        fecha: aperturaFecha ? new Date(aperturaFecha).toISOString() : new Date().toISOString(),
        usuario: aperturaUsuario,
      }
      if (user?.uid) aperturaInfo.createdBy = user.uid

      const active = await CajaService.getActiveCaja(user?.uid)
      if (active && active.id) {
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
    if (todayClosed) {
      alert('Ya se realizó un cierre de caja hoy. No se puede abrir otra caja hasta mañana.')
      return
    }

    try {
      const active = await CajaService.getActiveCaja(user?.uid)
      if (active) {
        setIsCajaOpen(active.status !== 'closed')
        setAperturaMonto(String(active.apertura?.monto ?? ''))
        setAperturaFecha(
          active.apertura?.fecha
            ? new Date(active.apertura.fecha).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        )
        setAperturaUsuario(active.apertura?.usuario ?? user?.displayName ?? 'Usuario de Caja')
        setVentasEfectivo(String(active.totals?.efectivo ?? ''))
        setVentasTransferencia(String(active.totals?.transferencia ?? ''))
        setVentasQr(String(active.totals?.qr ?? ''))
        setRemesas(active.remesas || [])
        setIsAperturaSaved(Boolean(active.apertura))
      } else {
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
    // Validación: solo un cierre por día
    const alreadyClosed = await CorteService.hasTodayCorte()
    if (alreadyClosed) {
      alert('Ya se realizó un cierre de caja el día de hoy. Solo se permite un cierre por día.')
      setTodayClosed(true)
      return
    }

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

      try {
        const active = await CajaService.getActiveCaja(user?.uid)
        if (active && active.id) {
          await CajaService.closeCaja(active.id, { corteId: created.id, corte })
        }
      } catch (err) {
        console.error('Error closing active caja after corte:', err)
      }

      setIsCajaOpen(false)
      setTodayClosed(true)
      setTodayCorte(created.corte as CorteRecord)

      // Refrescar historial
      const allCortes = await CorteService.getAllCortes()
      setHistory(allCortes)

      alert('Cierre de caja guardado correctamente')
    } catch (err) {
      console.error('Error saving corte', err)
      alert('Error al guardar el cierre de caja')
    }
  }

  /* ─── Vista: Caja Cerrada ─── */
  if (!isCajaOpen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
        <Sidebar activeItem="corte" />
        <div className="flex-1 p-4 md:p-8 pt-20 md:pt-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 md:pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl md:text-2xl font-bold">Corte de Caja</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                Gestione la apertura y cierre de caja diario
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm md:text-base">
                <Lock size={18} />
                Caja Cerrada
              </div>
              <button
                onClick={() => handleOpenView()}
                disabled={todayClosed}
                className="px-3 md:px-4 py-2 bg-[#8CC63F] text-white rounded-lg text-sm md:text-base hover:bg-[#7ab535] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abrir Caja
              </button>
            </div>
          </div>

          {/* Aviso: ya se hizo cierre hoy */}
          {todayClosed && todayCorte && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Ya se realizó un cierre de caja hoy
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Cierre registrado a las {formatTime(todayCorte.createdAt)} por{' '}
                  {todayCorte.aperturaInfo?.usuario || 'Usuario'} — Total ventas: $
                  {fmt(todayCorte.totalVentas ?? 0)}. Solo se permite un cierre por día.
                </p>
              </div>
            </div>
          )}

          {/* Resumen del último cierre */}
          {todayCorte && (
            <div className="mb-6 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-lime-500" />
                Cierre de Hoy
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Apertura</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${fmt(todayCorte.aperturaInfo?.monto ?? 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Ventas</p>
                  <p className="text-lg font-bold text-lime-600 dark:text-lime-400">
                    ${fmt(todayCorte.totalVentas ?? 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo Contado</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${fmt(todayCorte.efectivoContado ?? 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia</p>
                  {(() => {
                    const d = (todayCorte.efectivoContado ?? 0) - (todayCorte.esperadoEfectivo ?? 0)
                    return (
                      <p className={`text-lg font-bold ${d >= 0 ? 'text-lime-600 dark:text-lime-400' : 'text-red-500 dark:text-red-400'}`}>
                        {d >= 0 ? '+' : ''}${fmt(d)}
                      </p>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Historial de Cierres
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Registro de todas las aperturas y cierres de caja
            </p>

            {loadingHistory ? (
              <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
                <Clock className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando historial…</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No hay cierres registrados aún
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((corte) => (
                  <CorteHistoryRow key={corte.id} corte={corte} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ─── Vista: Caja Abierta ─── */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="corte" />
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl md:text-2xl font-bold">Corte de Caja</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
              Gestione la apertura y cierre de caja diario
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg text-sm md:text-base">
            <Unlock size={18} />
            Caja Abierta
          </div>
        </div>

        {/* Aviso si ya existe cierre hoy */}
        {todayClosed && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Ya existe un cierre de caja registrado hoy. No se podrá realizar otro cierre.
            </p>
          </div>
        )}

        <div className="space-y-4 md:space-y-6 w-full">
          {/* Apertura */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
            <h3 className="font-bold mb-4 text-lg md:text-base">Información de Apertura</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="text-gray-500 dark:text-gray-400 text-xs md:text-sm block mb-1">Monto de Apertura</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-xl md:text-2xl font-bold text-[#8CC63F] bg-white dark:bg-gray-800"
                  value={aperturaMonto}
                  onChange={(e) => setAperturaMonto(e.target.value)}
                  placeholder="0.00"
                  disabled={isAperturaSaved}
                />
              </div>
              <div>
                <label className="text-gray-500 dark:text-gray-400 text-xs md:text-sm block mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 text-sm md:text-base bg-white dark:bg-gray-800"
                  value={aperturaFecha}
                  onChange={(e) => setAperturaFecha(e.target.value)}
                  disabled={isAperturaSaved}
                />
              </div>
              <div>
                <label className="text-gray-500 dark:text-gray-400 text-xs md:text-sm block mb-1">Usuario Responsable</label>
                <input
                  type="text"
                  className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 text-sm md:text-base bg-white dark:bg-gray-800"
                  value={aperturaUsuario}
                  onChange={(e) => setAperturaUsuario(e.target.value)}
                  disabled={isAperturaSaved}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              {!isAperturaSaved ? (
                <button onClick={handleSaveApertura} className="px-4 py-2 bg-[#8CC63F] text-white rounded-lg hover:bg-[#7ab535] transition">
                  Guardar Apertura
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-lime-500" />
                  Apertura guardada
                </div>
              )}
            </div>
          </div>

          {/* Ventas del día */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
            <h3 className="font-bold mb-2 text-lg md:text-base">Resumen de Ventas del Día</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Ingresos agrupados por método de pago</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <Banknote size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Efectivo</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 dark:text-white bg-transparent outline-none" value={ventasEfectivo} onChange={(e) => setVentasEfectivo(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Transferencia</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 dark:text-white bg-transparent outline-none" value={ventasTransferencia} onChange={(e) => setVentasTransferencia(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <QrCode size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Código QR</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 dark:text-white bg-transparent outline-none" value={ventasQr} onChange={(e) => setVentasQr(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-[#8CC63F]/5 dark:bg-[#8CC63F]/10 p-4 rounded-xl border border-[#8CC63F]/30">
                <div className="w-10 h-10 bg-[#8CC63F]/20 text-[#8CC63F] rounded-lg flex items-center justify-center">
                  <Banknote size={20} />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Total</p>
                  <p className="font-bold text-[#8CC63F]">${fmt(totalVentas)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Remesas y Cierre */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
            <h3 className="font-bold mb-2 text-lg md:text-base">Remesas</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Registre las remesas realizadas durante el día</p>
            <div className="flex flex-col sm:flex-row items-end gap-3 md:gap-4 mb-4">
              <div className="flex-1 w-full">
                <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Monto de Remesa</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" value={newRemesa.monto} onChange={(e) => setNewRemesa({ ...newRemesa, monto: e.target.value })} />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Motivo de Remesa</label>
                <input type="text" placeholder="Motivo de la remesa..." className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" value={newRemesa.motivo} onChange={(e) => setNewRemesa({ ...newRemesa, motivo: e.target.value })} />
              </div>
              <div>
                <button onClick={() => handleAddRemesa()} className="flex items-center gap-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  <Plus size={18} /> Agregar Remesa
                </button>
              </div>
            </div>

            {remesas.length > 0 && (
              <div className="mb-4">
                <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl mb-3">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium mb-2">
                    <MinusCircle size={18} /> Total Remesas del Día
                  </div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">-${fmt(totalRemesas)}</p>
                </div>
                <div className="space-y-2">
                  {remesas.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded p-3">
                      <div>
                        <p className="font-medium">-${fmt(r.monto)}</p>
                        {r.motivo && <p className="text-xs text-gray-500 dark:text-gray-400">{r.motivo}</p>}
                      </div>
                      <button onClick={() => removeRemesa(r.id)} className="text-red-500 text-sm">Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              <div>
                <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Efectivo Contado (Total en Caja)</label>
                <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-3 md:mb-4" value={efectivoContado} onChange={(e) => setEfectivoContado(e.target.value)} />
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 md:p-4 rounded-lg text-sm md:text-base">
                  <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                    <span>Efectivo contado:</span>
                    <span className="font-bold">${fmt(parseFloat(efectivoContado || '0'))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                    <span>Apertura (se resta):</span>
                    <span className="font-bold">-${fmt(parseFloat(aperturaMonto || '0'))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#8CC63F] font-bold">
                    <span>Ventas en efectivo:</span>
                    <span>${fmt(Math.max(0, parseFloat(efectivoContado || '0') - parseFloat(aperturaMonto || '0')))}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Transferencias</label>
                <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-2" value={transferenciasContado} onChange={(e) => setTransferenciasContado(e.target.value)} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Esperado: ${fmt(ventasDia.transferencia)}</p>
              </div>
              <div>
                <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Códigos QR</label>
                <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-2" value={qrContado} onChange={(e) => setQrContado(e.target.value)} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Esperado: ${fmt(ventasDia.qr)}</p>
              </div>
            </div>

            <div>
              <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Notas / Observaciones</label>
              <textarea className="w-full p-3 md:p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl h-20 md:h-24" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>

            <button
              onClick={handleCerrarCaja}
              disabled={todayClosed}
              className="w-full mt-4 md:mt-6 bg-[#C81E41] text-white font-bold py-3 md:py-4 rounded-xl hover:bg-[#a91835] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {todayClosed ? 'Cierre ya realizado hoy' : 'Cerrar Caja'}
            </button>

            {todayClosed && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400 mt-2">
                Solo se permite un cierre de caja por día.
              </p>
            )}
          </div>
        </div>

        {/* Modal Remesa */}
        {isRemesaModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-lg">Agregar Remesa</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ingrese los detalles de la remesa</p>
                </div>
                <button onClick={() => setIsRemesaModalOpen(false)} className="text-gray-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddRemesa} className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Monto de Remesa</label>
                  <input type="number" step="0.01" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" value={newRemesa.monto} onChange={(e) => setNewRemesa({ ...newRemesa, monto: e.target.value })} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Motivo</label>
                  <input type="text" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" value={newRemesa.motivo} onChange={(e) => setNewRemesa({ ...newRemesa, motivo: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsRemesaModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl">Cancelar</button>
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
