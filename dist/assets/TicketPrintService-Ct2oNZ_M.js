import{h as e}from"./AppBrandLogo-CkLgg_ya.js";import{n as t}from"./printPaperSize-Bcb-7gTI.js";var n=e(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]);function r(e){let n=t(e);return n<=58?32:n<=72?42:48}var i=`\x1B`,a=``,o=`
`,s=i+`@`,c=i+`M\0`,l=i+`M`,u=i+`a\0`,d=i+`a`,f=i+`E`,p=i+`E\0`,m=a+`VA`;function h(e){return e.normalize(`NFD`).replace(/[\u0300-\u036f]/g,``).replace(/[^\x20-\x7E]/g,``)}function g(e,t){let n=h(e);return n.length<=t?n:t<=1?n.slice(0,t):`${n.slice(0,t-1)}.`}function _(e){return`-`.repeat(e)}function v(e,t,n){let r=h(t),i=g(e,Math.max(8,n-r.length-1)),a=Math.max(1,n-i.length-r.length);return i+` `.repeat(a)+r}function y(e,t,n,r){if(r<=32){let i=String(e).padStart(3,` `),a=`$${n.toFixed(2)}`.padStart(10,` `),o=r-i.length-1-a.length;return`${i} ${g(t,o).padEnd(o,` `)}${a}`}let i=String(e).padStart(4,` `),a=`$${n.toFixed(2)}`.padStart(10,` `),o=r-i.length-1-a.length;return`${i}${g(t,o).padEnd(o,` `)}${a}`}function b(e,t){return g(`  P.U $${e.toFixed(2)}`,t)}function x(e){let t=h(e);if(t.length<=22)return t;let n=new Date(e);return Number.isNaN(n.getTime())?g(t,22):n.toLocaleString(`es-SV`,{day:`2-digit`,month:`2-digit`,year:`numeric`,hour:`2-digit`,minute:`2-digit`})}function S(e,t){let n=r(t),i=String(e.orderId||``).slice(-8).toUpperCase(),a=g(e.paymentLabel||e.method||`Efectivo`,16),S=Number(e.total||0),C=Math.round(S/1.13*100)/100,w=Math.round((S-C)*100)/100,T=[s,c,d,f,g(h(e.storeName).toUpperCase(),n),o,p];e.subtitle&&T.push(g(h(e.subtitle),n),o),T.push(o,u,l),T.push(`Doc: ${i}`,o),T.push(`Fecha: ${x(e.date)}`,o),T.push(`Caja: 1`,o),T.push(`Cliente: Consumidor Final`,o),T.push(c,_(n),o),n<=32?T.push(`Cant Articulo         Total`,o):T.push(`Cant  Articulo                    Total`,o),T.push(_(n),o);for(let t of e.items){let e=Number(t.quantity||0),r=Number(t.lineTotal||0),i=e>0?r/e:0;T.push(y(e,t.name||`Producto`,r,n),o),T.push(l,b(i,n),o,c)}if(T.push(_(n),o),T.push(v(`Subtotal s/IVA`,`$${C.toFixed(2)}`,n),o),T.push(v(`IVA 13%`,`$${w.toFixed(2)}`,n),o),T.push(f,v(`TOTAL`,`$${S.toFixed(2)}`,n),o,p),T.push(v(`Pago`,a,n),o),e.method===`efectivo`){let t=Number(e.cashReceived??S),r=Number(e.changeAmount??t-S),i=r<0?`-$${Math.abs(r).toFixed(2)}`:`$${r.toFixed(2)}`;T.push(v(`Efectivo`,`$${t.toFixed(2)}`,n),o),T.push(v(`Cambio`,i,n),o)}else T.push(v(`Pagado`,`$${S.toFixed(2)}`,n),o);return T.push(_(n),o),T.push(d,c,`Gracias por tu preferencia`,o),T.push(o,o,o,m),T.join(``)}function C(){return[`\x1B@`,`\x1Ba`,`PRUEBA PR-100`,`
`,`\x1Ba\0`,`Si lees esto, la ticketera funciona.`,`


`,`VA`].join(``)}var w=(e,t)=>`<!DOCTYPE html>
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
    <button type="button" onclick="window.print()">Imprimir en PR-100</button>
    <p>Impresora: PR-100 / POS-58. Papel: 58 mm. Desactiva encabezado y pie de pagina.</p>
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
</html>`;function T(e){return new Promise((t,n)=>{let r=window.open(``,`_blank`,`width=420,height=720`);if(!r){n(Error(`Permite ventanas emergentes para imprimir el ticket.`));return}r.document.open(),r.document.write(e),r.document.close(),r.addEventListener(`afterprint`,()=>{r.close(),t()}),setTimeout(t,12e4)})}function E(e,t=`Ticket`){let n=e.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]??e;return T(w(`${e.match(/<head[^>]*>([\s\S]*)<\/head>/i)?.[1]??``}${n}`,t))}function D(e){return new Promise((t,n)=>{try{let r=e.output(`blob`),i=URL.createObjectURL(r),a=window.open(i,`_blank`);if(!a){URL.revokeObjectURL(i),n(Error(`Permite ventanas emergentes para imprimir el ticket.`));return}a.addEventListener(`load`,()=>{a.focus(),a.print()}),a.addEventListener(`afterprint`,()=>{URL.revokeObjectURL(i),a.close(),t()}),setTimeout(()=>{URL.revokeObjectURL(i),t()},12e4)}catch(e){n(e)}})}function O(e){return`Si no sale papel, usa el boton Emparejar PR-100 y prueba de nuevo (Chrome/Edge).`}var k=[9600,115200,19200,38400];function A(){return navigator.serial??null}function j(){return!!A()}async function M(e){let t=null;for(let n of k)try{await e.open({baudRate:n});return}catch(n){t=n;try{await e.close()}catch{}}throw t instanceof Error?t:Error(`No se pudo abrir la ticketera. Revisa cable USB y driver.`)}function N(e){let t=new Uint8Array(e.length);for(let n=0;n<e.length;n+=1)t[n]=e.charCodeAt(n)&255;return t}async function P(){let e=A();if(!e)throw Error(`Usa Chrome o Edge para conectar la PR-100 por USB/Serial.`);await e.requestPort()}async function F(e){let t=A();if(!t)throw Error(`Usa Chrome o Edge para imprimir directo en la PR-100.`);let n=(await t.getPorts())[0]??await t.requestPort();await M(n);try{let t=n.writable?.getWriter();if(!t)throw Error(`La ticketera no acepto datos por USB/Serial.`);await t.write(N(e)),t.releaseLock(),await new Promise(e=>setTimeout(e,400))}finally{try{await n.close()}catch{}}}function I(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function L(e){return`$${e.toFixed(2)}`}function R(e,n){let r=t(n),i=String(e.orderId||``).slice(-8).toUpperCase(),a=e.paymentLabel||e.method||`Efectivo`,o=Number(e.total||0),s=Math.round(o/1.13*100)/100,c=Math.round((o-s)*100)/100,l=n===`58mm`?`10px`:`11px`,u=e.items.map(e=>{let t=Number(e.quantity||0),n=Number(e.lineTotal||0),r=t>0?n/t:0;return`
        <tr>
          <td class="qty">${t}</td>
          <td class="name">${I(e.name||`Producto`)}</td>
          <td class="num">${L(r)}</td>
          <td class="num">${L(n)}</td>
        </tr>`}).join(``),d=e.method===`efectivo`?(()=>{let t=Number(e.cashReceived??o),n=Number(e.changeAmount??t-o),r=n<0?`-${L(Math.abs(n))}`:L(n);return`
            <div class="row"><span>Efectivo</span><span>${L(t)}</span></div>
            <div class="row"><span>Cambio</span><span>${r}</span></div>`})():`<div class="row"><span>Pagado</span><span>${L(o)}</span></div>`;return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${I(i)}</title>
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
    <p class="store">${I(e.storeName)}</p>
    ${e.subtitle?`<p class="subtitle">${I(e.subtitle)}</p>`:``}
  </div>
  <div class="meta">
    <div>Doc N°: <strong>${I(i)}</strong></div>
    <div>Fecha: ${I(e.date)}</div>
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
    <tbody>${u}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal (sin IVA)</span><span>${L(s)}</span></div>
    <div class="row"><span>IVA 13%</span><span>${L(c)}</span></div>
    <div class="row total"><span>TOTAL</span><span>${L(o)}</span></div>
    <div class="row"><span>Método de pago</span><span>${I(a)}</span></div>
    ${d}
  </div>
  <p class="policy">No se aceptan cambios ni devoluciones en prendas de ropa interior</p>
  <p class="thanks">Gracias por tu preferencia</p>
</body>
</html>`}function z(e){let n=t(e);return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Prueba PR-100</title>
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
  <h1>PRUEBA PR-100</h1>
  <p>Si lees esto, la ticketera funciona.</p>
  <p>${new Date().toLocaleString(`es-SV`)}</p>
</body>
</html>`}async function B(e){if(!j())return!1;try{return await F(e),!0}catch{return!1}}async function V(e,t){let n=S(e,t.paperSize);if(t.preferSerial!==!1&&await B(n))return{method:`serial`};let r=R(e,t.paperSize);try{return await E(r,`Ticket de venta`),{method:`html`}}catch(e){if(t.pdfFallback)try{return await D(t.pdfFallback),{method:`pdf`}}catch{}throw e instanceof Error?e:Error(`No se pudo imprimir. Empareja la PR-100 o revisa la cola de Windows.`)}}async function H(e){return e.preferSerial!==!1&&await B(C())?{method:`serial`}:(await E(z(e.paperSize),`Prueba PR-100`),{method:`html`})}async function U(){await P()}export{O as a,j as i,V as n,n as o,H as r,U as t};