export const printHTML = (htmlContent, title = 'Print Document') => {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) return

  const doc = printWindow.document
  doc.open()
  doc.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
            th { background: #f0f0f0 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
            @page { size: A4 portrait; margin: 15mm; }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .border-bottom { border-bottom: 1px solid #000; }
            .mb-2 { margin-bottom: 10px; }
            .mb-4 { margin-bottom: 20px; }
            .mt-4 { margin-top: 20px; }
            .mt-8 { margin-top: 40px; }
            .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 60px; text-align: center; }
            .sign-line { border-top: 1px solid #000; padding-top: 5px; width: 80%; margin: 0 auto; }
            .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .header-card { border: 1px solid #000; padding: 10px; }
            .text-xs { font-size: 9px; }
            h1 { font-size: 16px; margin: 0 0 10px 0; text-align: center; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; }
          }
          /* Fallback view for screen before print dialog */
          body { font-family: Arial, sans-serif; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .mb-2 { margin-bottom: 10px; }
          .mb-4 { margin-bottom: 20px; }
          .mt-4 { margin-top: 20px; }
          .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 60px; text-align: center; }
          .sign-line { border-top: 1px solid #000; padding-top: 5px; width: 80%; margin: 0 auto; }
          .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .header-card { border: 1px solid #000; padding: 10px; }
          h1 { font-size: 16px; margin: 0 0 10px 0; text-align: center; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
            // Fallback for browsers that do not fire onafterprint
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `)
  doc.close()
}
