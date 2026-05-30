import {
  useEffect,
  useRef,
  useState,
  useReducer,
  useCallback,
} from "react";
import { Sidebar } from "../components/Sidebar";
import {
  ChevronLeft,
  Lock,
  Unlock,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  QrCode,
  MinusCircle,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { CorteService, type CorteRecord } from "../services/CorteService";
import { useAuth } from "../hooks/useAuth";
import {
  CajaService,
  getLocalDateKey,
  getCajaDayKey,
  isCajaFromToday,
} from "../services/CajaService";
import { toast } from "react-toastify";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useSettings } from "../context/SettingsContext";
import { getResolvedBranding } from "../constants/branding";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* ────────────────────────────────────────────────────────────────────────── */
/* Tipos y Helpers                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function formatDateFull(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function localDatetimeString(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

function toDateKeyFromIso(iso: string) {
  try {
    const date = new Date(iso);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return iso.slice(0, 10);
  }
}

type CorteWithDateKey = CorteRecord & { dateKey?: string };

/** Fecha del corte en YYYY-MM-DD (zona local). Prioriza dateKey guardado en Firebase. */
function getCorteDateKey(corte: CorteWithDateKey): string {
  if (corte.dateKey) return corte.dateKey;
  return toDateKeyFromIso(corte.createdAt || new Date().toISOString());
}

/** El corte pertenece estrictamente al día calendario actual (no ayer ni mañana). */
function isCorteFromToday(corte: CorteWithDateKey): boolean {
  return getCorteDateKey(corte) === getLocalDateKey();
}

// Firebase guarda remesas/retiros como objeto, no como array
function remesasToArray(remesas: any): { id: number; monto: number; motivo?: string }[] {
  if (!remesas) return [];
  if (Array.isArray(remesas)) return remesas;
  return Object.values(remesas);
}

interface TimelineEntry {
  id: string;
  type: "corte" | "caja-open";
  corte?: CorteRecord;
  caja?: any;
  date: string;
  dateKey: string;
}

interface TimelineDayGroup {
  key: string;
  label: string;
  entries: TimelineEntry[];
  openCount: number;
  closeCount: number;
  totalVentas: number;
  totalRetiros: number;
  totalDiferencia: number;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Estado con useReducer                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

interface CorteState {
  isCajaOpen: boolean;
  closePrepMode: boolean;
  aperturaAuto: boolean;
  retiros: { id: number; monto: number; motivo?: string }[];
  efectivoContado: string;
  transferenciasContado: string;
  qrContado: string;
  tarjetaContado: string;
  notas: string;
  aperturaMonto: string;
  aperturaFecha: string;
  aperturaUsuario: string;
  isAperturaSaved: boolean;
  activeCajaId: string | null;
  ventasDia: {
    efectivo: number;
    transferencia: number;
    qr: number;
    tarjeta: number;
  };
  todayClosed: boolean;
  todayCorte: CorteRecord | null;
  loadingHistory: boolean;
  timelineEntries: TimelineEntry[];
  selectedDayKey: string | null;
  closeConfirmStep: "none" | "review" | "final";
  closeConfirmPhrase: string;
  closeConfirmAck: boolean;
  historyFilterMonth: string;
  previewData: any | null;
  requiredNote: boolean;
}

type CorteAction =
  | { type: "SET_CAJA_OPEN"; payload: boolean }
  | { type: "SET_CLOSE_PREP_MODE"; payload: boolean }
  | { type: "SET_APERTURA_AUTO"; payload: boolean }
  | { type: "APPLY_CLOSE_AUTOFILL"; payload: { efectivoEsperado: number; ventasDia: CorteState["ventasDia"] } }
  | { type: "SET_RETIROS"; payload: { id: number; monto: number; motivo?: string }[] }
  | { type: "ADD_RETIRO"; payload: { id: number; monto: number; motivo?: string } }
  | { type: "REMOVE_RETIRO"; payload: number }
  | { type: "SET_EFECTIVO_CONTADO"; payload: string }
  | { type: "SET_TRANSFERENCIAS_CONTADO"; payload: string }
  | { type: "SET_QR_CONTADO"; payload: string }
  | { type: "SET_TARJETA_CONTADO"; payload: string }
  | { type: "SET_NOTAS"; payload: string }
  | { type: "SET_APERTURA_MONTO"; payload: string }
  | { type: "SET_APERTURA_FECHA"; payload: string }
  | { type: "SET_APERTURA_USUARIO"; payload: string }
  | { type: "SET_APERTURA_SAVED"; payload: boolean }
  | { type: "SET_ACTIVE_CAJA_ID"; payload: string | null }
  | { type: "SET_VENTAS_DIA"; payload: { efectivo: number; transferencia: number; qr: number; tarjeta: number } }
  | { type: "SET_TODAY_CLOSED"; payload: boolean }
  | { type: "SET_TODAY_CORTE"; payload: CorteRecord | null }
  | { type: "SET_LOADING_HISTORY"; payload: boolean }
  | { type: "SET_TIMELINE_ENTRIES"; payload: TimelineEntry[] }
  | { type: "SET_SELECTED_DAY_KEY"; payload: string | null }
  | { type: "SET_CLOSE_CONFIRM_STEP"; payload: "none" | "review" | "final" }
  | { type: "SET_CLOSE_CONFIRM_PHRASE"; payload: string }
  | { type: "SET_CLOSE_CONFIRM_ACK"; payload: boolean }
  | { type: "RESET_CLOSE_CONFIRM" }
  | { type: "SET_HISTORY_FILTER_MONTH"; payload: string }
  | { type: "SET_PREVIEW_DATA"; payload: any }
  | { type: "SET_REQUIRED_NOTE"; payload: boolean }
  | { type: "RESET_OPENING" }
  | { type: "LOAD_CAJA_DATA"; payload: any };

const initialState: CorteState = {
  isCajaOpen: false,
  closePrepMode: false,
  aperturaAuto: false,
  retiros: [],
  efectivoContado: "0.00",
  transferenciasContado: "0.00",
  qrContado: "0.00",
  tarjetaContado: "0.00",
  notas: "",
  aperturaMonto: "",
  aperturaFecha: localDatetimeString(),
  aperturaUsuario: "",
  isAperturaSaved: false,
  activeCajaId: null,
  ventasDia: { efectivo: 0, transferencia: 0, qr: 0, tarjeta: 0 },
  todayClosed: false,
  todayCorte: null,
  loadingHistory: true,
  timelineEntries: [],
  selectedDayKey: null,
  closeConfirmStep: "none",
  closeConfirmPhrase: "",
  closeConfirmAck: false,
  historyFilterMonth: "",
  previewData: null,
  requiredNote: false,
};

function corteReducer(state: CorteState, action: CorteAction): CorteState {
  switch (action.type) {
    case "SET_CAJA_OPEN": return { ...state, isCajaOpen: action.payload };
    case "SET_CLOSE_PREP_MODE": return { ...state, closePrepMode: action.payload };
    case "SET_APERTURA_AUTO": return { ...state, aperturaAuto: action.payload };
    case "APPLY_CLOSE_AUTOFILL":
      return {
        ...state,
        efectivoContado: action.payload.efectivoEsperado.toFixed(2),
        transferenciasContado: action.payload.ventasDia.transferencia.toFixed(2),
        qrContado: action.payload.ventasDia.qr.toFixed(2),
        tarjetaContado: action.payload.ventasDia.tarjeta.toFixed(2),
      };
    case "SET_RETIROS": return { ...state, retiros: action.payload };
    case "ADD_RETIRO": return { ...state, retiros: [...state.retiros, action.payload] };
    case "REMOVE_RETIRO": return { ...state, retiros: state.retiros.filter((r) => r.id !== action.payload) };
    case "SET_EFECTIVO_CONTADO": return { ...state, efectivoContado: action.payload };
    case "SET_TRANSFERENCIAS_CONTADO": return { ...state, transferenciasContado: action.payload };
    case "SET_QR_CONTADO": return { ...state, qrContado: action.payload };
    case "SET_TARJETA_CONTADO": return { ...state, tarjetaContado: action.payload };
    case "SET_NOTAS": return { ...state, notas: action.payload };
    case "SET_APERTURA_MONTO": return { ...state, aperturaMonto: action.payload };
    case "SET_APERTURA_FECHA": return { ...state, aperturaFecha: action.payload };
    case "SET_APERTURA_USUARIO": return { ...state, aperturaUsuario: action.payload };
    case "SET_APERTURA_SAVED": return { ...state, isAperturaSaved: action.payload };
    case "SET_ACTIVE_CAJA_ID": return { ...state, activeCajaId: action.payload };
    case "SET_VENTAS_DIA": return { ...state, ventasDia: action.payload };
    case "SET_TODAY_CLOSED": return { ...state, todayClosed: action.payload };
    case "SET_TODAY_CORTE": return { ...state, todayCorte: action.payload };
    case "SET_LOADING_HISTORY": return { ...state, loadingHistory: action.payload };
    case "SET_TIMELINE_ENTRIES": return { ...state, timelineEntries: action.payload };
    case "SET_SELECTED_DAY_KEY": return { ...state, selectedDayKey: action.payload };
    case "SET_CLOSE_CONFIRM_STEP": return { ...state, closeConfirmStep: action.payload };
    case "SET_CLOSE_CONFIRM_PHRASE": return { ...state, closeConfirmPhrase: action.payload };
    case "SET_CLOSE_CONFIRM_ACK": return { ...state, closeConfirmAck: action.payload };
    case "RESET_CLOSE_CONFIRM":
      return {
        ...state,
        closeConfirmStep: "none",
        closeConfirmPhrase: "",
        closeConfirmAck: false,
        closePrepMode: false,
      };
    case "SET_HISTORY_FILTER_MONTH": return { ...state, historyFilterMonth: action.payload };
    case "SET_PREVIEW_DATA": return { ...state, previewData: action.payload };
    case "SET_REQUIRED_NOTE": return { ...state, requiredNote: action.payload };
    case "RESET_OPENING":
      return {
        ...state,
        isAperturaSaved: false,
        aperturaAuto: false,
        closePrepMode: false,
        aperturaMonto: "",
        aperturaFecha: localDatetimeString(),
        activeCajaId: null,
        ventasDia: { efectivo: 0, transferencia: 0, qr: 0, tarjeta: 0 },
        retiros: [],
        efectivoContado: "0.00",
        transferenciasContado: "0.00",
        qrContado: "0.00",
        tarjetaContado: "0.00",
        notas: "",
      };
    case "LOAD_CAJA_DATA":
      return {
        ...state,
        aperturaMonto: String(action.payload.aperturaMonto ?? ""),
        aperturaFecha: action.payload.aperturaFecha,
        aperturaUsuario: action.payload.aperturaUsuario,
        ventasDia: action.payload.ventasDia,
        retiros: remesasToArray(action.payload.retiros),
        activeCajaId: action.payload.activeCajaId,
        isAperturaSaved: true,
        isCajaOpen: true,
        aperturaAuto: Boolean(action.payload.aperturaAuto),
        closePrepMode: false,
      };
    default: return state;
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Componentes secundarios                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function AperturaForm({ state, dispatch, onSave }: any) {
  const aperturaMonto = parseFloat(state.aperturaMonto || '0')
  const isAperturaInvalid = !state.aperturaMonto || aperturaMonto < 100 || !state.aperturaUsuario.trim()

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-bold text-lg">Información de Apertura</h3>
        {state.aperturaAuto && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300">
            Apertura automática — efectivo del cierre anterior
          </span>
        )}
      </div>
      {state.aperturaAuto && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          El monto de apertura coincide con el efectivo que quedó registrado al cerrar el día anterior.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div>
          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Monto de Apertura *</label>
          <input
            type="number"
            min="100"
            step="0.01"
            className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-xl md:text-2xl font-bold text-lime-600 bg-white dark:bg-gray-800"
            value={state.aperturaMonto}
            onChange={(e) => dispatch({ type: "SET_APERTURA_MONTO", payload: e.target.value })}
            placeholder="100.00"
            disabled={state.isAperturaSaved || state.aperturaAuto}
          />
        </div>
        <div>
          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Fecha y Hora</label>
          <input
            type="datetime-local"
            className="w-full p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 text-sm bg-white dark:bg-gray-800"
            value={state.aperturaFecha}
            onChange={(e) => dispatch({ type: "SET_APERTURA_FECHA", payload: e.target.value })}
            disabled={state.isAperturaSaved || state.aperturaAuto}
          />
        </div>
        <div>
          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Usuario Responsable *</label>
          <input
            type="text"
            placeholder="Nombre del responsable"
            className={`w-full p-2 md:p-3 border rounded-xl text-gray-900 dark:text-gray-100 text-sm bg-white dark:bg-gray-800 ${
              !state.isAperturaSaved && !state.aperturaUsuario.trim()
                ? 'border-red-400 dark:border-red-600 focus:ring-red-300 dark:focus:ring-red-700'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            value={state.aperturaUsuario}
            onChange={(e) => dispatch({ type: "SET_APERTURA_USUARIO", payload: e.target.value })}
            disabled={state.isAperturaSaved || state.aperturaAuto}
          />
          {!state.isAperturaSaved && !state.aperturaUsuario.trim() && (
            <p className="text-[11px] text-red-500 mt-1">Este campo es obligatorio</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        {state.aperturaAuto && state.isAperturaSaved ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-lime-50 dark:bg-lime-900/30 rounded-lg text-lime-700 dark:text-lime-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-lime-500" /> Caja abierta automáticamente
          </div>
        ) : !state.isAperturaSaved ? (
          <button
            onClick={onSave}
            disabled={isAperturaInvalid}
            className="px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition disabled:opacity-50"
          >
            Guardar Apertura
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-lime-50 dark:bg-lime-900/30 rounded-lg text-lime-700 dark:text-lime-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-lime-500" /> Apertura guardada
          </div>
        )}
      </div>
    </div>
  );
}

function VentasResumen({ ventasDia }: { ventasDia: { efectivo: number; transferencia: number; qr: number; tarjeta: number } }) {
  const total = ventasDia.efectivo + ventasDia.transferencia + ventasDia.qr + ventasDia.tarjeta;
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
      <h3 className="font-bold mb-2 text-lg">Resumen de Ventas del Día</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Ingresos agrupados por método de pago</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: "Efectivo", value: ventasDia.efectivo, icon: <Banknote size={20} /> },
          { label: "Transferencia", value: ventasDia.transferencia, icon: <ArrowRightLeft size={20} /> },
          { label: "Código QR", value: ventasDia.qr, icon: <QrCode size={20} /> },
          { label: "Tarjeta", value: ventasDia.tarjeta, icon: <CreditCard size={20} /> },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
            <div className="w-10 h-10 bg-lime-500/10 text-lime-600 rounded-lg flex items-center justify-center">{item.icon}</div>
            <div className="flex-1">
              <p className="text-gray-500 dark:text-gray-400 text-xs">{item.label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">${fmt(item.value)}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-4 bg-lime-500/5 p-4 rounded-xl border border-lime-500/30">
          <div className="w-10 h-10 bg-lime-500/20 text-lime-600 rounded-lg flex items-center justify-center"><Banknote size={20} /></div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Total</p>
            <p className="font-bold text-lime-600 text-lg">${fmt(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RetirosForm({ state, totalRetiros, onAddRetiro, onRemoveRetiro }: any) {
  const [newRetiro, setNewRetiro] = useState({ monto: "", motivo: "" });

  const handleAdd = () => {
    if (!newRetiro.motivo.trim()) {
      toast.warning("Debe justificar el retiro (ej: depósito en banco, pago a proveedor)");
      return;
    }
    if (!newRetiro.monto || parseFloat(newRetiro.monto) <= 0) {
      toast.warning("Ingrese un monto válido");
      return;
    }
    onAddRetiro({
      id: Date.now(),
      monto: parseFloat(newRetiro.monto),
      motivo: newRetiro.motivo.trim(),
    });
    setNewRetiro({ monto: "", motivo: "" });
  };

  return (
    <div className="border border-orange-200 dark:border-orange-900/50 rounded-2xl p-4 md:p-6 bg-orange-50/50 dark:bg-orange-950/20">
      <h3 className="font-bold mb-2 text-lg text-orange-900 dark:text-orange-200">Retiro de efectivo al cierre</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Registre el efectivo que sale de caja antes de cerrar (depósito bancario, remesa, etc.).
        El <strong>efectivo contado</strong> al cierre será el que queda en caja después del retiro.
        Mañana la apertura usará ese monto restante.
      </p>
      <div className="flex flex-col sm:flex-row items-end gap-3 md:gap-4 mb-4">
        <div className="flex-1 w-full">
          <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Motivo del retiro *</label>
          <input
            type="text"
            placeholder="Ej: Depósito en banco, pago proveedor..."
            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
            value={newRetiro.motivo}
            onChange={(e) => setNewRetiro({ ...newRetiro, motivo: e.target.value })}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Monto *</label>
          <input
            type="number" min="0" step="0.01" placeholder="0.00"
            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
            value={newRetiro.monto}
            onChange={(e) => setNewRetiro({ ...newRetiro, monto: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 text-gray-900 dark:text-gray-100 whitespace-nowrap bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 px-4 py-3 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30"
        >
          <Plus size={18} /> Agregar retiro
        </button>
      </div>
      {state.retiros.length > 0 && (
        <div className="mb-4">
          <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl mb-3">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium mb-2">
              <MinusCircle size={18} /> Total Retiros
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">-${fmt(totalRetiros)}</p>
          </div>
          <div className="space-y-2">
            {state.retiros.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded p-3">
                <div>
                  <p className="font-medium">-${fmt(r.monto)}</p>
                  {r.motivo && <p className="text-xs text-gray-500 dark:text-gray-400">{r.motivo}</p>}
                </div>
                <button onClick={() => onRemoveRetiro(r.id)} className="text-red-500 text-sm hover:underline">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CierreForm({ state, dispatch, ventasDia, efectivoEsperado, diferenciaEfectivo }: any) {
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-lg">Conteo de cierre</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Valores sugeridos según ventas y retiros. Ajuste el efectivo contado si el conteo físico difiere.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div>
          <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Efectivo Contado *</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
            value={state.efectivoContado}
            onChange={(e) => dispatch({ type: "SET_EFECTIVO_CONTADO", payload: e.target.value })}
          />
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm mt-3">
            <div className="flex justify-between text-blue-600 dark:text-blue-400">
              <span>Contado:</span>
              <span className="font-bold">${fmt(parseFloat(state.efectivoContado || "0"))}</span>
            </div>
            <div className="flex justify-between text-blue-600 dark:text-blue-400">
              <span>Esperado:</span>
              <span className="font-bold">${fmt(efectivoEsperado)}</span>
            </div>
            <div className={`flex justify-between font-bold mt-1 pt-1 border-t border-blue-200 ${diferenciaEfectivo >= 0 ? "text-lime-600" : "text-red-600"}`}>
              <span>Diferencia:</span>
              <span>{diferenciaEfectivo >= 0 ? "+" : ""}${fmt(diferenciaEfectivo)} ({efectivoEsperado > 0 ? ((diferenciaEfectivo / efectivoEsperado) * 100).toFixed(1) : "0.0"}%)</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Transferencias Contado</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
            value={state.transferenciasContado}
            onChange={(e) => dispatch({ type: "SET_TRANSFERENCIAS_CONTADO", payload: e.target.value })}
          />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Esperado: ${fmt(ventasDia.transferencia)}</p>
          <p className={`text-xs ${parseFloat(state.transferenciasContado || "0") === ventasDia.transferencia ? "text-lime-600" : "text-amber-600"}`}>
            {parseFloat(state.transferenciasContado || "0") === ventasDia.transferencia ? "✓ Correcto" : "⚠️ Revisar diferencia"}
          </p>
        </div>
        <div>
          <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Códigos QR Contado</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
            value={state.qrContado}
            onChange={(e) => dispatch({ type: "SET_QR_CONTADO", payload: e.target.value })}
          />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Esperado: ${fmt(ventasDia.qr)}</p>
        </div>
        <div>
          <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">Tarjetas Contado</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
            value={state.tarjetaContado}
            onChange={(e) => dispatch({ type: "SET_TARJETA_CONTADO", payload: e.target.value })}
          />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Esperado: ${fmt(ventasDia.tarjeta)}</p>
        </div>
      </div>
      {Math.abs(diferenciaEfectivo) > 50 && !state.notas && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
          <p className="text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            La diferencia en efectivo es mayor a $50. Se requiere una nota explicativa.
          </p>
        </div>
      )}
      <div>
        <label className="block text-gray-900 dark:text-gray-100 text-sm font-bold mb-2">
          Notas / Observaciones {Math.abs(diferenciaEfectivo) > 50 && <span className="text-red-500">*</span>}
        </label>
        <textarea
          className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl h-20"
          value={state.notas}
          onChange={(e) => dispatch({ type: "SET_NOTAS", payload: e.target.value })}
          placeholder={Math.abs(diferenciaEfectivo) > 50 ? "Explique la razón de la diferencia en efectivo..." : "Opcional - notas adicionales sobre el cierre..."}
        />
      </div>
    </div>
  );
}

function HistoryTimeline({ loading, entries, onOpenDay, filterMonth, onFilterChange, onExportToExcel }: {
  loading: boolean;
  entries: TimelineEntry[];
  onOpenDay: (dayKey: string) => void;
  filterMonth: string;
  onFilterChange: (month: string) => void;
  onExportToExcel: () => void;
}) {
  const buildDayGroups = (entries: TimelineEntry[]): TimelineDayGroup[] => {
    const grouped = new Map<string, TimelineDayGroup>();
    for (const entry of entries) {
      const key = entry.dateKey;
      const label = formatDateFull(entry.date);
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          key, label,
          entries: [entry],
          openCount: entry.type === "caja-open" ? 1 : 0,
          closeCount: entry.type === "corte" ? 1 : 0,
          totalVentas: entry.type === "corte" ? Number(entry.corte?.totalVentas ?? 0) : 0,
          totalRetiros: entry.type === "corte" ? Number(entry.corte?.totalRemesas ?? 0) : 0,
          totalDiferencia: entry.type === "corte" ? Number((entry.corte?.efectivoContado ?? 0) - (entry.corte?.esperadoEfectivo ?? 0)) : 0,
        });
        continue;
      }
      existing.entries.push(entry);
      if (entry.type === "caja-open") existing.openCount += 1;
      if (entry.type === "corte") {
        existing.closeCount += 1;
        existing.totalVentas += Number(entry.corte?.totalVentas ?? 0);
        existing.totalRetiros += Number(entry.corte?.totalRemesas ?? 0);
        existing.totalDiferencia += Number((entry.corte?.efectivoContado ?? 0) - (entry.corte?.esperadoEfectivo ?? 0));
      }
    }
    const days = Array.from(grouped.values());
    days.forEach((group) => group.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    days.sort((a, b) => b.key.localeCompare(a.key));
    return days.filter((day) => !filterMonth || day.key.startsWith(filterMonth));
  };

  const dayGroups = buildDayGroups(entries);
  const months = Array.from(new Set(entries.map((e) => e.dateKey.slice(0, 7)))).sort().reverse();

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          Historial de Aperturas y Cierres
        </h3>
        <div className="flex gap-2">
          <select
            value={filterMonth}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          >
            <option value="">Todos los meses</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {new Date(month + "-01").toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
          <button onClick={onExportToExcel} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            <FileSpreadsheet size={16} /> Exportar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
          <Clock className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando historial...</span>
        </div>
      ) : dayGroups.length === 0 ? (
        <div className="text-center py-10">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No hay registros de caja aún</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Abra su primera caja para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayGroups.map((day) => (
            <div key={day.key} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{day.label}</h4>
                <span className="rounded-full bg-lime-50 px-2 py-0.5 text-[11px] font-medium text-lime-700 dark:bg-lime-900/30 dark:text-lime-300">
                  Aperturas: {day.openCount}
                </span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">
                  Cierres: {day.closeCount}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ventas cerradas</p>
                  <p className="font-bold text-lime-600 dark:text-lime-400">${fmt(day.totalVentas)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Retiros</p>
                  <p className="font-bold text-orange-600 dark:text-orange-400">${fmt(day.totalRetiros)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia neta</p>
                  <p className={`font-bold ${day.totalDiferencia >= 0 ? "text-lime-600 dark:text-lime-400" : "text-red-500 dark:text-red-400"}`}>
                    {day.totalDiferencia >= 0 ? "+" : ""}${fmt(day.totalDiferencia)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {day.entries.slice(0, 3).map((entry) => (
                  <button
                    key={entry.id} type="button" onClick={() => onOpenDay(day.key)}
                    className="w-full rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.type === "caja-open" ? "Caja abierta" : "Cierre de caja"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatTime(entry.date)}</p>
                      </div>
                      {entry.type === "corte" ? (
                        <p className="text-sm font-bold text-lime-600 dark:text-lime-400">${fmt(entry.corte?.totalVentas ?? 0)}</p>
                      ) : (
                        <p className="text-xs font-medium text-lime-700 dark:text-lime-300">En curso</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {day.entries.length > 3 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">+{day.entries.length - 3} eventos más</p>
              )}
              <button
                type="button" onClick={() => onOpenDay(day.key)}
                className="mt-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Ver detalle del día
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DayDetailModal({ day, onClose }: { day: TimelineDayGroup | null; onClose: () => void }) {
  if (!day) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-2 sm:p-6" onClick={onClose}>
      <div
        className="mx-auto h-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Detalle del día</p>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">{day.label}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Eventos: {day.entries.length} · Cierres: {day.closeCount}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Aperturas</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{day.openCount}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Cierres</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{day.closeCount}</p>
          </div>
          <div className="rounded-xl bg-lime-50 p-3 dark:bg-lime-950/30">
            <p className="text-xs text-lime-700 dark:text-lime-300">Ventas cerradas</p>
            <p className="text-lg font-bold text-lime-700 dark:text-lime-300">${fmt(day.totalVentas)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/30">
            <p className="text-xs text-blue-700 dark:text-blue-300">Diferencia neta</p>
            <p className={`text-lg font-bold ${day.totalDiferencia >= 0 ? "text-lime-700 dark:text-lime-300" : "text-red-600 dark:text-red-400"}`}>
              {day.totalDiferencia >= 0 ? "+" : ""}${fmt(day.totalDiferencia)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {day.entries.map((entry) => {
            if (entry.type === "caja-open") {
              const caja = entry.caja;
              if (!caja) return null;
              return (
                <div key={entry.id} className="rounded-xl border border-lime-200 bg-lime-50 p-4 dark:border-lime-800/40 dark:bg-lime-950/20">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-lime-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime-700 dark:bg-lime-900/40 dark:text-lime-300">
                      Caja abierta
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(caja?.apertura?.fecha || caja?.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Monto apertura</p>
                      <p className="font-bold text-gray-900 dark:text-white">${fmt(caja?.apertura?.monto ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Usuario</p>
                      <p className="font-medium text-gray-900 dark:text-white">{caja?.apertura?.usuario || "Usuario"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ventas acumuladas</p>
                      <p className="font-bold text-lime-700 dark:text-lime-300">${fmt(caja?.totals?.totalVentas ?? 0)}</p>
                    </div>
                  </div>
                </div>
              );
            }

            const corte = entry.corte!;
            const diff = (corte.efectivoContado ?? 0) - (corte.esperadoEfectivo ?? 0);
            const corteRetiros = remesasToArray(corte.remesas);

            return (
              <div key={entry.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:bg-red-900/30 dark:text-red-300">
                    Cierre
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(corte.createdAt)}</span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Apertura</p>
                    <p className="font-bold text-gray-900 dark:text-white">${fmt(corte.aperturaInfo?.monto ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ventas</p>
                    <p className="font-bold text-lime-600 dark:text-lime-400">${fmt(corte.totalVentas ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo contado</p>
                    <p className="font-bold text-gray-900 dark:text-white">${fmt(corte.efectivoContado ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia</p>
                    <p className={`font-bold ${diff >= 0 ? "text-lime-600 dark:text-lime-400" : "text-red-500 dark:text-red-400"}`}>
                      {diff >= 0 ? "+" : ""}${fmt(diff)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 mb-3">
                  {[
                    { label: "Efectivo", value: corte.ventasDia?.efectivo },
                    { label: "Transferencia", value: corte.ventasDia?.transferencia },
                    { label: "QR", value: corte.ventasDia?.qr },
                    { label: "Tarjeta", value: corte.ventasDia?.tarjeta },
                  ].map((item) => (
                    <div key={item.label} className="rounded bg-gray-50 p-2 dark:bg-gray-800">
                      <p className="text-gray-500 dark:text-gray-400">{item.label}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">${fmt(item.value ?? 0)}</p>
                    </div>
                  ))}
                </div>

                {corteRetiros.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                      <MinusCircle size={12} /> Retiros ({corteRetiros.length}) — Total: -${fmt(corte.totalRemesas ?? 0)}
                    </p>
                    <div className="space-y-1">
                      {corteRetiros.map((r: any) => (
                        <div key={r.id} className="flex justify-between text-xs bg-orange-50 dark:bg-orange-950/20 rounded px-2 py-1">
                          <span className="text-gray-600 dark:text-gray-400">{r.motivo || "Sin motivo"}</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">-${fmt(r.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!!corte.notas && (
                  <div className="mt-3 rounded bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                    <p className="font-semibold">Notas</p>
                    <p>{corte.notas}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PrintVoucher({ corte, onClose }: { corte: CorteRecord; onClose: () => void }) {
  const { settings } = useSettings();
  const branding = getResolvedBranding(settings);
  const doc = new jsPDF();
  const diff = (corte.efectivoContado ?? 0) - (corte.esperadoEfectivo ?? 0);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Comprobante de Cierre de Caja", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(branding.appName, 105, 30, { align: "center" });
  doc.text(`Fecha: ${formatDateFull(corte.createdAt)} ${formatTime(corte.createdAt)}`, 105, 38, { align: "center" });
  doc.line(20, 45, 190, 45);

  autoTable(doc, {
    startY: 50,
    body: [
      ["Apertura:", `$${fmt(corte.aperturaInfo?.monto ?? 0)}`],
      ["Total Ventas:", `$${fmt(corte.totalVentas ?? 0)}`],
      ["Total Retiros:", `-$${fmt(corte.totalRemesas ?? 0)}`],
      ["Efectivo Esperado:", `$${fmt(corte.esperadoEfectivo ?? 0)}`],
      ["Efectivo Contado:", `$${fmt(corte.efectivoContado ?? 0)}`],
      ["Diferencia:", `${diff >= 0 ? "+" : ""}$${fmt(diff)}`],
    ],
    theme: "plain",
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text("¡Gracias por su trabajo!", 105, finalY, { align: "center" });
  doc.save(`comprobante_cierre_${corte.createdAt.slice(0, 10)}.pdf`);
  onClose();
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Componente Principal                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export default function CorteDeCaja() {
  const { user, authReady, hasModuleAccess, systemUser } = useAuth();
  const { settings } = useSettings();
  const canManageCaja = hasModuleAccess("corte", "full");
  const canReopenCaja = hasModuleAccess("corteReopen", "full");
  const responsableNombre =
    systemUser?.nombreCompleto ||
    systemUser?.usuario ||
    user?.displayName ||
    user?.email ||
    "Usuario de Caja";
  const reminderShown = useRef(false);
  const autoCloseAttemptedDayRef = useRef<string | null>(null);
  const autoOpenAttemptedDayRef = useRef<string | null>(null);
  const [state, dispatch] = useReducer(corteReducer, initialState);

  const buildTimeline = useCallback((cortes: CorteRecord[], cajas: any[]): TimelineEntry[] => {
    const entries: TimelineEntry[] = [];
    const openCajas = cajas.filter((c) => c.status !== "closed");
    for (const caja of openCajas) {
      const date = caja.apertura?.fecha || caja.createdAt || new Date().toISOString();
      entries.push({ id: caja.id || `open-${date}`, type: "caja-open", caja, date, dateKey: toDateKeyFromIso(date) });
    }
    for (const corte of cortes) {
      const date = corte.createdAt || new Date().toISOString();
      entries.push({ id: corte.id, type: "corte", corte, date, dateKey: toDateKeyFromIso(date) });
    }
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  }, []);

  const reloadData = useCallback(async () => {
    let cajas: any[] = [];
    let cortes: CorteRecord[] = [];
    try { cajas = await CajaService.getAllCajas(); } catch (e) { console.error("Error loading cajas:", e); }
    try { cortes = await CorteService.getAllCortes(); } catch (e) { console.error("Error loading cortes:", e); }
    const todayC = await CorteService.getTodayCorte();
    const corteEsDeHoy = todayC ? isCorteFromToday(todayC as CorteWithDateKey) : false;
    dispatch({ type: "SET_TIMELINE_ENTRIES", payload: buildTimeline(cortes, cajas) });
    dispatch({ type: "SET_TODAY_CLOSED", payload: corteEsDeHoy });
    dispatch({ type: "SET_TODAY_CORTE", payload: corteEsDeHoy ? todayC : null });
    dispatch({ type: "SET_LOADING_HISTORY", payload: false });
  }, [buildTimeline]);

  useEffect(() => {
    if (!authReady) return;
    let mounted = true;
    (async () => {
      if (!user?.uid) {
        if (mounted) dispatch({ type: "SET_LOADING_HISTORY", payload: false });
        return;
      }
      try { await CajaService.closeStaleOpenCajas(); } catch (e) { console.error("Error closing stale cajas:", e); }
      let active: any = null;
      try { active = await CajaService.getTodayOpenCaja(user?.uid); } catch (e) { console.error("Error getting active caja:", e); }
      await reloadData();
      if (!mounted) return;
      if (active && active.status === "open") {
        dispatch({
          type: "LOAD_CAJA_DATA",
          payload: {
            aperturaMonto: active.apertura?.monto,
            aperturaFecha: active.apertura?.fecha ? localDatetimeString(new Date(active.apertura.fecha)) : localDatetimeString(),
            aperturaUsuario: active.apertura?.usuario ?? responsableNombre,
            aperturaAuto: Boolean(active.apertura?.auto),
            ventasDia: {
              efectivo: Number(active.totals?.efectivo ?? 0),
              transferencia: Number(active.totals?.transferencia ?? 0),
              qr: Number(active.totals?.qr ?? 0),
              tarjeta: Number(active.totals?.tarjeta ?? 0),
            },
            retiros: active.remesas || [],
            activeCajaId: active.id || null,
          },
        });
        return;
      }

      const todayKey = getLocalDateKey();
      const todayC = await CorteService.getTodayCorte();
      const corteEsDeHoy = todayC ? isCorteFromToday(todayC as CorteWithDateKey) : false;
      if (corteEsDeHoy || !canManageCaja) return;
      if (autoOpenAttemptedDayRef.current === todayKey) return;

      const prevCorte = await CorteService.getPreviousCorteForApertura();
      if (prevCorte) {
        autoOpenAttemptedDayRef.current = todayKey;
        const montoApertura = Number(prevCorte.efectivoContado ?? 0);
        try {
          const createdCaja = await CajaService.openCaja({
            monto: montoApertura,
            fecha: new Date().toISOString(),
            usuario: responsableNombre,
            createdBy: user.uid,
            auto: true,
          });
          dispatch({
            type: "LOAD_CAJA_DATA",
            payload: {
              aperturaMonto: montoApertura,
              aperturaFecha: localDatetimeString(),
              aperturaUsuario: responsableNombre,
              aperturaAuto: true,
              ventasDia: { efectivo: 0, transferencia: 0, qr: 0, tarjeta: 0 },
              retiros: [],
              activeCajaId: createdCaja.id || null,
            },
          });
          await reloadData();
          toast.success(
            `Caja abierta automáticamente con $${fmt(montoApertura)} (efectivo del cierre anterior)`,
          );
        } catch (err) {
          console.error("Error en apertura automática", err);
          autoOpenAttemptedDayRef.current = null;
          dispatch({ type: "SET_CAJA_OPEN", payload: true });
        }
      } else {
        autoOpenAttemptedDayRef.current = todayKey;
        dispatch({ type: "SET_APERTURA_USUARIO", payload: responsableNombre });
        dispatch({ type: "SET_CAJA_OPEN", payload: true });
      }
    })();
    return () => { mounted = false; };
  }, [authReady, user?.uid, reloadData, canManageCaja, responsableNombre]);

  useEffect(() => {
    if (!settings.notifications.cashRegister) return;
    if (reminderShown.current) return;
    if (!state.isCajaOpen || state.todayClosed) return;
    toast.info("Recuerda realizar el corte de caja al finalizar el dia");
    reminderShown.current = true;
  }, [settings.notifications.cashRegister, state.isCajaOpen, state.todayClosed]);

  const autoCloseOpenCajaAt11Pm = useCallback(async () => {
    if (!user?.uid) return;

    const now = new Date();

    const todayKey = toDateKeyFromIso(now.toISOString());
    if (autoCloseAttemptedDayRef.current === todayKey) return;

    await CajaService.closeStaleOpenCajas();

    const active = await CajaService.getTodayOpenCaja(user.uid);
    if (!active || active.status !== "open") return;

    if (now.getHours() < 23) return;

    const remesas = remesasToArray(active.remesas);
    const ventasDia = {
      efectivo: Number(active.totals?.efectivo ?? 0),
      transferencia: Number(active.totals?.transferencia ?? 0),
      qr: Number(active.totals?.qr ?? 0),
      tarjeta: Number(active.totals?.tarjeta ?? 0),
    };
    const totalVentasAuto =
      ventasDia.efectivo + ventasDia.transferencia + ventasDia.qr + ventasDia.tarjeta;
    const totalRetirosAuto = remesas.reduce((acc, r) => acc + Number(r?.monto || 0), 0);
    const aperturaMonto = Number(active.apertura?.monto ?? 0);
    const esperadoEfectivoAuto = aperturaMonto + ventasDia.efectivo - totalRetirosAuto;

    const corteAuto = {
      aperturaInfo: {
        monto: aperturaMonto,
        fecha: active.apertura?.fecha || new Date().toISOString(),
        usuario: active.apertura?.usuario || "Usuario de Caja",
      },
      ventasDia,
      totalVentas: totalVentasAuto,
      remesas: remesas.map((r) => ({
        id: Number(r?.id ?? Date.now()),
        monto: Number(r?.monto ?? 0),
        motivo: r?.motivo || "",
      })),
      totalRemesas: totalRetirosAuto,
      efectivoContado: esperadoEfectivoAuto,
      transferenciasContado: ventasDia.transferencia,
      qrContado: ventasDia.qr,
      tarjetaContado: ventasDia.tarjeta,
      esperadoEfectivo: esperadoEfectivoAuto,
      notas: "Cierre automatico 23:00",
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await CorteService.saveCorte(corteAuto);
      await CajaService.closeCaja(active.id, { corteId: created.id, closedAt: new Date().toISOString() });
      dispatch({ type: "SET_CAJA_OPEN", payload: false });
      dispatch({ type: "SET_ACTIVE_CAJA_ID", payload: null });
      dispatch({ type: "SET_TODAY_CLOSED", payload: true });
      dispatch({ type: "SET_TODAY_CORTE", payload: created.corte as CorteRecord });
      await reloadData();
      autoCloseAttemptedDayRef.current = todayKey;
      toast.info("La caja se cerro automaticamente a las 11:00 PM.");
    } catch (err) {
      if ((err as Error & { code?: string }).code === "CLOSE_ALREADY_EXISTS") {
        autoCloseAttemptedDayRef.current = todayKey;
      } else {
        console.error("Error in automatic 11 PM close:", err);
      }
    }
  }, [reloadData, user?.uid]);

  useEffect(() => {
    if (!authReady || !user?.uid) return;
    void autoCloseOpenCajaAt11Pm();
    const timer = window.setInterval(() => {
      void autoCloseOpenCajaAt11Pm();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [authReady, autoCloseOpenCajaAt11Pm, user?.uid]);

  const handleSaveApertura = async () => {
    if (!canManageCaja) { toast.error("No tienes permisos para abrir la caja"); return; }
    if (state.isAperturaSaved) { toast.info("Apertura ya guardada"); return; }
    if (state.todayClosed) { toast.warning("Ya se realizó un cierre hoy."); return; }
    const montoApertura = parseFloat(state.aperturaMonto)
    if (!state.aperturaMonto || !Number.isFinite(montoApertura) || montoApertura < 100) {
      toast.warning("El monto de apertura mínimo es de $100.00")
      return
    }
    if (!state.aperturaUsuario.trim()) { toast.warning("El nombre del usuario responsable es obligatorio"); return; }
    try {
      await CajaService.closeStaleOpenCajas();
      const alreadyOpen = await CajaService.getTodayOpenCaja(user?.uid);
      if (alreadyOpen && alreadyOpen.status === "open") {
        dispatch({
          type: "LOAD_CAJA_DATA",
          payload: {
            aperturaMonto: alreadyOpen.apertura?.monto,
            aperturaFecha: alreadyOpen.apertura?.fecha
              ? localDatetimeString(new Date(alreadyOpen.apertura.fecha))
              : localDatetimeString(),
            aperturaUsuario: alreadyOpen.apertura?.usuario ?? user?.displayName ?? "Usuario de Caja",
            ventasDia: {
              efectivo: Number(alreadyOpen.totals?.efectivo ?? 0),
              transferencia: Number(alreadyOpen.totals?.transferencia ?? 0),
              qr: Number(alreadyOpen.totals?.qr ?? 0),
              tarjeta: Number(alreadyOpen.totals?.tarjeta ?? 0),
            },
            retiros: alreadyOpen.remesas || [],
            activeCajaId: alreadyOpen.id || null,
          },
        });
        toast.info("Ya existe una caja abierta. Se cargó la caja en curso.");
        return;
      }

      const now = new Date();
      const aperturaInfo = {
        monto: montoApertura,
        fecha: state.aperturaFecha ? new Date(state.aperturaFecha).toISOString() : now.toISOString(),
        usuario: state.aperturaUsuario.trim(),
        createdBy: user?.uid,
      };
      const createdCaja = await CajaService.openCaja(aperturaInfo);
      dispatch({ type: "SET_ACTIVE_CAJA_ID", payload: createdCaja.id || null });
      dispatch({ type: "SET_APERTURA_SAVED", payload: true });
      dispatch({ type: "SET_CAJA_OPEN", payload: true });
      await reloadData();
      toast.success("Apertura guardada correctamente");
    } catch (err) {
      console.error("Error saving apertura", err);
      toast.error("Error al guardar la apertura");
    }
  };

  const handleOpenView = async () => {
    if (!canManageCaja) { toast.error("No tienes permisos para abrir la caja"); return; }
    if (state.todayClosed) { toast.warning("Ya se realizó un cierre hoy."); return; }
    try {
      await CajaService.closeStaleOpenCajas();
      const active = await CajaService.getTodayOpenCaja(user?.uid);
      if (active && active.status === "open") {
        dispatch({
          type: "LOAD_CAJA_DATA",
          payload: {
            aperturaMonto: active.apertura?.monto,
            aperturaFecha: active.apertura?.fecha ? localDatetimeString(new Date(active.apertura.fecha)) : localDatetimeString(),
            aperturaUsuario: active.apertura?.usuario ?? user?.displayName ?? "Usuario de Caja",
            ventasDia: {
              efectivo: Number(active.totals?.efectivo ?? 0),
              transferencia: Number(active.totals?.transferencia ?? 0),
              qr: Number(active.totals?.qr ?? 0),
              tarjeta: Number(active.totals?.tarjeta ?? 0),
            },
            retiros: active.remesas || [],
            activeCajaId: active.id || null,
          },
        });
      } else {
        dispatch({ type: "RESET_OPENING" });
        dispatch({ type: "SET_CAJA_OPEN", payload: true });
        toast.info("Complete y guarde la apertura para abrir una caja real");
      }
    } catch (err) {
      console.error("Error opening caja view", err);
      dispatch({ type: "RESET_OPENING" });
      dispatch({ type: "SET_CAJA_OPEN", payload: false });
    }
  };

  const todayCorteIsToday =
    !!state.todayCorte?.id &&
    state.todayClosed &&
    isCorteFromToday(state.todayCorte as CorteWithDateKey);

  const canShowReopenTodayButton = canReopenCaja && todayCorteIsToday;

  const handleReopenCaja = async () => {
    if (!canReopenCaja) {
      toast.error("No tienes permisos para reabrir la caja");
      return;
    }
    if (!state.todayCorte?.id) {
      toast.warning("No hay un cierre registrado para reabrir");
      return;
    }

    const todayKey = getLocalDateKey();
    const corteDay = getCorteDateKey(state.todayCorte as CorteWithDateKey);

    if (corteDay > todayKey) {
      toast.error("No se puede reabrir un cierre con fecha futura");
      return;
    }
    if (corteDay < todayKey) {
      toast.error("Solo se puede reabrir el cierre del día de hoy, no de días anteriores");
      return;
    }
    if (!state.todayClosed) {
      toast.warning("No hay un cierre de hoy activo para reabrir");
      return;
    }

    try {
      const cajas = await CajaService.getAllCajas();
      const cajaToReopen = cajas.find(
        (c) => c?.status === "closed" && c?.cierreData?.corteId === state.todayCorte?.id,
      );

      if (!cajaToReopen?.id) {
        toast.error("No se encontró la caja cerrada asociada al cierre de hoy");
        return;
      }

      const cajaDay = getCajaDayKey(cajaToReopen);
      if (cajaDay !== todayKey || !isCajaFromToday(cajaToReopen)) {
        toast.error("La caja asociada no es del día de hoy. No se puede reabrir.");
        return;
      }

      const reopened = await CajaService.reopenCaja(cajaToReopen.id);
      await CorteService.deleteCorteForReopen(state.todayCorte.id);

      dispatch({
        type: "LOAD_CAJA_DATA",
        payload: {
          aperturaMonto: reopened.apertura?.monto,
          aperturaFecha: reopened.apertura?.fecha
            ? localDatetimeString(new Date(reopened.apertura.fecha))
            : localDatetimeString(),
          aperturaUsuario: reopened.apertura?.usuario ?? user?.displayName ?? "Usuario de Caja",
          ventasDia: {
            efectivo: Number(reopened.totals?.efectivo ?? 0),
            transferencia: Number(reopened.totals?.transferencia ?? 0),
            qr: Number(reopened.totals?.qr ?? 0),
            tarjeta: Number(reopened.totals?.tarjeta ?? 0),
          },
          retiros: reopened.remesas || [],
          activeCajaId: reopened.id || null,
        },
      });
      dispatch({ type: "SET_TODAY_CLOSED", payload: false });
      dispatch({ type: "SET_TODAY_CORTE", payload: null });
      await reloadData();
      toast.success("Caja reabierta correctamente");
    } catch (err) {
      console.error("Error reopening caja", err);
      toast.error("No se pudo reabrir la caja");
    }
  };

  const totalVentas = state.ventasDia.efectivo + state.ventasDia.transferencia + state.ventasDia.qr + state.ventasDia.tarjeta;
  const totalRetiros = state.retiros.reduce((acc, r) => acc + (r.monto || 0), 0);
  const efectivoEsperado = parseFloat(state.aperturaMonto || "0") + state.ventasDia.efectivo - totalRetiros;
  const efectivoActual = parseFloat(state.efectivoContado || "0");
  const diferenciaEfectivo = efectivoActual - efectivoEsperado;
  const requiereNota = Math.abs(diferenciaEfectivo) > 50;

  useEffect(() => {
    if (!state.closePrepMode) return;
    dispatch({
      type: "APPLY_CLOSE_AUTOFILL",
      payload: { efectivoEsperado, ventasDia: state.ventasDia },
    });
  }, [
    state.closePrepMode,
    totalRetiros,
    state.aperturaMonto,
    state.ventasDia.efectivo,
    state.ventasDia.transferencia,
    state.ventasDia.qr,
    state.ventasDia.tarjeta,
    efectivoEsperado,
  ]);

  const handleStartClosePrep = () => {
    if (!canManageCaja) return;
    if (state.todayClosed || !state.isAperturaSaved || !state.activeCajaId) return;
    dispatch({ type: "SET_CLOSE_PREP_MODE", payload: true });
    dispatch({
      type: "APPLY_CLOSE_AUTOFILL",
      payload: { efectivoEsperado, ventasDia: state.ventasDia },
    });
  };

  const handleCancelClosePrep = () => {
    dispatch({ type: "SET_CLOSE_PREP_MODE", payload: false });
    dispatch({ type: "RESET_CLOSE_CONFIRM" });
  };

  const handleCerrarCaja = async () => {
    if (!canManageCaja) { toast.error("No tienes permisos para cerrar la caja"); return; }
    if (state.todayClosed) return;
    if (!state.isAperturaSaved || !state.activeCajaId) { toast.error("No hay una caja activa para cerrar"); return; }
    if (!state.closePrepMode) {
      toast.warning("Inicie el proceso de cierre antes de confirmar");
      return;
    }
    const retiroSinMotivo = state.retiros.some((r) => !String(r.motivo || "").trim());
    if (retiroSinMotivo) {
      toast.error("Todos los retiros deben tener un motivo justificado");
      return;
    }
    if (requiereNota && !state.notas.trim()) { toast.error("Se requiere una nota explicativa para la diferencia mayor a $50"); return; }

    const active = await CajaService.getTodayOpenCaja(user?.uid);
    if (!active || !active.id || active.status !== "open") {
      toast.error("No se encontró una caja abierta hoy para cerrar");
      dispatch({ type: "SET_CAJA_OPEN", payload: false });
      dispatch({ type: "SET_APERTURA_SAVED", payload: false });
      dispatch({ type: "SET_ACTIVE_CAJA_ID", payload: null });
      return;
    }

    const cierreVentasDia = {
      efectivo: Number(active.totals?.efectivo ?? 0),
      transferencia: Number(active.totals?.transferencia ?? 0),
      qr: Number(active.totals?.qr ?? 0),
      tarjeta: Number(active.totals?.tarjeta ?? 0),
    };

    const cleanRetiros = state.retiros.map((r) => ({ id: r.id, monto: r.monto, motivo: r.motivo || "" }));
    const corte = {
      aperturaInfo: {
        monto: parseFloat(state.aperturaMonto || "0"),
        fecha: state.aperturaFecha ? new Date(state.aperturaFecha).toISOString() : new Date().toISOString(),
        usuario: state.aperturaUsuario || "Usuario de Caja",
      },
      ventasDia: cierreVentasDia,
      totalVentas,
      remesas: cleanRetiros,
      totalRemesas: totalRetiros,
      efectivoContado: parseFloat(state.efectivoContado || "0"),
      transferenciasContado: parseFloat(state.transferenciasContado || "0"),
      qrContado: parseFloat(state.qrContado || "0"),
      tarjetaContado: parseFloat(state.tarjetaContado || "0"),
      esperadoEfectivo: efectivoEsperado,
      notas: state.notas || "",
      createdBy: user?.uid || "anonymous",
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await CorteService.saveCorte(corte);
      await CajaService.closeCaja(active.id, { corteId: created.id, closedAt: new Date().toISOString() });
      dispatch({ type: "SET_CAJA_OPEN", payload: false });
      dispatch({ type: "SET_ACTIVE_CAJA_ID", payload: null });
      dispatch({ type: "SET_TODAY_CLOSED", payload: true });
      dispatch({ type: "SET_TODAY_CORTE", payload: created.corte as CorteRecord });
      dispatch({ type: "SET_CLOSE_PREP_MODE", payload: false });
      dispatch({ type: "RESET_CLOSE_CONFIRM" });
      await reloadData();
      toast.success("Cierre de caja guardado correctamente");
      if (window.confirm("¿Desea imprimir el comprobante de cierre?")) {
        PrintVoucher({ corte: created.corte as CorteRecord, onClose: () => {} } as any);
      }
    } catch (err) {
      console.error("Error saving corte", err);
      if ((err as Error & { code?: string }).code === "CLOSE_ALREADY_EXISTS") {
        const existing = await CorteService.getTodayCorte();
        if (existing) {
          dispatch({ type: "SET_TODAY_CLOSED", payload: true });
          dispatch({ type: "SET_TODAY_CORTE", payload: existing });
        }
        toast.warning("Otro usuario ya realizó el cierre de hoy.");
        return;
      }
      toast.error("Error al guardar el cierre: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const exportToExcel = () => {
    const data = state.timelineEntries
      .filter((e) => e.type === "corte" && e.corte)
      .map((e) => ({
        Fecha: formatDateFull(e.date),
        Hora: formatTime(e.date),
        Usuario: e.corte?.aperturaInfo?.usuario,
        "Monto Apertura": e.corte?.aperturaInfo?.monto,
        "Total Ventas": e.corte?.totalVentas,
        "Total Retiros": e.corte?.totalRemesas,
        "Efectivo Esperado": e.corte?.esperadoEfectivo,
        "Efectivo Contado": e.corte?.efectivoContado,
        Diferencia: (e.corte?.efectivoContado ?? 0) - (e.corte?.esperadoEfectivo ?? 0),
        Notas: e.corte?.notas,
      }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Cierres");
    XLSX.writeFile(wb, `historial_cierres_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Exportado a Excel");
  };

  const buildDayGroupsForModal = (entries: TimelineEntry[]): TimelineDayGroup[] => {
    const grouped = new Map<string, TimelineDayGroup>();
    for (const entry of entries) {
      const key = entry.dateKey;
      const label = formatDateFull(entry.date);
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          key, label,
          entries: [entry],
          openCount: entry.type === "caja-open" ? 1 : 0,
          closeCount: entry.type === "corte" ? 1 : 0,
          totalVentas: entry.type === "corte" ? Number(entry.corte?.totalVentas ?? 0) : 0,
          totalRetiros: entry.type === "corte" ? Number(entry.corte?.totalRemesas ?? 0) : 0,
          totalDiferencia: entry.type === "corte" ? Number((entry.corte?.efectivoContado ?? 0) - (entry.corte?.esperadoEfectivo ?? 0)) : 0,
        });
        continue;
      }
      existing.entries.push(entry);
      if (entry.type === "caja-open") existing.openCount += 1;
      if (entry.type === "corte") {
        existing.closeCount += 1;
        existing.totalVentas += Number(entry.corte?.totalVentas ?? 0);
        existing.totalRetiros += Number(entry.corte?.totalRemesas ?? 0);
        existing.totalDiferencia += Number((entry.corte?.efectivoContado ?? 0) - (entry.corte?.esperadoEfectivo ?? 0));
      }
    }
    const days = Array.from(grouped.values());
    days.forEach((group) => group.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    days.sort((a, b) => b.key.localeCompare(a.key));
    return days;
  };

  /* ── Vista: Caja Cerrada ─────────────────────────────────────────────────── */

  if (!state.isCajaOpen) {
    return (
      <div className="min-h-screen app-page-bg text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
        <Sidebar activeItem="corte" />
        <div className="flex-1 p-4 md:p-8 pt-20 md:pt-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-4 md:pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"><ChevronLeft size={20} /></button>
                <h2 className="text-xl md:text-2xl font-bold">Corte de Caja</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Gestione la apertura y cierre de caja diario</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Si no se cierra manualmente, la caja se cierra automaticamente a las 11:00 PM.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
                <Lock size={18} /> Caja Cerrada
              </div>
              {canManageCaja ? (
                <button
                  onClick={handleOpenView} disabled={state.todayClosed}
                  className="px-4 py-2 bg-lime-500 text-white rounded-lg text-sm font-medium hover:bg-lime-600 transition disabled:opacity-50"
                >
                  Abrir Caja
                </button>
              ) : (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium">
                  Solo lectura
                </div>
              )}
              {canShowReopenTodayButton && (
                <button
                  onClick={handleReopenCaja}
                  title="Solo disponible para el cierre realizado hoy"
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
                >
                  Reabrir caja de hoy
                </button>
              )}
            </div>
          </div>

          {todayCorteIsToday && state.todayCorte && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Ya se realizó un cierre de caja hoy</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Cierre a las {formatTime(state.todayCorte.createdAt)} por {state.todayCorte.aperturaInfo?.usuario || "Usuario"} — Ventas: ${fmt(state.todayCorte.totalVentas ?? 0)}
                </p>
              </div>
            </div>
          )}

          {todayCorteIsToday && state.todayCorte && (
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-lime-500" /> Resumen del Día</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Apertura", value: state.todayCorte.aperturaInfo?.monto ?? 0, color: "" },
                  { label: "Total Ventas", value: state.todayCorte.totalVentas ?? 0, color: "text-lime-600 dark:text-lime-400" },
                  { label: "Efectivo Contado", value: state.todayCorte.efectivoContado ?? 0, color: "" },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color || "text-gray-900 dark:text-white"}`}>${fmt(item.value)}</p>
                  </div>
                ))}
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia</p>
                  {(() => {
                    const d = (state.todayCorte.efectivoContado ?? 0) - (state.todayCorte.esperadoEfectivo ?? 0);
                    return <p className={`text-lg font-bold ${d >= 0 ? "text-lime-600 dark:text-lime-400" : "text-red-500 dark:text-red-400"}`}>{d >= 0 ? "+" : ""}${fmt(d)}</p>;
                  })()}
                </div>
              </div>
            </div>
          )}

          <HistoryTimeline
            loading={state.loadingHistory}
            entries={state.timelineEntries}
            onOpenDay={(key) => dispatch({ type: "SET_SELECTED_DAY_KEY", payload: key })}
            filterMonth={state.historyFilterMonth}
            onFilterChange={(month) => dispatch({ type: "SET_HISTORY_FILTER_MONTH", payload: month })}
            onExportToExcel={exportToExcel}
          />
        </div>

        <DayDetailModal
          day={state.selectedDayKey ? buildDayGroupsForModal(state.timelineEntries).find((day) => day.key === state.selectedDayKey) || null : null}
          onClose={() => dispatch({ type: "SET_SELECTED_DAY_KEY", payload: null })}
        />
      </div>
    );
  }

  /* ── Vista: Caja Abierta ─────────────────────────────────────────────────── */

  const selectedDayGroup = state.selectedDayKey
    ? buildDayGroupsForModal(state.timelineEntries).find((day) => day.key === state.selectedDayKey) || null
    : null;

  return (
    <div className="min-h-screen app-page-bg text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
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
            <Unlock size={18} /> {state.isAperturaSaved ? "Caja Abierta" : "Apertura Pendiente"}
          </div>
        </div>

        {state.todayClosed && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Ya existe un cierre hoy. No se podrá realizar otro cierre.</p>
          </div>
        )}

        <div className="space-y-4 md:space-y-6 w-full">
          {!canManageCaja && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-700 dark:text-blue-300">
              Modo solo lectura: puedes consultar la caja, pero no abrirla ni cerrarla.
            </div>
          )}

          {canManageCaja ? (
            <AperturaForm state={state} dispatch={dispatch} onSave={handleSaveApertura} />
          ) : (
            state.isAperturaSaved && (
              <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-900">
                <h3 className="font-bold mb-2 text-lg">Información de Apertura</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Monto de apertura</p>
                    <p className="text-lg font-bold text-lime-600">${fmt(parseFloat(state.aperturaMonto || "0"))}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fecha y hora</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDateFull(new Date(state.aperturaFecha).toISOString())} {formatTime(new Date(state.aperturaFecha).toISOString())}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Responsable</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{state.aperturaUsuario || "Usuario de Caja"}</p>
                  </div>
                </div>
              </div>
            )
          )}

          {state.isAperturaSaved && (
            <>
              <VentasResumen ventasDia={state.ventasDia} />

              {canManageCaja && !state.todayClosed && !state.closePrepMode && (
                <button
                  type="button"
                  onClick={handleStartClosePrep}
                  disabled={!state.isAperturaSaved || !state.activeCajaId}
                  className="w-full py-3.5 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-bold hover:bg-red-100 dark:hover:bg-red-950/50 transition disabled:opacity-50"
                >
                  Iniciar cierre de caja
                </button>
              )}

              {canManageCaja && state.closePrepMode && !state.todayClosed && (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/20 px-4 py-3">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Paso 1: registre retiros de efectivo (si aplica) y revise el conteo antes de cerrar.
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelClosePrep}
                      className="shrink-0 text-sm text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>

                  <RetirosForm
                    state={state}
                    totalRetiros={totalRetiros}
                    onAddRetiro={async (retiro: any) => {
                      dispatch({ type: "ADD_RETIRO", payload: retiro });
                      if (state.activeCajaId) {
                        try { await CajaService.addRetiro(state.activeCajaId, retiro); }
                        catch (err) { console.error(err); toast.error("Error al guardar el retiro"); }
                      }
                    }}
                    onRemoveRetiro={async (id: number) => {
                      dispatch({ type: "REMOVE_RETIRO", payload: id });
                      if (state.activeCajaId) {
                        try { await CajaService.removeRetiro(state.activeCajaId, id); }
                        catch (err) { console.error(err); toast.error("Error al eliminar el retiro"); }
                      }
                    }}
                  />

                  <CierreForm
                    state={state} dispatch={dispatch}
                    ventasDia={state.ventasDia} aperturaMonto={state.aperturaMonto}
                    totalRetiros={totalRetiros} efectivoEsperado={efectivoEsperado}
                    diferenciaEfectivo={diferenciaEfectivo}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const sinMotivo = state.retiros.some((r) => !String(r.motivo || "").trim());
                      if (sinMotivo) {
                        toast.error("Todos los retiros deben tener motivo");
                        return;
                      }
                      dispatch({ type: "SET_CLOSE_CONFIRM_PHRASE", payload: "" });
                      dispatch({ type: "SET_CLOSE_CONFIRM_ACK", payload: false });
                      dispatch({ type: "SET_CLOSE_CONFIRM_STEP", payload: "review" });
                    }}
                    disabled={!state.isAperturaSaved || !state.activeCajaId}
                    className="w-full mt-2 bg-red-600 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
                  >
                    Continuar — confirmar cierre de caja
                  </button>
                </>
              )}
            </>
          )}

          <HistoryTimeline
            loading={state.loadingHistory}
            entries={state.timelineEntries}
            onOpenDay={(key) => dispatch({ type: "SET_SELECTED_DAY_KEY", payload: key })}
            filterMonth={state.historyFilterMonth}
            onFilterChange={(month) => dispatch({ type: "SET_HISTORY_FILTER_MONTH", payload: month })}
            onExportToExcel={exportToExcel}
          />
        </div>

        <DayDetailModal day={selectedDayGroup} onClose={() => dispatch({ type: "SET_SELECTED_DAY_KEY", payload: null })} />

        {canManageCaja && (
          <>
            <ConfirmDialog
              isOpen={state.closeConfirmStep === "review"}
              title="Paso 1 de 2 — Revisar cierre"
              description={
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <p>Revisa los montos antes de continuar. <strong>Solo se permite un cierre por día.</strong></p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex justify-between"><span>Total ventas del día:</span><span className="font-bold">${fmt(totalVentas)}</span></div>
                    {totalRetiros > 0 && (
                      <div className="flex justify-between mt-1 text-orange-600 dark:text-orange-400">
                        <span>Retiros de efectivo:</span>
                        <span className="font-bold">-${fmt(totalRetiros)}</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-1"><span>Efectivo esperado en caja:</span><span className="font-bold">${fmt(efectivoEsperado)}</span></div>
                    <div className="flex justify-between mt-1"><span>Efectivo contado (queda mañana):</span><span className="font-bold">${fmt(efectivoActual)}</span></div>
                    <div className={`flex justify-between font-bold mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 ${diferenciaEfectivo >= 0 ? "text-lime-600" : "text-red-600"}`}>
                      <span>{diferenciaEfectivo >= 0 ? "Sobrante:" : "Faltante:"}</span>
                      <span>${fmt(Math.abs(diferenciaEfectivo))}</span>
                    </div>
                  </div>
                  {requiereNota && !state.notas.trim() && (
                    <p className="text-amber-600 dark:text-amber-400 text-xs">
                      Agrega una nota explicativa (diferencia mayor a $50) antes de cerrar.
                    </p>
                  )}
                </div>
              }
              confirmLabel="Continuar al paso final"
              cancelLabel="Cancelar"
              danger
              confirmDisabled={requiereNota && !state.notas.trim()}
              onCancel={() => dispatch({ type: "RESET_CLOSE_CONFIRM" })}
              onConfirm={() => {
                if (requiereNota && !state.notas.trim()) {
                  toast.error("Se requiere una nota explicativa para la diferencia mayor a $50");
                  return;
                }
                dispatch({ type: "SET_CLOSE_CONFIRM_PHRASE", payload: "" });
                dispatch({ type: "SET_CLOSE_CONFIRM_ACK", payload: false });
                dispatch({ type: "SET_CLOSE_CONFIRM_STEP", payload: "final" });
              }}
            />

            <ConfirmDialog
              isOpen={state.closeConfirmStep === "final"}
              title="Paso 2 de 2 — Confirmar cierre definitivo"
              description={
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200">
                    <p className="font-semibold">Esta acción no se puede deshacer hoy.</p>
                    <p className="mt-1 text-xs opacity-90">
                      Al confirmar se guardará el corte y no podrás abrir otro cierre hasta mañana.
                    </p>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.closeConfirmAck}
                      onChange={(e) =>
                        dispatch({ type: "SET_CLOSE_CONFIRM_ACK", payload: e.target.checked })
                      }
                      className="mt-1 rounded border-gray-300"
                    />
                    <span>Entiendo que solo se permite <strong>un cierre por día</strong> y deseo cerrar la caja ahora.</span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Escribe <span className="font-mono font-bold text-red-600 dark:text-red-400">CERRAR</span> para confirmar
                    </label>
                    <input
                      type="text"
                      value={state.closeConfirmPhrase}
                      onChange={(e) =>
                        dispatch({ type: "SET_CLOSE_CONFIRM_PHRASE", payload: e.target.value.toUpperCase() })
                      }
                      placeholder="CERRAR"
                      autoComplete="off"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm uppercase"
                    />
                  </div>
                </div>
              }
              confirmLabel="Cerrar caja definitivamente"
              cancelLabel="Volver"
              danger
              confirmDisabled={
                !state.closeConfirmAck ||
                state.closeConfirmPhrase.trim() !== "CERRAR"
              }
              onCancel={() => dispatch({ type: "SET_CLOSE_CONFIRM_STEP", payload: "review" })}
              onConfirm={handleCerrarCaja}
            />
          </>
        )}
      </main>
    </div>
  );
}
