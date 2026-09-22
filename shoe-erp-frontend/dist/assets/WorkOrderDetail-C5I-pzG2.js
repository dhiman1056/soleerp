import{j as t}from"./vendor-query-CeXwUhWf.js";import{u as F,h as k,r as _}from"./vendor-react-CZc_Uusi.js";import{M as b}from"./MetricCard-pQuvX0aD.js";import{S as w,W as O}from"./WorkOrderForm-CufM_yu_.js";import{u as Q,e as q,L as R}from"./index-DH-u0lvX.js";import{R as S}from"./ReceiveModal-DhJIzLF9.js";import{f as n}from"./formatCurrency-Dm1mYVNt.js";import{f as u}from"./formatDate-Bs2wQqpU.js";import{b as C}from"./constants-Bge408wf.js";import"./index.esm-D2XN_8Pb.js";import"./Modal-DIN6xZK5.js";import"./useInventory-C5Kn0Ct5.js";import"./useBOM-BeSbaipd.js";import"./useLocations-By2_uPzp.js";const P=(r,s={})=>{const f=parseFloat(r.planned_qty||0)-parseFloat(r.received_qty||0),p=(s==null?void 0:s.company_name)||"ShoeERP Manufacturing",m=(s==null?void 0:s.company_address)||"",y=s!=null&&s.company_gstin?` | GSTIN: ${s.company_gstin}`:"",g=(s==null?void 0:s.logo_url)||"",x=Array.isArray(r.lines)?r.lines:[],v=x.reduce((o,i)=>{const c=parseFloat(i.consume_qty||0)*parseFloat(r.planned_qty||0);return o+c*parseFloat(i.rate_at_bom||0)},0),j=x.length>0?`
    <h3 style="margin:24px 0 8px; border-bottom:2px solid #333; padding-bottom:4px;">Material Consumption</h3>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;">Sr. No</th>
          <th>SKU Code</th>
          <th>Material Description</th>
          <th style="text-align:right;">Qty/Unit</th>
          <th style="text-align:right;">Total Qty</th>
          <th style="text-align:center;">UOM</th>
          <th style="text-align:right;">Rate (₹)</th>
          <th style="text-align:right;">Total Value (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${x.map((o,i)=>{const c=parseFloat(o.consume_qty||0)*parseFloat(r.planned_qty||0),h=c*parseFloat(o.rate_at_bom||0);return`
            <tr>
              <td style="text-align:center;">${i+1}</td>
              <td style="font-family:monospace;">${o.input_sku||""}</td>
              <td>${o.description||""}</td>
              <td style="text-align:right;">${parseFloat(o.consume_qty||0).toFixed(4)}</td>
              <td style="text-align:right;">${c.toFixed(4)}</td>
              <td style="text-align:center;">${o.uom||""}</td>
              <td style="text-align:right;">${n(o.rate_at_bom)}</td>
              <td style="text-align:right;">${n(h)}</td>
            </tr>`}).join("")}
        <tr>
          <td colspan="7" style="text-align:right; font-weight:bold; border-top:2px solid #333;">Total Material Value:</td>
          <td style="text-align:right; font-weight:bold; border-top:2px solid #333;">${n(v)}</td>
        </tr>
      </tbody>
    </table>
  `:"",e=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Work Order ${r.wo_number||""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 24px; }
    .logo-header { display: flex; align-items: center; justify-content: center; margin-bottom: 8px; gap: 16px; }
    .logo-header img { max-height: 50px; }
    .company-title { font-size: 22px; font-weight: bold; }
    .doc-title { font-size: 18px; font-weight: bold; color: #444; text-align: right; }
    .company-sub { text-align: center; font-size: 11px; color: #666; margin-bottom: 16px; }
    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .header-card { border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: #fafafa; }
    .header-card div { margin-bottom: 6px; font-size: 13px; }
    .header-card div:last-child { margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 7px 10px; }
    th { background: #f0f0f0; font-weight: bold; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; }
    .sign-line { border-top: 1px solid #555; padding-top: 6px; text-align: center; font-size: 11px; color: #555; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #999; font-style: italic; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="logo-header">
    ${g?`<img src="${g}" alt="Logo"/>`:""}
    <div>
      <div class="company-title">${p}</div>
      <div class="doc-title">Work Order</div>
    </div>
  </div>
  ${m?`<div class="company-sub">${m}${y}</div>`:""}

  <div class="header-grid">
    <div class="header-card">
      <div><strong>WO Number:</strong> ${r.wo_number||""}</div>
      <div><strong>WO Date:</strong>   ${u(r.wo_date)}</div>
      <div><strong>BOM Code:</strong>  ${r.bom_code||""}</div>
      <div><strong>WO Type:</strong>   ${(r.wo_type||"").replace(/_/g," → ")}</div>
      <div><strong>From Store:</strong> ${r.from_store||""}</div>
      <div><strong>To Store:</strong>   ${r.to_store||""}</div>
    </div>
    <div class="header-card">
      <div><strong>Product:</strong>      ${r.product_name||r.output_sku||""}</div>
      <div><strong>Status:</strong>       ${r.status||""}</div>
      <div><strong>Planned Qty:</strong>  ${parseFloat(r.planned_qty||0).toFixed(2)}</div>
      <div><strong>Received Qty:</strong> ${parseFloat(r.received_qty||0).toFixed(2)}</div>
      <div><strong>WIP Qty:</strong>      ${f.toFixed(2)}</div>
    </div>
  </div>

  ${j}

  <div class="sign-grid">
    <div><div class="sign-line">Prepared By</div></div>
    <div><div class="sign-line">Approved By</div></div>
    <div><div class="sign-line">Store Incharge</div></div>
  </div>

  <div class="footer">Printed on ${u(new Date)}</div>
</body>
</html>`,l=window.open("","_blank");if(!l){alert("Pop-up blocked. Please allow pop-ups for this site to print.");return}l.document.write(e),l.document.close(),l.focus(),l.print()};function K(){var h;const r=F(),{id:s}=k(),[f,p]=_.useState(!1),[m,y]=_.useState(!1),{role:g}=Q(),{data:x,isLoading:v,error:j}=q(s),e=x;if(v)return t.jsx("div",{className:"py-16",children:t.jsx(R,{})});if(j||!e)return t.jsxs("div",{className:"text-center py-16",children:[t.jsx("p",{className:"text-gray-500",children:"Work Order not found."}),t.jsx("button",{onClick:()=>r("/work-orders"),className:"btn-secondary mt-4",children:"← Back to list"})]});const l=parseFloat(e.wip_qty||0),o=parseFloat(e.wip_value||0),i=parseFloat(e.planned_qty||0),c=parseFloat(e.received_qty||0);return t.jsxs("div",{className:"space-y-6 max-w-5xl",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("button",{onClick:()=>r("/work-orders"),className:"btn-secondary text-xs",children:"← Back"}),t.jsxs("div",{className:"flex gap-2",children:[g==="admin"&&(Number(e.received_qty)||0)===0&&t.jsx("button",{onClick:()=>y(!0),className:"btn-secondary text-amber-600 border-amber-200 hover:bg-amber-50",children:"Edit"}),t.jsx("button",{onClick:()=>P(e),className:"btn-secondary",children:"Print"}),!["RECEIVED","DRAFT"].includes(e.status)&&t.jsx("button",{onClick:()=>p(!0),className:"btn-primary",children:"Record Receipt"})]})]}),t.jsxs("div",{className:"card p-6",children:[t.jsxs("div",{className:"flex items-start justify-between flex-wrap gap-4",children:[t.jsxs("div",{children:[t.jsxs("div",{className:"flex items-center gap-3 mb-1",children:[t.jsx("h1",{className:"text-2xl font-bold text-gray-900 font-mono",children:e.wo_number}),t.jsx(w,{status:e.status})]}),t.jsx("p",{className:"text-gray-500 text-sm",children:e.product_name})]}),t.jsxs("div",{className:"text-right text-sm text-gray-500 space-y-0.5",children:[t.jsxs("p",{children:[t.jsx("span",{className:"font-medium text-gray-700",children:"BOM:"})," ",e.bom_code," (",e.bom_type,")"]}),t.jsxs("p",{children:[t.jsx("span",{className:"font-medium text-gray-700",children:"Type:"})," ",C[e.wo_type]]}),t.jsxs("p",{children:[t.jsx("span",{className:"font-medium text-gray-700",children:"Date:"})," ",u(e.wo_date)]})]})]}),t.jsxs("div",{className:"mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm",children:[t.jsxs("div",{children:[t.jsx("span",{className:"text-gray-400 text-xs uppercase font-semibold tracking-wide",children:"From Store"}),t.jsx("p",{className:"mt-0.5 font-medium text-gray-800",children:e.from_store})]}),t.jsxs("div",{children:[t.jsx("span",{className:"text-gray-400 text-xs uppercase font-semibold tracking-wide",children:"To Store"}),t.jsx("p",{className:"mt-0.5 font-medium text-gray-800",children:e.to_store})]}),e.notes&&t.jsxs("div",{className:"col-span-2",children:[t.jsx("span",{className:"text-gray-400 text-xs uppercase font-semibold tracking-wide",children:"Notes"}),t.jsx("p",{className:"mt-0.5 text-gray-700",children:e.notes})]})]})]}),t.jsxs("div",{className:"grid grid-cols-2 xl:grid-cols-4 gap-4",children:[t.jsx(b,{title:"Planned Qty",value:i.toFixed(2),color:"gray"}),t.jsx(b,{title:"Received Qty",value:c.toFixed(2),color:"green"}),t.jsx(b,{title:"WIP Qty",value:l.toFixed(2),color:"amber"}),t.jsx(b,{title:"WIP Value",value:n(o),color:o>0?"amber":"gray"})]}),Array.isArray(e.lines)&&e.lines.length>0&&t.jsxs("div",{className:"card overflow-hidden",children:[t.jsx("div",{className:"px-5 py-4 border-b border-gray-100",children:t.jsx("h2",{className:"text-sm font-bold text-gray-900",children:"BOM Component Breakdown"})}),t.jsx("div",{className:"overflow-x-auto",children:t.jsxs("table",{className:"w-full text-sm",children:[t.jsx("thead",{children:t.jsx("tr",{className:"bg-gray-50 border-b border-gray-100",children:["SKU","Description","Qty/Unit","Total Planned Qty","Rate (₹)","Total Value"].map(a=>t.jsx("th",{className:`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${a.includes("Qty")||a.includes("Rate")||a.includes("Value")?"text-right":"text-left"}`,children:a},a))})}),t.jsxs("tbody",{children:[(Array.isArray(e.lines)?e.lines:[]).map((a,d)=>{const N=parseFloat(a.consume_qty)*i,$=N*parseFloat(a.rate_at_bom);return t.jsxs("tr",{className:`border-b border-gray-50 ${d%2===0?"bg-white":"bg-gray-50/50"}`,children:[t.jsx("td",{className:"px-4 py-3 font-mono text-xs font-semibold text-gray-800",children:a.input_sku}),t.jsx("td",{className:"px-4 py-3 text-gray-700",children:a.description}),t.jsxs("td",{className:"px-4 py-3 text-right tabular-nums",children:[a.consume_qty," ",a.uom]}),t.jsxs("td",{className:"px-4 py-3 text-right tabular-nums font-medium",children:[N.toFixed(4)," ",a.uom]}),t.jsx("td",{className:"px-4 py-3 text-right tabular-nums",children:n(a.rate_at_bom)}),t.jsx("td",{className:"px-4 py-3 text-right tabular-nums font-semibold",children:n($)})]},d)}),t.jsxs("tr",{className:"bg-gray-50 border-t-2 border-gray-200 font-bold",children:[t.jsx("td",{colSpan:5,className:"px-4 py-3 text-right text-gray-700",children:"Total BOM Material Cost"}),t.jsx("td",{className:"px-4 py-3 text-right tabular-nums text-gray-900",children:n((Array.isArray(e.lines)?e.lines:[]).reduce((a,d)=>a+(Number(d.consume_qty)||0)*(Number(d.rate_at_bom)||0),0)*i)})]})]})]})})]}),t.jsxs("div",{className:"card overflow-hidden",children:[t.jsx("div",{className:"px-5 py-4 border-b border-gray-100",children:t.jsx("h2",{className:"text-sm font-bold text-gray-900",children:"Receipt History"})}),(h=e.receipts)!=null&&h.length?t.jsx("div",{className:"overflow-x-auto",children:t.jsxs("table",{className:"w-full text-sm",children:[t.jsx("thead",{children:t.jsxs("tr",{className:"bg-gray-50 border-b border-gray-100",children:[t.jsx("th",{className:"px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase",children:"#"}),t.jsx("th",{className:"px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase",children:"Received Qty"}),t.jsx("th",{className:"px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase",children:"Date"}),t.jsx("th",{className:"px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase",children:"Remarks"})]})}),t.jsx("tbody",{children:e.receipts.map((a,d)=>t.jsxs("tr",{className:`border-b border-gray-50 ${d%2===0?"bg-white":"bg-gray-50/50"}`,children:[t.jsx("td",{className:"px-4 py-3 text-gray-400 text-xs",children:d+1}),t.jsx("td",{className:"px-4 py-3 text-right tabular-nums font-semibold text-green-700",children:parseFloat(a.received_qty).toFixed(2)}),t.jsx("td",{className:"px-4 py-3 text-gray-700",children:u(a.receipt_date)}),t.jsx("td",{className:"px-4 py-3 text-gray-500 text-sm",children:a.remarks||"—"})]},a.id))})]})}):t.jsx("p",{className:"text-center text-sm text-gray-400 py-8",children:"No receipts recorded yet."})]}),t.jsx(S,{isOpen:f,onClose:()=>p(!1),wo:e}),t.jsx(O,{isOpen:m,onClose:()=>y(!1),editWOId:s})]})}export{K as default};
