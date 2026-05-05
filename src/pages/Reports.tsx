import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent, CardHeader, CardTitle } from "../components/card"; 
import { Button } from "../components/Button"; 
import { Input } from "../components/input";
import { OrderService } from "../services/OrderService";
import { CorteService, type CorteRecord } from "../services/CorteService";

type ReportType = "sales" | "products" | "income" | "cash-register";

type OrderItem = {
  id?: string
  name?: string
  quantity?: number
  unitPrice?: number
  lineTotal?: number
}

type OrderRecord = {
  id: string
  date?: string
  createdAt?: string
  items?: OrderItem[]
  method?: string
  total?: number
}

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [cortes, setCortes] = useState<CorteRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [ordersData, cortesData] = await Promise.all([
          OrderService.getAllOrders(),
          CorteService.getAllCortes(),
        ])
        if (!mounted) return
        setOrders(ordersData as OrderRecord[])
        setCortes(cortesData)
      } catch (error) {
        console.error('Error loading reports data:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const startRange = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate])
  const endRange = useMemo(() => new Date(`${endDate}T23:59:59`), [endDate])

  const isInRange = (value?: string) => {
    if (!value) return false
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return false
    return d >= startRange && d <= endRange
  }

  const formatDateTime = (value?: string) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return format(d, 'yyyy-MM-dd HH:mm', { locale: es })
  }

  const paymentLabel = (method?: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo'
      case 'tarjeta':
        return 'Tarjeta'
      case 'transferencia':
        return 'Transferencia'
      case 'qr':
        return 'Codigo QR'
      default:
        return method || 'Sin metodo'
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => isInRange(order.date || order.createdAt))
  }, [orders, startRange, endRange])

  const filteredCortes = useMemo(() => {
    return cortes.filter((corte) => isInRange(corte.createdAt || corte.aperturaInfo?.fecha))
  }, [cortes, startRange, endRange])

  const salesData = useMemo(() => {
    return filteredOrders.map((order) => {
      const qty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
      return {
        ticket: order.id,
        quantity: qty,
        date: formatDateTime(order.date || order.createdAt),
        payment: paymentLabel(order.method),
        total: Number(order.total || 0),
      }
    })
  }, [filteredOrders])

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; sales: number; revenue: number }>()
    filteredOrders.forEach((order) => {
      ;(order.items || []).forEach((item) => {
        const key = item.id || item.name || 'unknown'
        const current = map.get(key) || { name: item.name || 'Producto', sales: 0, revenue: 0 }
        const qty = item.quantity || 0
        const revenue = item.lineTotal ?? (qty * (item.unitPrice || 0))
        map.set(key, {
          name: current.name,
          sales: current.sales + qty,
          revenue: current.revenue + revenue,
        })
      })
    })
    return Array.from(map.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
  }, [filteredOrders])

  const incomeData = useMemo(() => {
    return filteredOrders.map((order) => ({
      ticket: order.id,
      total: Number(order.total || 0),
    }))
  }, [filteredOrders])

  const cashRegisterData = useMemo(() => {
    return filteredCortes.map((corte) => ({
      openingAmount: corte.aperturaInfo?.monto ?? 0,
      closingAmount: corte.totalVentas ?? 0,
      openingDate: formatDateTime(corte.aperturaInfo?.fecha),
      closingDate: formatDateTime(corte.createdAt),
      user: corte.aperturaInfo?.usuario || 'Usuario',
    }))
  }, [filteredCortes])

  const previewRows = useMemo(() => {
    switch (selectedReport) {
      case 'sales':
        return salesData.map((sale) => ({
          label: `Ticket ${sale.ticket} - ${sale.payment}`,
          value: `$${sale.total.toFixed(2)}`,
        }))
      case 'products':
        return topProducts.map((product) => ({
          label: product.name,
          value: `${product.sales} unidades`,
        }))
      case 'income':
        return incomeData.map((income) => ({
          label: `Ingreso Ticket ${income.ticket}`,
          value: `$${income.total.toFixed(2)}`,
        }))
      case 'cash-register':
        return cashRegisterData.map((register) => ({
          label: `${register.user} (${register.openingDate})`,
          value: `$${register.closingAmount.toFixed(2)}`,
        }))
      default:
        return []
    }
  }, [selectedReport, salesData, topProducts, incomeData, cashRegisterData])

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Bikini Store", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Calle Principal #123, San Salvador", 105, 27, { align: "center" });
    doc.text("Tel: 2222-2222", 105, 32, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const reportTitles: Record<ReportType, string> = {
      sales: "Reporte de Ventas Realizadas",
      products: "Reporte de Productos Más Vendidos",
      income: "Reporte de Ingresos",
      "cash-register": "Reporte de Corte de Caja"
    };
    doc.text(reportTitles[selectedReport], 105, 45, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: es })} - ${format(new Date(endDate), "dd/MM/yyyy", { locale: es })}`, 105, 52, { align: "center" });
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 105, 57, { align: "center" });

    let tableData: any[][] = [];
    let headers: string[] = [];

    switch (selectedReport) {
      case "sales":
        headers = ["Ticket", "Cantidad", "Fecha", "Forma de Pago", "Total"];
        tableData = salesData.map(sale => [sale.ticket, sale.quantity, sale.date, sale.payment, `$${sale.total.toFixed(2)}`]);
        break;
      case "products":
        headers = ["Producto", "Unidades Vendidas", "Ingresos"];
        tableData = topProducts.map(product => [product.name, product.sales, `$${product.revenue.toFixed(2)}`]);
        break;
      case "income":
        headers = ["N° Ticket", "Total de Venta"];
        tableData = incomeData.map(income => [income.ticket, `$${income.total.toFixed(2)}`]);
        break;
      case "cash-register":
        headers = ["Apertura", "Cierre", "Dinero en Caja", "Usuario"];
        tableData = cashRegisterData.map(register => [register.openingDate, register.closingDate, `$${register.closingAmount.toFixed(2)}`, register.user]);
        break;
    }

    autoTable(doc, {
      startY: 65,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 195, 74] },
      styles: { fontSize: 9 },
    });

    doc.save(`reporte_${selectedReport}.pdf`);
  };

  const reportTypes = [
    { id: "sales", name: "Ventas Realizadas", description: "Número de ticket, cantidad, fecha y total" },
    { id: "products", name: "Productos Más Vendidos", description: "Ranking por cantidad de ventas" },
    { id: "income", name: "Ingresos en Ventas", description: "Reporte simplificado de entradas" },
    { id: "cash-register", name: "Corte de Caja", description: "Balance y usuario responsable" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="reportes" />
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Reportes Personalizados</h2>
          <p className="text-muted-foreground">Filtre información y genere su archivo PDF</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((type) => (
            <Card 
              key={type.id} 
              className={`cursor-pointer transition-all border-2 ${selectedReport === type.id ? 'border-green-500 bg-green-50' : 'hover:border-gray-300'}`}
              onClick={() => setSelectedReport(type.id as ReportType)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{type.name}</h4>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
                {selectedReport === type.id && <div className="h-4 w-4 bg-green-500 rounded-full" />}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Rango de Fechas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} 
            />
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vista Previa: {reportTypes.find(t => t.id === selectedReport)?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-3 text-left">Referencia</th>
                    <th className="p-3 text-right">Monto / Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-sm text-gray-500 text-center">Cargando datos...</td>
                    </tr>
                  ) : previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-sm text-gray-500 text-center">Sin datos para el rango seleccionado</td>
                    </tr>
                  ) : (
                    previewRows.map((row, i) => (
                      <tr key={`row-${i}`} className="border-b">
                        <td className="p-3">{row.label}</td>
                        <td className="p-3 text-right font-medium">{row.value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={generatePDF} className="bg-green-600 hover:bg-green-700 text-white">
                <Download className="w-4 h-4 mr-2" /> Descargar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}



