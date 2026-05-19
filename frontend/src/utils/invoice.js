/** Default empty line item for the editor */
export const EMPTY_LINE_ITEM = {
  description: "",
  quantity: "",
  unit_price: "",
  amount: "",
};

/** Field keys shown in the invoice editor (in order) */
export const INVOICE_FIELD_KEYS = [
  "supplier_name",
  "supplier_address",
  "supplier_email",
  "supplier_phone",
  "receiver_name",
  "receiver_address",
  "invoice_id",
  "invoice_date",
  "due_date",
  "purchase_order",
  "currency",
  "net_amount",
  "total_tax_amount",
  "total_amount",
  "payment_terms",
];

export const FIELD_LABELS = {
  supplier_name: "Proveedor",
  supplier_address: "Dirección del proveedor",
  supplier_email: "Correo del proveedor",
  supplier_phone: "Teléfono del proveedor",
  receiver_name: "Cliente / receptor",
  receiver_address: "Dirección del receptor",
  invoice_id: "Número de factura",
  invoice_date: "Fecha de factura",
  due_date: "Fecha de vencimiento",
  purchase_order: "Orden de compra",
  currency: "Moneda",
  net_amount: "Subtotal",
  total_tax_amount: "Impuestos",
  total_amount: "Total",
  payment_terms: "Condiciones de pago",
};

export function formatFieldLabel(key) {
  return (
    FIELD_LABELS[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Build empty invoice state for manual entry */
export function createEmptyInvoice(filename = "") {
  const fields = Object.fromEntries(INVOICE_FIELD_KEYS.map((key) => [key, ""]));
  return {
    filename,
    fields,
    line_items: [{ ...EMPTY_LINE_ITEM }],
  };
}

/** Normalize API response (if any) into flat editable shape */
export function normalizeInvoice(data) {
  if (!data) return createEmptyInvoice();

  const fields = { ...createEmptyInvoice(data.filename).fields };
  for (const [key, field] of Object.entries(data.fields || {})) {
    const value =
      typeof field === "object" && field !== null ? field.value : String(field ?? "");
    fields[key] = value ?? "";
  }

  const line_items =
    data.line_items?.length > 0
      ? data.line_items.map((item) => ({
          description: item.description ?? "",
          quantity: item.quantity ?? "",
          unit_price: item.unit_price ?? "",
          amount: item.amount ?? "",
        }))
      : [{ ...EMPTY_LINE_ITEM }];

  return {
    filename: data.filename ?? "",
    fields,
    line_items,
  };
}
