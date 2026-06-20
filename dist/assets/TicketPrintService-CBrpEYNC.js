import{h as e}from"./AppBrandLogo-DgUXODgn.js";import{n as t}from"./printPaperSize-Bcb-7gTI.js";var n=e(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),r=`\x1B`;r+``,r+``,r+``,r+``,r+``,r+``,r+``;var i=`POS-58`,a=(e,t,n)=>`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${t}</title>
  <style>
    html, body { margin: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 12px 16px;
      background: #111827;
      color: #fff;
    }
    .toolbar button {
      background: #06b6d4;
      color: #fff;
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .toolbar p { margin: 0; font-size: 12px; color: #d1d5db; max-width: 520px; }
    .preview { display: flex; justify-content: center; padding: 16px; }
    .sheet { background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.15); }
    @media print {
      html, body { background: #fff; }
      .toolbar { display: none !important; }
      .preview { padding: 0; }
      .sheet { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" onclick="window.print()">Imprimir en ${n}</button>
    <p>Impresora: ${n} (predeterminada en Windows). Papel: 58 mm. Sin encabezado ni pie de pagina.</p>
  </div>
  <div class="preview">
    <div class="sheet">${e}</div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  <\/script>
</body>
</html>`;function o(e){return new Promise((t,n)=>{let r=window.open(``,`_blank`,`width=420,height=720`);if(!r){n(Error(`Permite ventanas emergentes para imprimir el ticket.`));return}r.document.open(),r.document.write(e),r.document.close(),r.addEventListener(`afterprint`,()=>{r.close(),t()}),setTimeout(t,12e4)})}function s(e,t=`Ticket`,n=i){let r=e.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]??e;return o(a(`${e.match(/<head[^>]*>([\s\S]*)<\/head>/i)?.[1]??``}${r}`,t,n))}function c(e){return new Promise((t,n)=>{try{let r=e.output(`blob`),i=URL.createObjectURL(r),a=window.open(i,`_blank`);if(!a){URL.revokeObjectURL(i),n(Error(`Permite ventanas emergentes para imprimir el ticket.`));return}a.addEventListener(`load`,()=>{a.focus(),a.print()}),a.addEventListener(`afterprint`,()=>{URL.revokeObjectURL(i),a.close(),t()}),setTimeout(()=>{URL.revokeObjectURL(i),t()},12e4)}catch(e){n(e)}})}function l(e,t=i){return`Se enviara a ${t} (impresora predeterminada en Windows). Papel 58 mm.`}function u(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function d(e){return`$${e.toFixed(2)}`}function f(e,n){let r=t(n),i=String(e.orderId||``).slice(-8).toUpperCase(),a=e.paymentLabel||e.method||`Efectivo`,o=Number(e.total||0),s=Math.round(o/1.13*100)/100,c=Math.round((o-s)*100)/100,l=n===`58mm`?`10px`:`11px`,f=e.items.map(e=>{let t=Number(e.quantity||0),n=Number(e.lineTotal||0),r=t>0?n/t:0;return`
        <tr>
          <td class="qty">${t}</td>
          <td class="name">${u(e.name||`Producto`)}</td>
          <td class="num">${d(r)}</td>
          <td class="num">${d(n)}</td>
        </tr>`}).join(``),p=e.method===`efectivo`?(()=>{let t=Number(e.cashReceived??o),n=Number(e.changeAmount??t-o),r=n<0?`-${d(Math.abs(n))}`:d(n);return`
            <div class="row"><span>Efectivo</span><span>${d(t)}</span></div>
            <div class="row"><span>Cambio</span><span>${r}</span></div>`})():`<div class="row"><span>Pagado</span><span>${d(o)}</span></div>`;return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${u(i)}</title>
  <style>
    @page { size: ${r}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      width: ${r}mm;
      margin: 0;
      padding: 2mm 2.5mm 4mm;
      background: #fff;
      color: #000;
      font-family: "Courier New", Courier, monospace;
      font-size: ${l};
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
    <p class="store">${u(e.storeName)}</p>
    ${e.subtitle?`<p class="subtitle">${u(e.subtitle)}</p>`:``}
  </div>
  <div class="meta">
    <div>Doc N°: <strong>${u(i)}</strong></div>
    <div>Fecha: ${u(e.date)}</div>
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
    <tbody>${f}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal (sin IVA)</span><span>${d(s)}</span></div>
    <div class="row"><span>IVA 13%</span><span>${d(c)}</span></div>
    <div class="row total"><span>TOTAL</span><span>${d(o)}</span></div>
    <div class="row"><span>Método de pago</span><span>${u(a)}</span></div>
    ${p}
  </div>
  <p class="policy">No se aceptan cambios ni devoluciones en prendas de ropa interior</p>
  <p class="thanks">Gracias por tu preferencia</p>
</body>
</html>`}function p(e){let n=t(e);return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Prueba POS-58</title>
  <style>
    @page { size: ${n}mm auto; margin: 0; }
    body {
      width: ${n}mm;
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
  <h1>PRUEBA POS-58</h1>
  <p>Si lees esto, la ticketera funciona.</p>
  <p>${new Date().toLocaleString(`es-SV`)}</p>
</body>
</html>`}function m(e){return e?.trim()||`POS-58`}async function h(e,t){let n=m(t.printerName),r=f(e,t.paperSize);try{return await s(r,`Ticket de venta`,n),{method:`html`,printer:n}}catch(e){if(t.pdfFallback)try{return await c(t.pdfFallback),{method:`pdf`,printer:n}}catch{}throw e instanceof Error?e:Error(`No se pudo imprimir en ${n}. Revisa la cola de impresion.`)}}async function g(e){let t=m(e.printerName);return await s(p(e.paperSize),`Prueba POS-58`,t),{method:`html`,printer:t}}export{n as i,g as n,l as r,h as t};