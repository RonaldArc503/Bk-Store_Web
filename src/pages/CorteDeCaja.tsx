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
  DoorOpen,
  DoorClosed,
} from 'lucide-react'
import { CorteService, type CorteRecord } from '../services/CorteService'
import { useAuth } from '../hooks/useAuth'
import { CajaService } from '../services/CajaService'

/* ─── Helpers ─── */

function formatDateFull(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function localDatetimeString(date?: Date): string {
  const d = date ?? new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${da}T${h}:${mi}`
}

/* ─── Timeline entry (built from corte + optional caja) ─── */

interface TimelineEntry {
  type: 'corte' | 'caja-open'
  corte?: CorteRecord
  caja?: any
  date: string
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = useState(false)

  if (entry.type === 'caja-open') {
    const caja = entry.caja
    return (
      <div className="relative pl-10 pb-6">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 ml-[14px]" />
        <div className="absolute left-[3px] top-1 w-6 h-6 rounded-full bg-lime-100 dark:bg-lime-900/60 border-2 border-lime-500 flex items-center justify-center z-10">
          <Unlock className="w-3 h-3 text-lime-600 dark:text-lime-400" />
        </div>
        <div className="bg-lime-50 dark:bg-lime-950/30 border border-lime-200 dark:border-lime-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400 bg-lime-100 dark:bg-lime-900/40 px-2 py-0.5 rounded">Caja Abierta</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDateFull(caja?.apertura?.fecha || caja?.createdAt)} · {formatTime(caja?.apertura?.fecha || caja?.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">Monto Apertura</span>
              <p className="font-bold text-lime-700 dark:text-lime-300">${fmt(caja?.apertura?.monto ?? 0)}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">Usuario</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{caja?.apertura?.usuario || 'Usuario'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">Ventas Acum.</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">${fmt(caja?.totals?.totalVentas ?? 0)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500" /></span>
            <span className="text-xs text-lime-600 dark:text-lime-400 font-medium">En curso</span>
          </div>
        </div>
      </div>
    )
  }

  const corte = entry.corte!
  const diff = (corte.efectivoContado ?? 0) - (corte.esperadoEfectivo ?? 0)

  return (
    <div className="relative pl-10 pb-6">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 ml-[14px]" />

      {/* Apertura dot */}
      <div className="absolute left-[3px] top-1 w-6 h-6 rounded-full bg-lime-100 dark:bg-lime-900/60 border-2 border-lime-500 flex items-center justify-center z-10">
        <DoorOpen className="w-3 h-3 text-lime-600 dark:text-lime-400" />
      </div>

      {/* Apertura info */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400 bg-lime-50 dark:bg-lime-900/40 px-2 py-0.5 rounded">Apertura</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateFull(corte.aperturaInfo?.fecha || corte.createdAt)} · {formatTime(corte.aperturaInfo?.fecha || corte.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm mt-1">
          <span className="font-bold text-gray-900 dark:text-white">${fmt(corte.aperturaInfo?.monto ?? 0)}</span>
          <span className="text-gray-400">—</span>
          <span className="text-gray-600 dark:text-gray-300">{corte.aperturaInfo?.usuario || 'Usuario'}</span>
        </div>
      </div>

      {/* Cierre dot */}
      <div className="relative">
        <div className="absolute -left-10 top-2 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/60 border-2 border-red-500 flex items-center justify-center z-10 ml-[3px]">
          <DoorClosed className="w-3 h-3 text-red-500 dark:text-red-400" />
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded">Cierre</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDateFull(corte.createdAt)} · {formatTime(corte.createdAt)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Total Ventas</span>
              <p className="text-sm font-bold text-lime-600 dark:text-lime-400">${fmt(corte.totalVentas ?? 0)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Efectivo Contado</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white">${fmt(corte.efectivoContado ?? 0)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Diferencia</span>
              <p className={`text-sm font-bold ${diff >= 0 ? 'text-lime-600 dark:text-lime-400' : 'text-red-500 dark:text-red-400'}`}>
                {diff >= 0 ? '+' : ''}${fmt(diff)}
              </p>
            </div>
            <div className="ml-auto">
              {expanded
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="mt-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 space-y-3 text-sm border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                <p className="font-bold text-lime-600 dark:text-lime-400">${fmt(corte.totalVentas ?? 0)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Efectivo Contado</p>
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
  const [aperturaFecha, setAperturaFecha] = useState(() => localDatetimeString())
  const [aperturaUsuario, setAperturaUsuario] = useState(user?.displayName ?? 'Usuario de Caja')
  const [isAperturaSaved, setIsAperturaSaved] = useState(false)

  const [ventasEfectivo, setVentasEfectivo] = useState('')
  const [ventasTransferencia, setVentasTransferencia] = useState('')
  const [ventasQr, setVentasQr] = useState('')

  const [todayClosed, setTodayClosed] = useState(false)
  const [todayCorte, setTodayCorte] = useState<CorteRecord | null>(null)

  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const ventasDia = {
    efectivo: parseFloat(ventasEfectivo || '0'),
    transferencia: parseFloat(ventasTransferencia || '0'),
    qr: parseFloat(ventasQr || '0'),
  }

  const buildTimeline = (cortes: CorteRecord[], cajas: any[]): TimelineEntry[] => {
    const entries: TimelineEntry[] = []

    const openCajas = cajas.filter((c) => c.status !== 'closed')
    for (const caja of openCajas) {
      entries.push({
        type: 'caja-open',
        caja,
        date: caja.apertura?.fecha || caja.createdAt,
      })
    }

    for (const corte of cortes) {
      entries.push({
        type: 'corte',
        corte,
        date: corte.createdAt,
      })
    }

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return entries
  }

  const reloadData = async () => {
    try {
      const [cajas, cortes, todayC] = await Promise.all([
        CajaService.getAllCajas(),
        CorteService.getAllCortes(),
        CorteService.getTodayCorte(),
      ])
      console.log('[CorteDeCaja] reloadData → cajas:', cajas.length, 'cortes:', cortes.length)
      setTimelineEntries(buildTimeline(cortes, cajas))
      if (todayC) { setTodayClosed(true); setTodayCorte(todayC) }
      setLoadingHistory(false)
    } catch (err) {
      console.error('[CorteDeCaja] reloadData error', err)
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [active, existing, cajas, cortes] = await Promise.all([
          CajaService.getActiveCaja(user?.uid),
          CorteService.getTodayCorte(),
          CajaService.getAllCajas(),
          CorteService.getAllCortes(),
        ])
        if (!mounted) return

        console.log('[CorteDeCaja] init → cajas:', cajas.length, 'cortes:', cortes.length, 'active:', !!active, 'todayCorte:', !!existing)

        if (existing) { setTodayClosed(true); setTodayCorte(existing) }
        setTimelineEntries(buildTimeline(cortes, cajas))
        setLoadingHistory(false)

        if (active && active.status !== 'closed') {
          setIsCajaOpen(true)
          setAperturaMonto(String(active.apertura?.monto ?? ''))
          setAperturaFecha(active.apertura?.fecha ? localDatetimeString(new Date(active.apertura.fecha)) : localDatetimeString())
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
        console.error('[CorteDeCaja] init error', err)
        if (mounted) { setIsCajaOpen(false); setLoadingHistory(false) }
      }
    })()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveApertura = async () => {
    if (isAperturaSaved) { alert('Apertura ya guardada'); return }
    if (todayClosed) { alert('Ya se realizó un cierre hoy.'); return }
    try {
      const now = new Date()
      const aperturaInfo: { monto: number; fecha: string; usuario: string; createdBy?: string } = {
        monto: parseFloat(aperturaMonto || '0'),
        fecha: aperturaFecha ? new Date(aperturaFecha).toISOString() : now.toISOString(),
        usuario: aperturaUsuario || 'Usuario de Caja',
      }
      if (user?.uid) aperturaInfo.createdBy = user.uid
      setAperturaFecha(localDatetimeString(aperturaFecha ? new Date(aperturaFecha) : now))

      const active = await CajaService.getActiveCaja(user?.uid)
      if (active && active.id) { setIsAperturaSaved(true); setIsCajaOpen(true); return }

      await CajaService.openCaja(aperturaInfo)
      setIsAperturaSaved(true)
      setIsCajaOpen(true)
      await reloadData()
      alert('Apertura guardada correctamente')
    } catch (err) {
      console.error('Error saving apertura', err)
      alert('Error al guardar la apertura')
    }
  }

  const handleOpenView = async () => {
    if (todayClosed) { alert('Ya se realizó un cierre hoy.'); return }
    try {
      const active = await CajaService.getActiveCaja(user?.uid)
      if (active) {
        setIsCajaOpen(active.status !== 'closed')
        setAperturaMonto(String(active.apertura?.monto ?? ''))
        setAperturaFecha(active.apertura?.fecha ? localDatetimeString(new Date(active.apertura.fecha)) : localDatetimeString())
        setAperturaUsuario(active.apertura?.usuario ?? user?.displayName ?? 'Usuario de Caja')
        setVentasEfectivo(String(active.totals?.efectivo ?? ''))
        setVentasTransferencia(String(active.totals?.transferencia ?? ''))
        setVentasQr(String(active.totals?.qr ?? ''))
        setRemesas(active.remesas || [])
        setIsAperturaSaved(Boolean(active.apertura))
      } else {
        setIsAperturaSaved(false)
        setAperturaMonto('')
        setAperturaFecha(localDatetimeString())
        setAperturaUsuario(user?.displayName ?? 'Usuario de Caja')
        setVentasEfectivo(''); setVentasTransferencia(''); setVentasQr('')
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
    const alreadyClosed = await CorteService.hasTodayCorte()
    if (alreadyClosed) { alert('Ya se realizó un cierre hoy.'); setTodayClosed(true); return }
    if (!window.confirm('¿Está seguro que desea cerrar la caja?')) return

    const cleanRemesas = remesas.map((r) => ({ id: r.id, monto: r.monto, motivo: r.motivo || '' }))
    const corte = {
      aperturaInfo: {
        monto: parseFloat(aperturaMonto || '0'),
        fecha: aperturaFecha ? new Date(aperturaFecha).toISOString() : new Date().toISOString(),
        usuario: aperturaUsuario || 'Usuario de Caja',
      },
      ventasDia: { efectivo: ventasDia.efectivo, transferencia: ventasDia.transferencia, qr: ventasDia.qr },
      totalVentas, remesas: cleanRemesas, totalRemesas,
      efectivoContado: parseFloat(efectivoContado || '0'),
      transferenciasContado: parseFloat(transferenciasContado || '0'),
      qrContado: parseFloat(qrContado || '0'),
      esperadoEfectivo,
      notas: notas || '',
      createdBy: user?.uid || 'anonymous',
      createdAt: new Date().toISOString(),
    }

    try {
      const created = await CorteService.saveCorte(corte)
      try {
        const active = await CajaService.getActiveCaja(user?.uid)
        if (active && active.id) await CajaService.closeCaja(active.id, { corteId: created.id, closedAt: new Date().toISOString() })
      } catch (err) { console.error('Error closing active caja:', err) }

      setIsCajaOpen(false)
      setTodayClosed(true)
      setTodayCorte(created.corte as CorteRecord)
      await reloadData()
      alert('Cierre de caja guardado correctamente')
    } catch (err) {
      console.error('Error saving corte', err)
      alert('Error al guardar el cierre: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  /* ─── Historial compartido (timeline) ─── */
  const HistoryTimeline = () => (
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <History className="w-5 h-5 text-gray-400" />
        Historial de Aperturas y Cierres
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Línea de tiempo completa del flujo de caja
      </p>

      {loadingHistory ? (
        <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
          <Clock className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando historial…</span>
        </div>
      ) : timelineEntries.length === 0 ? (
        <div className="text-center py-10">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No hay registros de caja aún</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Abre tu primera caja para comenzar a registrar el historial
          </p>
        </div>
      ) : (
        <div className="relative">
          {timelineEntries.map((entry, i) => (
            <TimelineCard key={entry.corte?.id || entry.caja?.id || i} entry={entry} />
          ))}
          <div className="absolute left-[14px] bottom-0 w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 z-10" />
        </div>
      )}
    </div>
  )

  /* ─── Vista: Caja Cerrada ─── */
  if (!isCajaOpen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
        <Sidebar activeItem="corte" />
        <div className="flex-1 p-4 md:p-8 pt-20 md:pt-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-4 md:pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"><ChevronLeft size={20} /></button>
                <h2 className="text-xl md:text-2xl font-bold">Corte de Caja</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Gestione la apertura y cierre de caja diario</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
                <Lock size={18} /> Caja Cerrada
              </div>
              <button
                onClick={() => handleOpenView()}
                disabled={todayClosed}
                className="px-4 py-2 bg-[#8CC63F] text-white rounded-lg text-sm font-medium hover:bg-[#7ab535] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >Abrir Caja</button>
            </div>
          </div>

          {/* Aviso cierre hoy */}
          {todayClosed && todayCorte && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Ya se realizó un cierre de caja hoy</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Cierre a las {formatTime(todayCorte.createdAt)} por {todayCorte.aperturaInfo?.usuario || 'Usuario'} — Ventas: ${fmt(todayCorte.totalVentas ?? 0)}
                </p>
              </div>
            </div>
          )}

          {/* Resumen del día */}
          {todayCorte && (
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-lime-500" /> Resumen del Día</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Apertura</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${fmt(todayCorte.aperturaInfo?.monto ?? 0)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Ventas</p>
                  <p className="text-lg font-bold text-lime-600 dark:text-lime-400">${fmt(todayCorte.totalVentas ?? 0)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo Contado</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${fmt(todayCorte.efectivoContado ?? 0)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia</p>
                  {(() => {
                    const d = (todayCorte.efectivoContado ?? 0) - (todayCorte.esperadoEfectivo ?? 0)
                    return <p className={`text-lg font-bold ${d >= 0 ? 'text-lime-600 dark:text-lime-400' : 'text-red-500 dark:text-red-400'}`}>{d >= 0 ? '+' : ''}${fmt(d)}</p>
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <HistoryTimeline />
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
              <button className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"><ChevronLeft size={20} /></button>
              <h2 className="text-xl md:text-2xl font-bold">Corte de Caja</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gestione la apertura y cierre de caja diario</p>
          </div>
          <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-lime-50 dark:bg-lime-950/30 text-lime-600 dark:text-lime-400 rounded-lg text-sm font-medium">
            <Unlock size={18} /> Caja Abierta
          </div>
        </div>

        {todayClosed && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Ya existe un cierre hoy. No se podrá realizar otro cierre.</p>
          </div>
        )}

        <div className="space-y-4 md:space-y-6 w-full">
          {/* Apertura */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
            <h3 className="font-bold mb-4 text-lg">Información de Apertura</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Monto de Apertura</label>
                <input type="number" step="0.01" className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-xl md:text-2xl font-bold text-[#8CC63F] bg-white dark:bg-gray-800" value={aperturaMonto} onChange={(e) => setAperturaMonto(e.target.value)} placeholder="0.00" disabled={isAperturaSaved} />
              </div>
              <div>
                <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Fecha y Hora</label>
                <input type="datetime-local" className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 text-sm bg-white dark:bg-gray-800" value={aperturaFecha} onChange={(e) => setAperturaFecha(e.target.value)} disabled={isAperturaSaved} />
              </div>
              <div>
                <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Usuario Responsable</label>
                <input type="text" className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 text-sm bg-white dark:bg-gray-800" value={aperturaUsuario} onChange={(e) => setAperturaUsuario(e.target.value)} disabled={isAperturaSaved} />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              {!isAperturaSaved ? (
                <button onClick={handleSaveApertura} className="px-4 py-2 bg-[#8CC63F] text-white rounded-lg hover:bg-[#7ab535] transition">Guardar Apertura</button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-lime-50 dark:bg-lime-900/30 rounded-lg text-lime-700 dark:text-lime-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-lime-500" /> Apertura guardada
                </div>
              )}
            </div>
          </div>

          {/* Ventas del día */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
            <h3 className="font-bold mb-2 text-lg">Resumen de Ventas del Día</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Ingresos agrupados por método de pago</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center"><Banknote size={20} /></div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Efectivo</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 dark:text-white bg-transparent outline-none" value={ventasEfectivo} onChange={(e) => setVentasEfectivo(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center"><CreditCard size={20} /></div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Transferencia</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 dark:text-white bg-transparent outline-none" value={ventasTransferencia} onChange={(e) => setVentasTransferencia(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg flex items-center justify-center"><QrCode size={20} /></div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Código QR</p>
                  <input type="number" step="0.01" className="w-full p-1 text-lg font-bold text-gray-900 dark:text-white bg-transparent outline-none" value={ventasQr} onChange={(e) => setVentasQr(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-[#8CC63F]/5 dark:bg-[#8CC63F]/10 p-4 rounded-xl border border-[#8CC63F]/30">
                <div className="w-10 h-10 bg-[#8CC63F]/20 text-[#8CC63F] rounded-lg flex items-center justify-center"><Banknote size={20} /></div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Total</p>
                  <p className="font-bold text-[#8CC63F]">${fmt(totalVentas)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Remesas y Cierre */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
            <h3 className="font-bold mb-2 text-lg">Remesas</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Registre las remesas realizadas durante el día</p>
            <div className="flex flex-col sm:flex-row items-end gap-3 md:gap-4 mb-4">
              <div className="flex-1 w-full">
                <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Monto</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" value={newRemesa.monto} onChange={(e) => setNewRemesa({ ...newRemesa, monto: e.target.value })} />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Motivo</label>
                <input type="text" placeholder="Motivo..." className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" value={newRemesa.motivo} onChange={(e) => setNewRemesa({ ...newRemesa, motivo: e.target.value })} />
              </div>
              <button onClick={() => handleAddRemesa()} className="flex items-center gap-2 text-gray-900 dark:text-gray-100 whitespace-nowrap"><Plus size={18} /> Agregar</button>
            </div>

            {remesas.length > 0 && (
              <div className="mb-4">
                <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl mb-3">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium mb-2"><MinusCircle size={18} /> Total Remesas</div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">-${fmt(totalRemesas)}</p>
                </div>
                <div className="space-y-2">
                  {remesas.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded p-3">
                      <div><p className="font-medium">-${fmt(r.monto)}</p>{r.motivo && <p className="text-xs text-gray-500 dark:text-gray-400">{r.motivo}</p>}</div>
                      <button onClick={() => removeRemesa(r.id)} className="text-red-500 text-sm">Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              <div>
                <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Efectivo Contado</label>
                <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-3" value={efectivoContado} onChange={(e) => setEfectivoContado(e.target.value)} />
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm">
                  <div className="flex justify-between text-blue-600 dark:text-blue-400"><span>Contado:</span><span className="font-bold">${fmt(parseFloat(efectivoContado || '0'))}</span></div>
                  <div className="flex justify-between text-blue-600 dark:text-blue-400"><span>Apertura:</span><span className="font-bold">-${fmt(parseFloat(aperturaMonto || '0'))}</span></div>
                  <div className="flex justify-between text-[#8CC63F] font-bold"><span>Ventas efectivo:</span><span>${fmt(Math.max(0, parseFloat(efectivoContado || '0') - parseFloat(aperturaMonto || '0')))}</span></div>
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
              <textarea className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl h-20" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>

            <button onClick={handleCerrarCaja} disabled={todayClosed} className="w-full mt-4 md:mt-6 bg-[#C81E41] text-white font-bold py-3 md:py-4 rounded-xl hover:bg-[#a91835] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {todayClosed ? 'Cierre ya realizado hoy' : 'Cerrar Caja'}
            </button>
          </div>

          {/* Timeline */}
          <HistoryTimeline />
        </div>

        {isRemesaModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <div><h3 className="font-bold text-lg">Agregar Remesa</h3><p className="text-sm text-gray-500 dark:text-gray-400">Detalles de la remesa</p></div>
                <button onClick={() => setIsRemesaModalOpen(false)} className="text-gray-400"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddRemesa} className="space-y-3">
                <div><label className="block text-sm font-bold mb-1">Monto</label><input type="number" step="0.01" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" value={newRemesa.monto} onChange={(e) => setNewRemesa({ ...newRemesa, monto: e.target.value })} autoFocus /></div>
                <div><label className="block text-sm font-bold mb-1">Motivo</label><input type="text" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" value={newRemesa.motivo} onChange={(e) => setNewRemesa({ ...newRemesa, motivo: e.target.value })} /></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsRemesaModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-[#8CC63F] text-white rounded-xl">Agregar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
