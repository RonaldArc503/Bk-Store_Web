import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent, CardHeader, CardTitle } from "../components/card"; 
import { Button } from "../components/Button"; 
import { Input } from "../components/input";

type ReportType = "sales" | "products" | "income" | "cash-register";

// ================= MOCK DATA =================
const mockSalesData = [
  { ticket: "0001", quantity: 3, date: "2026-03-12 10:30", payment: "Efectivo", total: 210 },
  { ticket: "0002", quantity: 6, date: "2026-03-12 11:15", payment: "Transferencia", total: 400 },
  { ticket: "0003", quantity: 1, date: "2026-03-12 12:00", payment: "Código QR", total: 85 },
  { ticket: "0004", quantity: 12, date: "2026-03-12 14:30", payment: "Efectivo", total: 750 },
  { ticket: "0005", quantity: 2, date: "2026-03-12 15:45", payment: "Transferencia", total: 140 },
];

const mockTopProducts = [
  { name: "Bikini Floral Rojo", sales: 45, revenue: 3150 },
  { name: "Short de Baño Negro", sales: 38, revenue: 3040 },
  { name: "Bikini Deportivo Azul", sales: 32, revenue: 2720 },
  { name: "Traje de Baño Entero", sales: 28, revenue: 2660 },
  { name: "Bikini Unisex Blanco", sales: 25, revenue: 1500 },
];

const mockIncomeData = [
  { ticket: "0001", total: 210 },
  { ticket: "0002", total: 400 },
  { ticket: "0003", total: 85 },
  { ticket: "0004", total: 750 },
  { ticket: "0005", total: 140 },
];

const mockCashRegister = [
  { id: 1, openingAmount: 500, closingAmount: 2067.50, openingDate: "2026-03-12 09:00", closingDate: "2026-03-12 18:00", user: "Juan Pérez" },
  { id: 2, openingAmount: 500, closingAmount: 1845.00, openingDate: "2026-03-11 09:00", closingDate: "2026-03-11 18:00", user: "María García" },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

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
        tableData = mockSalesData.map(sale => [sale.ticket, sale.quantity, sale.date, sale.payment, `$${sale.total.toFixed(2)}`]);
        break;
      case "products":
        headers = ["Producto", "Unidades Vendidas", "Ingresos"];
        tableData = mockTopProducts.map(product => [product.name, product.sales, `$${product.revenue.toFixed(2)}`]);
        break;
      case "income":
        headers = ["N° Ticket", "Total de Venta"];
        tableData = mockIncomeData.map(income => [income.ticket, `$${income.total.toFixed(2)}`]);
        break;
      case "cash-register":
        headers = ["Apertura", "Cierre", "Dinero en Caja", "Usuario"];
        tableData = mockCashRegister.map(register => [register.openingDate, register.closingDate, `$${register.closingAmount.toFixed(2)}`, register.user]);
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6">
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
                  {selectedReport === "sales" && mockSalesData.map((s, i) => (
                    <tr key={`sale-${i}`} className="border-b">
                      <td className="p-3">Ticket {s.ticket} - {s.payment}</td>
                      <td className="p-3 text-right font-medium">${s.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {selectedReport === "products" && mockTopProducts.map((p, i) => (
                    <tr key={`prod-${i}`} className="border-b">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 text-right font-medium">{p.sales} unidades</td>
                    </tr>
                  ))}
                  {selectedReport === "income" && mockIncomeData.map((inc, i) => (
                    <tr key={`inc-${i}`} className="border-b">
                      <td className="p-3">Ingreso Ticket {inc.ticket}</td>
                      <td className="p-3 text-right font-medium">${inc.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {selectedReport === "cash-register" && mockCashRegister.map((c, i) => (
                    <tr key={`cash-${i}`} className="border-b">
                      <td className="p-3">{c.user} ({c.openingDate})</td>
                      <td className="p-3 text-right font-medium">${c.closingAmount.toFixed(2)}</td>
                    </tr>
                  ))}
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



