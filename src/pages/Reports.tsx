import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import {
  Download,
  Calendar,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Archive,
  RotateCcw,
} from "lucide-react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent, CardHeader, CardTitle } from "../components/card";
import { Button } from "../components/Button";
import { Input } from "../components/input";
import { DevolucionModal } from "../components/DevolucionModal";
import { toast } from "react-toastify";
import { OrderService } from "../services/OrderService";
import { CorteService, type CorteRecord } from "../services/CorteService";
import { normalizeOrderItems, procesarDevolucionCompleta } from "../utils/devolucionHelpers";
import { getOrderDevuelto, getOrderEffectiveTotal, sumOrderEffectiveTotals } from "../utils/orderTotals";
import { UserService } from "../services/UserService";
import { useAuth } from "../hooks/useAuth";
import { useSettings } from "../context/SettingsContext";
import { getResolvedBranding } from "../constants/branding";
import {
  getPaperWidthMm,
  getReportMaxNameLen,
  getReportTitleFontSize,
  getReportTotalFontSize,
  getThermalFontSize,
  getThermalLineHeight,
  isLetterPaper,
} from "../utils/printPaperSize";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = "sales" | "products" | "cash-register";
type DatePreset = "all" | "month" | "week" | "custom";

type OrderItem = {
  id?: string;
  productId?: string;
  productoId?: string;
  name?: string;
  nombre?: string;
  quantity?: number;
  cantidad?: number;
  qty?: number;
  unitPrice?: number;
  precio?: number;
  precioUnitario?: number;
  lineTotal?: number;
  subtotal?: number;
  total?: number;
};

type OrderRecord = {
  id: string;
  date?: string;
  createdAt?: string;
  items?: OrderItem[];
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  method?: string;
  total?: number;
  totalDevuelto?: number;
  cashReceived?: number;
  changeAmount?: number;
  devolucion?: { tipo: 'total' | 'parcial'; devolucionId: string; fecha: string; totalDevuelto?: number };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_TYPES: {
  id: ReportType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}[] = [
  {
    id: "sales",
    label: "Ventas",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "products",
    label: "Productos Más Vendidos",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "cash-register",
    label: "Corte de Caja",
    icon: <Archive className="w-5 h-5" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
];

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  qr: "Código QR",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toPaymentLabel = (method?: string) =>
  (method && PAYMENT_LABELS[method]) || method || "Sin método";

const toDateTime = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : format(d, "dd/MM/yyyy HH:mm", { locale: es });
};

const toDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : format(d, "dd/MM/yyyy", { locale: es });
};

const toMoney = (n: number) =>
  n.toLocaleString("es-SV", { style: "currency", currency: "USD" });

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const getItemQuantity = (item: OrderItem) =>
  toNumber(item.quantity ?? item.cantidad ?? item.qty ?? 0);

const getItemName = (item: OrderItem) => {
  const raw = String(item.name ?? item.nombre ?? "").trim();
  return raw || "Producto";
};

const getItemSubtotal = (item: OrderItem) => {
  const quantity = getItemQuantity(item);
  const explicit = toNumber(item.lineTotal ?? item.subtotal ?? item.total);
  if (explicit > 0) return explicit;
  const unitPrice = toNumber(item.unitPrice ?? item.precioUnitario ?? item.precio);
  return quantity * unitPrice;
};

const getItemKey = (item: OrderItem) => {
  const id = String(item.id ?? item.productId ?? item.productoId ?? "").trim();
  if (id) return `id:${id}`;
  const normalizedName = getItemName(item).toLowerCase();
  return `name:${normalizedName}`;
};

const getTicket = (orderId: string) => orderId.slice(-8).toUpperCase();
const getOrderSubtotal = (order: OrderRecord) =>
  toNumber(order.subtotal) ||
  (order.items || []).reduce((sum, item) => sum + getItemSubtotal(item), 0);
const getOrderTotal = (order: OrderRecord) => toNumber(order.total);
const getOrderTotalWithIva = (order: OrderRecord) => {
  const total = getOrderTotal(order);
  if (total > 0) return total;
  return getOrderSubtotal(order);
};
const getOrderTotalWithoutIva = (order: OrderRecord) =>
  roundCurrency(getOrderTotalWithIva(order) / 1.13);

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [cortes, setCortes] = useState<CorteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const { settings } = useSettings();
  const branding = getResolvedBranding(settings);
  const { user } = useAuth();

  const [showDevolucion, setShowDevolucion] = useState(false);
  const [devItems, setDevItems] = useState<Record<string, number>>({});
  const [devMotivo, setDevMotivo] = useState("defectuoso");
  const [isProcessingDev, setIsProcessingDev] = useState(false);

  const MOTIVOS = [
    { value: "defectuoso", label: "Producto defectuoso" },
    { value: "error_venta", label: "Error de venta" },
    { value: "cambio_opinion", label: "Cliente cambió de opinión" },
    { value: "otro", label: "Otro" },
  ];

  const selectedOrderItems = useMemo(
    () => (selectedOrder ? normalizeOrderItems(selectedOrder.items) : []),
    [selectedOrder],
  );

  const openDevolucionModal = () => {
    if (!selectedOrder) return;
    const items = normalizeOrderItems(selectedOrder.items);
    if (items.length === 0) {
      toast.warning("Esta venta no tiene productos registrados para devolver");
      return;
    }
    const initial: Record<string, number> = {};
    items.forEach((_, idx) => { initial[String(idx)] = 0; });
    setDevItems(initial);
    setDevMotivo("defectuoso");
    setShowDevolucion(true);
  };

  const devTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    const items = selectedOrderItems;
    return Object.entries(devItems).reduce((sum, [idx, qty]) => {
      if (qty <= 0) return sum;
      const item = items[Number(idx)];
      if (!item) return sum;
      const unitPrice = getItemSubtotal(item) / (getItemQuantity(item) || 1);
      return sum + unitPrice * qty;
    }, 0);
  }, [devItems, selectedOrder, selectedOrderItems]);

  const hasDevSelection = Object.values(devItems).some((q) => q > 0);

  const handleDevQtyChange = (idx: number, qty: number) => {
    const item = selectedOrderItems[idx];
    const maxQ = item ? getItemQuantity(item) : 0;
    const next = Math.min(maxQ, Math.max(0, qty));
    setDevItems((prev) => ({ ...prev, [String(idx)]: next }));
  };

  const processDevolucion = async () => {
    if (!selectedOrder || !hasDevSelection) return;
    setIsProcessingDev(true);
    try {
      let empNombre = user?.email || "Desconocido";
      let empRol = "Vendedor";
      if (user?.email) {
        try {
          const u = await UserService.getUserByEmail(user.email);
          if (u) { empNombre = u.nombreCompleto || u.usuario; empRol = u.rol || "Vendedor"; }
        } catch { /* ignore */ }
      }

      const result = await procesarDevolucionCompleta({
        order: { ...selectedOrder, items: selectedOrderItems },
        devItems,
        motivo: MOTIVOS.find((m) => m.value === devMotivo)?.label || devMotivo,
        empleado: empNombre,
        empleadoRol: empRol,
        userId: user?.uid,
      });

      toast.success(
        `Devolución ${result.tipo} por ${toMoney(result.montoDevuelto)} — ventas del día y stock actualizados`,
      );
      setShowDevolucion(false);
      setSelectedOrder(null);

      const freshOrders = await OrderService.getAllOrders();
      setOrders(freshOrders);
    } catch (err) {
      console.error("Error procesando devolución:", err);
      const msg = err instanceof Error ? err.message : "Error al procesar la devolución";
      toast.error(msg);
    } finally {
      setIsProcessingDev(false);
    }
  };

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [ordersData, cortesData] = await Promise.all([
          OrderService.getAllOrders(),
          CorteService.getAllCortes(),
        ]);
        if (!mounted) return;
        setOrders(ordersData as OrderRecord[]);
        setCortes(cortesData);
      } catch (err) {
        console.error("Error loading reports data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Date filtering ──────────────────────────────────────────────────────────

  const startRange = useMemo(
    () => new Date(`${startDate}T00:00:00`),
    [startDate],
  );
  const endRange = useMemo(() => new Date(`${endDate}T23:59:59`), [endDate]);

  useEffect(() => {
    const today = new Date();
    if (datePreset === "month") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
      return;
    }
    if (datePreset === "week") {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      setStartDate(format(weekStart, "yyyy-MM-dd"));
      setEndDate(format(weekEnd, "yyyy-MM-dd"));
    }
  }, [datePreset]);

  const inRange = (value?: string) => {
    if (datePreset === "all") return true;
    if (!value) return false;
    const d = new Date(value);
    return !isNaN(d.getTime()) && d >= startRange && d <= endRange;
  };

  const filteredOrders = useMemo(
    () => orders.filter((o) => inRange(o.date || o.createdAt)),
    [orders, startRange, endRange, datePreset],
  );

  const filteredCortes = useMemo(
    () => cortes.filter((c) => inRange(c.createdAt || c.aperturaInfo?.fecha)),
    [cortes, startRange, endRange, datePreset],
  );

  const periodLabel = useMemo(() => {
    if (datePreset === "all") return "Todas";
    if (datePreset === "month") return "Este Mes";
    if (datePreset === "week") return "Esta Semana";
    return `${toDate(startDate)} - ${toDate(endDate)}`;
  }, [datePreset, startDate, endDate]);

  // ── Report data ─────────────────────────────────────────────────────────────

  // Sales data: ahora incluye nombres de artículos
  const salesData = useMemo(() => {
    return filteredOrders.map((o) => {
      // Obtener nombres únicos de productos (o listarlos todos)
      const productNames = (o.items || [])
        .map((item) => item.name || "Producto sin nombre")
        .filter((v, i, a) => a.indexOf(v) === i); // nombres únicos

      const productList = productNames.join(", ");

      const devuelto = getOrderDevuelto(o);
      const neto = getOrderEffectiveTotal(o);
      return {
        ticket: o.id.slice(-8).toUpperCase(),
        itemsCount: (o.items || []).reduce((s, i) => s + getItemQuantity(i), 0),
        productNames: productList,
        date: toDateTime(o.date || o.createdAt),
        payment: toPaymentLabel(o.method),
        total: neto,
        originalTotal: Number(o.total || 0),
        devuelto,
        hasDevolucion: devuelto > 0,
      };
    });
  }, [filteredOrders]);

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { name: string; units: number; revenue: number }
    >();
    filteredOrders.forEach((o) => {
      const items = o.items || [];
      const orderSubtotal = items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
      const orderTotal = toNumber(o.total || 0);
      const factor =
        orderSubtotal > 0 && orderTotal > 0 ? orderTotal / orderSubtotal : 1;

      const orderDevuelto = getOrderDevuelto(o);
      const devFactor =
        orderSubtotal > 0 && orderDevuelto > 0
          ? Math.max(0, 1 - orderDevuelto / orderSubtotal)
          : 1;

      items.forEach((item) => {
        const key = getItemKey(item);
        const prev = map.get(key) ?? {
          name: getItemName(item),
          units: 0,
          revenue: 0,
        };
        const qty = getItemQuantity(item);
        const itemSubtotal = getItemSubtotal(item);
        const revenueWithTax = itemSubtotal * factor * devFactor;
        map.set(key, {
          name: prev.name,
          units: prev.units + qty,
          revenue: prev.revenue + revenueWithTax,
        });
      });
    });
    return [...map.values()]
      .map((p) => ({ ...p, revenue: roundCurrency(p.revenue) }))
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // Desglose por método de pago (para la sección adicional en ventas)
  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const key = toPaymentLabel(o.method);
      breakdown[key] = (breakdown[key] || 0) + getOrderEffectiveTotal(o);
    });
    return breakdown;
  }, [filteredOrders]);

  const cashData = useMemo(
    () =>
      filteredCortes.map((c) => ({
        user: c.aperturaInfo?.usuario || "Usuario",
        openDate: toDateTime(c.aperturaInfo?.fecha),
        closeDate: toDateTime(c.createdAt),
        openAmount: c.aperturaInfo?.monto ?? 0,
        totalSales: c.totalVentas ?? 0,
        counted: c.efectivoContado ?? 0,
        expected: c.esperadoEfectivo ?? 0,
        diff: (c.efectivoContado ?? 0) - (c.esperadoEfectivo ?? 0),
      })),
    [filteredCortes],
  );

  // ── Summary metrics ─────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const totalRevenue = sumOrderEffectiveTotals(filteredOrders);
    const totalDevoluciones = filteredOrders.reduce((s, o) => s + getOrderDevuelto(o), 0);
    const totalUnits = filteredOrders.reduce(
      (s, o) =>
        s + (o.items || []).reduce((si, i) => si + getItemQuantity(i), 0),
      0,
    );
    return {
      orders: filteredOrders.length,
      revenue: totalRevenue,
      devoluciones: totalDevoluciones,
      units: totalUnits,
      cortes: filteredCortes.length,
    };
  }, [filteredOrders, filteredCortes]);

  // ── PDF generation ──────────────────────────────────────────────────────────

  const generatePDF = () => {
    const doc = new jsPDF();
    const generatedLabel = format(new Date(), "dd/MM/yyyy HH:mm", {
      locale: es,
    });
    const reportLabel =
      REPORT_TYPES.find((r) => r.id === selectedReport)?.label ?? "";

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(branding.appName, 105, 18, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Calle Principal #123, San Salvador | Tel: 2222-2222", 105, 24, {
      align: "center",
    });
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    // Report title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(reportLabel, 105, 36, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${periodLabel}`, 105, 42, { align: "center" });
    doc.text(`Generado: ${generatedLabel}`, 105, 47, { align: "center" });

    let startY = 55;

    switch (selectedReport) {
      case "sales": {
        const totalOrders = salesData.length;
        const totalAmount = salesData.reduce((s, r) => s + r.total, 0);

        autoTable(doc, {
          startY,
          head: [["Ticket", "Cant.", "Producto(s)", "Fecha", "Pago", "Total"]],
          body: salesData.map((r) => [
            r.ticket,
            r.itemsCount,
            r.productNames.length > 40
              ? r.productNames.slice(0, 37) + "..."
              : r.productNames,
            r.date,
            r.payment,
            toMoney(r.total),
          ]),
          foot: [["", "", "", "", "TOTAL", toMoney(totalAmount)]],
          theme: "striped",
          headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
          footStyles: {
            fillColor: [219, 234, 254],
            textColor: [30, 64, 175],
            fontStyle: "bold",
            fontSize: 8,
          },
          styles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 15, halign: "center" },
            2: { cellWidth: 55 },
            3: { cellWidth: 40 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25, halign: "right" },
          },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 6;
        doc.setFontSize(8);
        doc.text(`Órdenes en el período: ${totalOrders}`, 14, finalY);

        // Agregar desglose por método de pago
        if (Object.keys(paymentBreakdown).length > 0) {
          const breakdownY = finalY + 6;
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("Desglose por método de pago:", 14, breakdownY);
          autoTable(doc, {
            startY: breakdownY + 3,
            head: [["Método", "Total"]],
            body: Object.entries(paymentBreakdown).map(([k, v]) => [
              k,
              toMoney(v),
            ]),
            theme: "grid",
            headStyles: { fillColor: [37, 99, 235], fontSize: 7 },
            styles: { fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 40, halign: "right" },
            },
          });
        }
        break;
      }

      case "products": {
        const totalUnits = topProducts.reduce((s, p) => s + p.units, 0);
        const totalRevenue = topProducts.reduce((s, p) => s + p.revenue, 0);

        autoTable(doc, {
          startY,
          head: [["#", "Producto", "Unidades", "Ingresos"]],
          body: topProducts.map((p, i) => [
            i + 1,
            p.name,
            p.units,
            toMoney(p.revenue),
          ]),
          foot: [["", "TOTAL", totalUnits, toMoney(totalRevenue)]],
          theme: "striped",
          headStyles: { fillColor: [124, 58, 237], fontSize: 8 },
          footStyles: {
            fillColor: [237, 233, 254],
            textColor: [91, 33, 182],
            fontStyle: "bold",
            fontSize: 8,
          },
          styles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 15, halign: "center" },
            1: { cellWidth: 80 },
            2: { cellWidth: 30, halign: "center" },
            3: { cellWidth: 35, halign: "right" },
          },
        });
        break;
      }

      case "cash-register": {
        const totalSalesSum = cashData.reduce((s, r) => s + r.totalSales, 0);

        autoTable(doc, {
          startY,
          head: [
            [
              "Usuario",
              "Apertura",
              "Cierre",
              "Monto Apertura",
              "Esperado",
              "Contado",
              "Diferencia",
              "Ventas",
            ],
          ],
          body: cashData.map((r) => [
            r.user,
            r.openDate,
            r.closeDate,
            toMoney(r.openAmount),
            toMoney(r.expected),
            toMoney(r.counted),
            toMoney(r.diff),
            toMoney(r.totalSales),
          ]),
          foot: [["", "", "", "", "", "", "", toMoney(totalSalesSum)]],
          theme: "striped",
          headStyles: { fillColor: [234, 88, 12], fontSize: 7 },
          footStyles: {
            fillColor: [255, 237, 213],
            textColor: [154, 52, 18],
            fontStyle: "bold",
            fontSize: 7,
          },
          styles: { fontSize: 6 },
        });
        break;
      }
    }

    const periodFileToken =
      datePreset === "all"
        ? "todas"
        : datePreset === "month"
          ? "este-mes"
          : datePreset === "week"
            ? "esta-semana"
            : `${startDate}_${endDate}`;
    doc.save(`reporte_${selectedReport}_${periodFileToken}.pdf`);
  };

  const downloadOrderReceiptPdf = (order: OrderRecord) => {
    const paperSize = settings.printing.paperSize;
    const width = getPaperWidthMm(paperSize);
    const isLetter = isLetterPaper(paperSize);
    const items = Array.isArray(order.items) ? order.items : [];
    const lh = getThermalLineHeight(paperSize);
    const height = isLetter ? 279 : Math.max(140, 90 + items.length * (lh * 2) + 60);
    const doc = new jsPDF({ unit: "mm", format: isLetter ? "letter" : [width, height] });
    const left = 4; const right = isLetter ? 200 : width - 4; const center = (left + right) / 2;
    const fs = getThermalFontSize(paperSize);
    let y = 8;

    doc.setFontSize(getReportTitleFontSize(paperSize)); doc.setFont("helvetica", "bold");
    doc.text(branding.appName, center, y, { align: "center" }); y += 4;
    doc.setFontSize(fs); doc.setFont("helvetica", "normal");
    doc.text("Sistema de Punto de Venta", center, y, { align: "center" }); y += 5;

    doc.text(`Doc N°: ${getTicket(order.id)}`, left, y);
    doc.text("Caja: 1", right, y, { align: "right" }); y += 3.5;
    doc.text(`Fecha: ${toDateTime(order.date || order.createdAt)}`, left, y); y += 3.5;
    doc.text(`Pago: ${toPaymentLabel(order.method)}`, left, y); y += 3;

    doc.setLineWidth(0.3); doc.line(left, y, right, y); y += 3;

    doc.setFont("helvetica", "bold"); doc.setFontSize(fs);
    doc.text("Cant.", left, y); doc.text("Artículo", left + 8, y);
    y += 2; doc.setLineWidth(0.15); doc.line(left, y, right, y); y += 3;

    doc.setFont("helvetica", "normal"); doc.setFontSize(fs);
    const maxNameLen = getReportMaxNameLen(paperSize);
    items.forEach((item) => {
      const qty = getItemQuantity(item);
      const name = getItemName(item);
      const lineTotal = getItemSubtotal(item);
      const unitPrice = qty > 0 ? lineTotal / qty : 0;
      const displayName = name.length > maxNameLen ? name.substring(0, maxNameLen - 1) + "…" : name;
      doc.text(`${qty}`, left, y); doc.text(displayName, left + 8, y); y += lh;
      doc.setFontSize(fs - 1);
      doc.text(`  P.Unit: $${unitPrice.toFixed(2)}`, left, y);
      doc.text(`$${lineTotal.toFixed(2)}`, right, y, { align: "right" });
      doc.setFontSize(fs); y += lh;
    });

    y += 1; doc.line(left, y, right, y); y += 3.5;

    const total = getOrderTotalWithIva(order);
    const base = Math.round((total / 1.13) * 100) / 100;
    const iva = Math.round((total - base) * 100) / 100;

    doc.setFontSize(fs);
    doc.text("Subtotal (sin IVA):", left, y); doc.text(`$${base.toFixed(2)}`, right, y, { align: "right" }); y += 3.5;
    doc.text("IVA 13%:", left, y); doc.text(`$${iva.toFixed(2)}`, right, y, { align: "right" }); y += 3;
    doc.setLineWidth(0.4); doc.line(left, y, right, y); y += 4;

    doc.setFontSize(getReportTotalFontSize(paperSize)); doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", left, y); doc.text(`$${total.toFixed(2)}`, right, y, { align: "right" }); y += 5;

    doc.setFontSize(fs); doc.setFont("helvetica", "normal");
    doc.text(`Método de pago: ${toPaymentLabel(order.method)}`, left, y); y += 3.5;
    if (order.method === "efectivo") {
      const cashReceived = toNumber(order.cashReceived) > 0 ? toNumber(order.cashReceived) : total;
      const hasSavedChange = order.changeAmount !== null && typeof order.changeAmount !== "undefined";
      const changeAmount = hasSavedChange ? toNumber(order.changeAmount) : roundCurrency(total - cashReceived);
      const formattedChange = changeAmount < 0 ? `-$${Math.abs(changeAmount).toFixed(2)}` : `$${changeAmount.toFixed(2)}`;
      doc.text(`Efectivo: $${cashReceived.toFixed(2)}`, left, y); y += 3.5;
      doc.text(`Cambio: ${formattedChange}`, left, y); y += 4;
    } else {
      doc.text(`Pagado: $${total.toFixed(2)}`, left, y); y += 4;
    }

    doc.setLineWidth(0.3); doc.line(left, y, right, y); y += 3.5;
    doc.setFontSize(fs);
    doc.text("¡Gracias por su compra!", center, y, { align: "center" }); y += 3;
    doc.setFontSize(fs - 1);
    doc.text("IVA incluido en todos los precios", center, y, { align: "center" });

    const safeId = String(order.id).replace(/[^a-zA-Z0-9_-]/g, "");
    doc.save(`comprobante-${safeId || "venta"}.pdf`);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const summaryCards = [
    {
      label: "Órdenes",
      value: metrics.orders,
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Ingresos netos",
      value: toMoney(metrics.revenue),
      icon: <DollarSign className="w-4 h-4" />,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Devoluciones",
      value: toMoney(metrics.devoluciones),
      icon: <RotateCcw className="w-4 h-4" />,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Artículos vendidos",
      value: metrics.units,
      icon: <ShoppingBag className="w-4 h-4" />,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      label: "Cortes de caja",
      value: metrics.cortes,
      icon: <Archive className="w-4 h-4" />,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
  ];

  const renderTable = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={8} className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-green-600"></div>
              <span className="text-sm text-gray-500">Cargando datos...</span>
            </div>
          </td>
        </tr>
      );
    }

    switch (selectedReport) {
      case "sales":
        return salesData.length === 0 ? (
          <tr>
            <td colSpan={6} className="p-8 text-center text-gray-500">
              <div className="flex flex-col items-center gap-1">
                <TrendingUp className="w-8 h-8 text-gray-300" />
                <span className="text-sm">
                  Sin ventas en el período seleccionado
                </span>
              </div>
            </td>
          </tr>
        ) : (
          <>
            {salesData.map((r, i) => (
              (() => {
                const order = filteredOrders[i];
                return (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {r.ticket}
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {r.itemsCount}
                </td>
                <td
                  className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[250px] truncate"
                  title={r.productNames}
                >
                  {r.productNames || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {r.date}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {r.payment}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <span className="font-semibold">{toMoney(r.total)}</span>
                  {r.hasDevolucion && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      −{toMoney(r.devuelto)} dev.
                    </p>
                  )}
                </td>
              </tr>
                );
              })()
            ))}
            <tr className="bg-blue-50 dark:bg-blue-950/30 font-medium border-t border-blue-200 dark:border-blue-800">
              <td
                colSpan={4}
                className="px-4 py-3 text-sm text-blue-700 dark:text-blue-300"
              >
                Total ({salesData.length} ventas)
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right text-sm font-bold text-blue-700 dark:text-blue-300">
                {toMoney(salesData.reduce((s, r) => s + r.total, 0))}
              </td>
            </tr>
            {/* Desglose por método de pago */}
            {Object.keys(paymentBreakdown).length > 0 && (
              <tr>
                <td colSpan={6} className="px-0">
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 flex flex-wrap gap-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Desglose por método de pago:
                    </span>
                    {Object.entries(paymentBreakdown).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-sm text-gray-600 dark:text-gray-400"
                      >
                        <span className="font-medium">{k}:</span> {toMoney(v)}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </>
        );

      case "products":
        return topProducts.length === 0 ? (
          <tr>
            <td colSpan={4} className="p-8 text-center text-gray-500">
              <div className="flex flex-col items-center gap-1">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
                <span className="text-sm">
                  Sin datos de productos en el período
                </span>
              </div>
            </td>
          </tr>
        ) : (
          <>
            {topProducts.map((p, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-3 text-center font-bold text-purple-600 dark:text-purple-400 text-sm">
                  #{i + 1}
                </td>
                <td className="px-4 py-3 font-medium text-sm">{p.name}</td>
                <td className="px-4 py-3 text-center text-sm">{p.units}</td>
                <td className="px-4 py-3 text-right font-semibold text-sm">
                  {toMoney(p.revenue)}
                </td>
              </tr>
            ))}
            <tr className="bg-purple-50 dark:bg-purple-950/30 font-medium border-t border-purple-200 dark:border-purple-800">
              <td
                colSpan={2}
                className="px-4 py-3 text-sm text-purple-700 dark:text-purple-300"
              >
                Total
              </td>
              <td className="px-4 py-3 text-center text-sm text-purple-700 dark:text-purple-300">
                {topProducts.reduce((s, p) => s + p.units, 0)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-purple-700 dark:text-purple-300">
                {toMoney(topProducts.reduce((s, p) => s + p.revenue, 0))}
              </td>
            </tr>
          </>
        );

      case "cash-register":
        return cashData.length === 0 ? (
          <tr>
            <td colSpan={7} className="p-8 text-center text-gray-500">
              <div className="flex flex-col items-center gap-1">
                <Archive className="w-8 h-8 text-gray-300" />
                <span className="text-sm">
                  Sin cortes de caja en el período seleccionado
                </span>
              </div>
            </td>
          </tr>
        ) : (
          <>
            {cashData.map((r, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-sm">{r.user}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {r.openDate}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {r.closeDate}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {toMoney(r.counted)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {toMoney(r.expected)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <span
                    className={`font-semibold ${
                      r.diff < 0
                        ? "text-red-600 dark:text-red-400"
                        : r.diff > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500"
                    }`}
                  >
                    {r.diff >= 0 ? "+" : ""}
                    {toMoney(r.diff)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-sm">
                  {toMoney(r.totalSales)}
                </td>
              </tr>
            ))}
            <tr className="bg-orange-50 dark:bg-orange-950/30 font-medium border-t border-orange-200 dark:border-orange-800">
              <td
                colSpan={6}
                className="px-4 py-3 text-sm text-orange-700 dark:text-orange-300"
              >
                Total ventas ({cashData.length} cortes)
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-orange-700 dark:text-orange-300">
                {toMoney(cashData.reduce((s, r) => s + r.totalSales, 0))}
              </td>
            </tr>
          </>
        );

      default:
        return null;
    }
  };

  const tableHeaders: Record<
    ReportType,
    { label: string; align?: "left" | "center" | "right" }[]
  > = {
    sales: [
      { label: "Ticket", align: "left" },
      { label: "Cant.", align: "center" },
      { label: "Producto(s)", align: "left" },
      { label: "Fecha", align: "left" },
      { label: "Pago", align: "left" },
      { label: "Total", align: "right" },
    ],
    products: [
      { label: "#", align: "center" },
      { label: "Producto", align: "left" },
      { label: "Unidades", align: "center" },
      { label: "Ingresos", align: "right" },
    ],
    "cash-register": [
      { label: "Usuario", align: "left" },
      { label: "Apertura", align: "left" },
      { label: "Cierre", align: "left" },
      { label: "Contado", align: "right" },
      { label: "Esperado", align: "right" },
      { label: "Diferencia", align: "right" },
      { label: "Ventas", align: "right" },
    ],
  };

  const activeReport = REPORT_TYPES.find((r) => r.id === selectedReport)!;

  return (
    <div className="min-h-screen app-page-bg text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="reportes" />

      <main className="flex-1 p-4 md:p-6 pt-20 md:pt-6 space-y-5">
        {/* Page header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Reportes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Selecciona un tipo de reporte y rango de fechas para visualizar y
            exportar
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map((c) => (
            <Card
              key={c.label}
              className="shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl"
            >
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${c.bgColor} ${c.color} flex-shrink-0`}
                >
                  {c.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {c.label}
                  </p>
                  <p className="font-bold text-sm md:text-base truncate">
                    {c.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report type selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {REPORT_TYPES.map((type) => {
            const active = selectedReport === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`flex items-center gap-2 p-2.5 md:p-3 rounded-xl transition-all ${
                  active
                    ? `bg-green-50 dark:bg-green-950/40 border-2 border-green-500 dark:border-green-600 ${type.color}`
                    : `bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm`
                }`}
              >
                <span
                  className={
                    active ? type.color : "text-gray-500 dark:text-gray-400"
                  }
                >
                  {type.icon}
                </span>
                <span
                  className={`text-xs md:text-sm font-medium leading-tight ${active ? "font-semibold" : ""}`}
                >
                  {type.label}
                </span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Date range card */}
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4 text-gray-400" /> Período
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={() => setDatePreset("all")}
                className={`${
                  datePreset === "all"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-white dark:bg-gray-900 !text-gray-900 dark:!text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Todas
              </Button>
              <Button
                onClick={() => setDatePreset("month")}
                className={`${
                  datePreset === "month"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-white dark:bg-gray-900 !text-gray-900 dark:!text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Este Mes
              </Button>
              <Button
                onClick={() => setDatePreset("week")}
                className={`${
                  datePreset === "week"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-white dark:bg-gray-900 !text-gray-900 dark:!text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Esta Semana
              </Button>
              <Button
                onClick={() => setDatePreset("custom")}
                className={`${
                  datePreset === "custom"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-white dark:bg-gray-900 !text-gray-900 dark:!text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Rango
              </Button>
            </div>
            {datePreset === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Desde
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setStartDate(e.target.value)
                    }
                    className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Hasta
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEndDate(e.target.value)
                    }
                    className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Filtro activo: <span className="font-medium">{periodLabel}</span>
            </p>
          </CardContent>
        </Card>

        {/* Report table card */}
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between w-full">
 <div className="flex items-center gap-2 text-base font-semibold flex-shrink-0">
  <span className={`${activeReport.color} inline-flex items-center`}>{activeReport.icon}</span>
  <span className="text-gray-800 dark:text-gray-200">{activeReport.label}</span>
</div>
  <Button
    onClick={generatePDF}
    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg flex-shrink-0"
  >
    <Download className="w-4 h-4" />
    <span>Exportar PDF</span>
  </Button>
</div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {tableHeaders[selectedReport].map((h, idx) => (
                      <th
                        key={idx}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                          h.align === "right"
                            ? "text-right"
                            : h.align === "center"
                              ? "text-center"
                              : "text-left"
                        }`}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderTable()}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {selectedOrder && !showDevolucion && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const totalConIva = getOrderTotalWithIva(selectedOrder);
              const totalSinIva = getOrderTotalWithoutIva(selectedOrder);
              const isCash = selectedOrder.method === "efectivo";
              const efectivo = toNumber(selectedOrder.cashReceived) > 0 ? toNumber(selectedOrder.cashReceived) : totalConIva;
              const hasSavedChange = selectedOrder.changeAmount !== null && typeof selectedOrder.changeAmount !== "undefined";
              const cambio = hasSavedChange ? toNumber(selectedOrder.changeAmount) : roundCurrency(totalConIva - efectivo);
              const cambioText = cambio < 0 ? `-$${Math.abs(cambio).toFixed(2)}` : `$${cambio.toFixed(2)}`;
              return (
                <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Detalle de venta
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ticket: {getTicket(selectedOrder.id)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-2 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
                  <p className="font-medium">{toDateTime(selectedOrder.date || selectedOrder.createdAt)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tipo de pago</p>
                  <p className="font-medium">{toPaymentLabel(selectedOrder.method)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total sin IVA</p>
                  <p className="font-medium">{toMoney(totalSinIva)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total con IVA</p>
                  <p className="font-semibold">{toMoney(totalConIva)}</p>
                </div>
                {isCash && (
                  <>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo</p>
                      <p className="font-medium">{toMoney(efectivo)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cambio</p>
                      <p className="font-medium">{cambioText}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Producto</th>
                      <th className="px-3 py-2 text-center text-xs uppercase text-gray-500">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs uppercase text-gray-500">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderItems.map((item, idx) => (
                      <tr key={`${getItemKey(item)}-${idx}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2">{getItemName(item)}</td>
                        <td className="px-3 py-2 text-center">{getItemQuantity(item)}</td>
                        <td className="px-3 py-2 text-right font-medium">{toMoney(getItemSubtotal(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrder.devolucion && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedOrder.devolucion.tipo === 'total'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                }`}>
                  <RotateCcw className="w-4 h-4" />
                  Venta con devolución {selectedOrder.devolucion.tipo}
                </div>
              )}

              <div className="flex justify-end gap-2">
                {!selectedOrder.devolucion?.tipo || selectedOrder.devolucion.tipo !== 'total' ? (
                  <Button
                    onClick={openDevolucionModal}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Devolución
                  </Button>
                ) : null}
                <Button
                  onClick={() => downloadOrderReceiptPdf(selectedOrder)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </Button>
              </div>
              </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {selectedOrder && (
        <DevolucionModal
          isOpen={showDevolucion}
          ticketLabel={`Ticket: ${getTicket(selectedOrder.id)} · ${getItemName(selectedOrderItems[0] || {})}${selectedOrderItems.length > 1 ? ` +${selectedOrderItems.length - 1}` : ""}`}
          items={selectedOrderItems}
          devItems={devItems}
          devMotivo={devMotivo}
          motivos={MOTIVOS}
          devTotal={devTotal}
          hasSelection={hasDevSelection}
          isProcessing={isProcessingDev}
          formatMoney={toMoney}
          onClose={() => setShowDevolucion(false)}
          onMotivoChange={setDevMotivo}
          onQtyChange={handleDevQtyChange}
          onConfirm={processDevolucion}
        />
      )}
    </div>
  );
}
