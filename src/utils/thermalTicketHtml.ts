import type { SaleTicketData } from './escposTicket'
import { getPaperWidthMm, type PaperSize } from './printPaperSize'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

export function buildThermalTicketHtml(data: SaleTicketData, paperSize: PaperSize): string {
  const paperMm = getPaperWidthMm(paperSize)
  const ticketId = String(data.orderId || '').slice(-8).toUpperCase()
  const payment = data.paymentLabel || data.method || 'Efectivo'
  const total = Number(data.total || 0)
  const base = Math.round((total / 1.13) * 100) / 100
  const iva = Math.round((total - base) * 100) / 100
  const fontSize = paperSize === '58mm' ? '10px' : '11px'

  const itemRows = data.items
    .map((item) => {
      const qty = Number(item.quantity || 0)
      const lineTotal = Number(item.lineTotal || 0)
      const unit = qty > 0 ? lineTotal / qty : 0
      return `
        <tr>
          <td class="qty">${qty}</td>
          <td class="name">${escapeHtml(item.name || 'Producto')}</td>
          <td class="num">${money(unit)}</td>
          <td class="num">${money(lineTotal)}</td>
        </tr>`
    })
    .join('')

  const cashRows =
    data.method === 'efectivo'
      ? (() => {
          const cashReceived = Number(data.cashReceived ?? total)
          const changeAmount = Number(data.changeAmount ?? cashReceived - total)
          const changeText =
            changeAmount < 0 ? `-${money(Math.abs(changeAmount))}` : money(changeAmount)
          return `
            <div class="row"><span>Efectivo</span><span>${money(cashReceived)}</span></div>
            <div class="row"><span>Cambio</span><span>${changeText}</span></div>`
        })()
      : `<div class="row"><span>Pagado</span><span>${money(total)}</span></div>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${escapeHtml(ticketId)}</title>
  <style>
    @page { size: ${paperMm}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      width: ${paperMm}mm;
      margin: 0;
      padding: 2mm 2.5mm 4mm;
      background: #fff;
      color: #000;
      font-family: "Courier New", Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.25;
    }
    .center { text-align: center; }
    .store { font-size: 1.15em; font-weight: 700; text-transform: uppercase; margin: 0 0 2px; }
    .subtitle { margin: 0 0 6px; text-transform: uppercase; color: #333; }
    .meta { margin-bottom: 6px; }
    .meta div { margin: 1px 0; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th, td { padding: 1px 0; vertical-align: top; }
    th { border-bottom: 1px solid #000; font-size: 0.92em; text-transform: uppercase; }
    td.qty { width: 8mm; }
    td.name { word-break: break-word; padding-right: 2mm; }
    td.num { width: 14mm; text-align: right; white-space: nowrap; }
    tr.item + tr.item td { border-top: 1px dotted #bbb; }
    .totals { margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
    .row { display: flex; justify-content: space-between; gap: 4mm; margin: 1px 0; }
    .total { font-weight: 700; font-size: 1.08em; border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; }
    .policy { margin-top: 6px; font-size: 0.88em; font-style: italic; text-align: center; }
    .thanks { margin-top: 4px; text-align: center; font-weight: 700; }
  </style>
</head>
<body>
  <div class="center">
    <p class="store">${escapeHtml(data.storeName)}</p>
    ${data.subtitle ? `<p class="subtitle">${escapeHtml(data.subtitle)}</p>` : ''}
  </div>
  <div class="meta">
    <div>Doc N°: <strong>${escapeHtml(ticketId)}</strong></div>
    <div>Fecha: ${escapeHtml(data.date)}</div>
    <div>Caja: 1</div>
    <div>Cliente: Consumidor Final</div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="qty">Cant</th>
        <th>Artículo</th>
        <th class="num">P.U</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal (sin IVA)</span><span>${money(base)}</span></div>
    <div class="row"><span>IVA 13%</span><span>${money(iva)}</span></div>
    <div class="row total"><span>TOTAL</span><span>${money(total)}</span></div>
    <div class="row"><span>Método de pago</span><span>${escapeHtml(payment)}</span></div>
    ${cashRows}
  </div>
  <p class="policy">No se aceptan cambios ni devoluciones en prendas de ropa interior</p>
  <p class="thanks">Gracias por tu preferencia</p>
</body>
</html>`
}

export function buildTestTicketHtml(paperSize: PaperSize): string {
  const paperMm = getPaperWidthMm(paperSize)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Prueba PR-100</title>
  <style>
    @page { size: ${paperMm}mm auto; margin: 0; }
    body {
      width: ${paperMm}mm;
      margin: 0;
      padding: 4mm;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      text-align: center;
    }
    h1 { font-size: 16px; margin: 0 0 8px; }
  </style>
</head>
<body>
  <h1>PRUEBA PR-100</h1>
  <p>Si lees esto, la ticketera funciona.</p>
  <p>${new Date().toLocaleString('es-SV')}</p>
</body>
</html>`
}
