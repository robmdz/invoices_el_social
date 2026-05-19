/** Natural-ish sort for invoice numbers (e.g. F-2 before F-10). */
export function compareInvoiceNumbers(a, b) {
  const left = String(a ?? "").trim();
  const right = String(b ?? "").trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, "es", { numeric: true, sensitivity: "base" });
}
