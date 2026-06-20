import{h as e}from"./AppBrandLogo-CDp8sSlS.js";import{n as t}from"./printPaperSize-CobbH3z5.js";var n=e(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),r=`\x1B`;r+``,r+``,r+``,r+``,r+``,r+``,r+``;function i(e){return new Promise((t,n)=>{let r=e.contentWindow;if(!r){n(Error(`No se pudo abrir la ventana de impresion`));return}let i=!1,a=()=>{i||(i=!0,t())};r.addEventListener(`afterprint`,a,{once:!0}),r.focus(),r.print(),setTimeout(a,3e3)})}function a(e){return new Promise((t,n)=>{try{let r=document.createElement(`iframe`);r.style.cssText=`position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none`,document.body.appendChild(r);let a=()=>{r.remove()},o=r.contentDocument;if(!o){a(),n(Error(`No se pudo preparar el ticket`));return}o.open(),o.write(e),o.close(),i(r).then(()=>{a(),t()}).catch(e=>{a(),n(e)})}catch(e){n(e)}})}function o(e){return new Promise((t,n)=>{try{let r=e.output(`blob`),a=URL.createObjectURL(r),o=document.createElement(`iframe`);o.style.cssText=`position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none`,o.src=a,document.body.appendChild(o);let s=()=>{URL.revokeObjectURL(a),o.remove()};o.onload=()=>{i(o).then(()=>{s(),t()}).catch(e=>{s(),n(e)})},o.onerror=()=>{s(),n(Error(`No se pudo abrir el dialogo de impresion`))}}catch(e){n(e)}})}function s(e){return`En el dialogo elige la impresora LR2000 y pulsa Imprimir.`}function c(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function l(e){return`$${e.toFixed(2)}`}function u(e,n){let r=t(n),i=String(e.orderId||``).slice(-8).toUpperCase(),a=e.paymentLabel||e.method||`Efectivo`,o=Number(e.total||0),s=Math.round(o/1.13*100)/100,u=Math.round((o-s)*100)/100,d=n===`58mm`?`10px`:`11px`,f=e.items.map(e=>{let t=Number(e.quantity||0),n=Number(e.lineTotal||0),r=t>0?n/t:0;return`
        <tr>
          <td class="qty">${t}</td>
          <td class="name">${c(e.name||`Producto`)}</td>
          <td class="num">${l(r)}</td>
          <td class="num">${l(n)}</td>
        </tr>`}).join(``),p=e.method===`efectivo`?(()=>{let t=Number(e.cashReceived??o),n=Number(e.changeAmount??t-o),r=n<0?`-${l(Math.abs(n))}`:l(n);return`
            <div class="row"><span>Efectivo</span><span>${l(t)}</span></div>
            <div class="row"><span>Cambio</span><span>${r}</span></div>`})():`<div class="row"><span>Pagado</span><span>${l(o)}</span></div>`;return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${c(i)}</title>
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
      font-size: ${d};
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
    <p class="store">${c(e.storeName)}</p>
    ${e.subtitle?`<p class="subtitle">${c(e.subtitle)}</p>`:``}
  </div>
  <div class="meta">
    <div>Doc N°: <strong>${c(i)}</strong></div>
    <div>Fecha: ${c(e.date)}</div>
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
    <div class="row"><span>Subtotal (sin IVA)</span><span>${l(s)}</span></div>
    <div class="row"><span>IVA 13%</span><span>${l(u)}</span></div>
    <div class="row total"><span>TOTAL</span><span>${l(o)}</span></div>
    <div class="row"><span>Método de pago</span><span>${c(a)}</span></div>
    ${p}
  </div>
  <p class="policy">No se aceptan cambios ni devoluciones en prendas de ropa interior</p>
  <p class="thanks">Gracias por tu preferencia</p>
</body>
</html>`}function d(e){let n=t(e);return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Prueba LR2000</title>
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
  <h1>PRUEBA LR2000</h1>
  <p>Si lees esto, la ticketera funciona.</p>
  <p>${new Date().toLocaleString(`es-SV`)}</p>
</body>
</html>`}async function f(e,t){let n=u(e,t.paperSize);try{return await a(n),{method:`html`}}catch(e){if(t.pdfFallback)try{return await o(t.pdfFallback),{method:`pdf`}}catch{}throw e instanceof Error?e:Error(`No se pudo imprimir. Revisa que la LR2000 este encendida y seleccionada.`)}}async function p(e){await a(d(e.paperSize))}export{n as i,p as n,s as r,f as t};