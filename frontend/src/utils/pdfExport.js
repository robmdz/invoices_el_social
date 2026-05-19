import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFieldLabel } from "./invoice";

const BRAND_RED = [198, 26, 35];

/**
 * Build a printable PDF listing all invoices sorted by invoice #.
 * @param {Array} invoices - Normalized invoice rows from Supabase
 * @param {{ userEmail?: string }} options
 */
export function downloadInvoicesPdf(invoices, options = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND_RED);
  doc.text("el Social facturas", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Listado de facturas registradas", 14, 23);

  if (options.userEmail) {
    doc.text(`Usuario: ${options.userEmail}`, 14, 29);
  }
  doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, 14, 34);
  doc.text(`Total: ${invoices.length} factura(s)`, pageWidth - 14, 34, { align: "right" });

  const head = [
    "# Factura",
    "Fecha factura",
    "Proveedor",
    "Cliente",
    "Moneda",
    "Subtotal",
    "Impuestos",
    "Total",
  ];

  const body = invoices.map((inv) => {
    const f = inv.fields ?? {};
    return [
      f.invoice_id || "—",
      f.invoice_date || "—",
      f.supplier_name || "—",
      f.receiver_name || "—",
      f.currency || "—",
      f.net_amount || "—",
      f.total_tax_amount || "—",
      f.total_amount || "—",
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [head],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: BRAND_RED,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  });

  let detailY = doc.lastAutoTable.finalY + 10;

  for (const inv of invoices) {
    const lines = inv.line_items?.filter(
      (item) => item.description || item.amount || item.quantity
    );
    if (!lines?.length) continue;

    if (detailY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      detailY = 20;
    }

    const number = inv.fields?.invoice_id || "Sin número";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_RED);
    doc.text(`Detalle — Factura ${number}`, 14, detailY);
    detailY += 4;

    autoTable(doc, {
      startY: detailY,
      head: [["Descripción", "Cant.", "Precio unit.", "Importe"]],
      body: lines.map((item) => [
        item.description || "—",
        item.quantity || "—",
        item.unit_price || "—",
        item.amount || "—",
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    });

    detailY = doc.lastAutoTable.finalY + 8;
  }

  const stamp = `elsocial-facturas-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(stamp);
}
