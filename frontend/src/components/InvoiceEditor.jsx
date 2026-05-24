import {
  EMPTY_LINE_ITEM,
  INVOICE_FIELD_KEYS,
  formatFieldLabel,
} from "../utils/invoice";

/**
 * Editable invoice fields and line items.
 */
export default function InvoiceEditor({ invoice, onChange, disabled }) {
  if (!invoice) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-muted)]">
        Carga una factura para ver y editar sus datos.
      </p>
    );
  }

  const updateField = (key, value) => {
    onChange({
      ...invoice,
      fields: { ...invoice.fields, [key]: value },
    });
  };

  const updateLineItem = (index, key, value) => {
    const line_items = invoice.line_items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange({ ...invoice, line_items });
  };

  const addLineItem = () => {
    onChange({
      ...invoice,
      line_items: [...invoice.line_items, { ...EMPTY_LINE_ITEM }],
    });
  };

  const removeLineItem = (index) => {
    if (invoice.line_items.length <= 1) {
      onChange({
        ...invoice,
        line_items: [{ ...EMPTY_LINE_ITEM }],
      });
      return;
    }
    onChange({
      ...invoice,
      line_items: invoice.line_items.filter((_, i) => i !== index),
    });
  };

  const lineItemsToRender = invoice.processed_line_items?.length 
    ? invoice.processed_line_items 
    : invoice.line_items;

  const extraFieldKeys = Object.keys(invoice.fields).filter(
    (key) => !INVOICE_FIELD_KEYS.includes(key)
  );

  const inputClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-brand disabled:opacity-50";

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Datos generales
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {INVOICE_FIELD_KEYS.map((key) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">
                {formatFieldLabel(key)}
              </span>
              <input
                type="text"
                value={invoice.fields[key] ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
                disabled={disabled}
                className={inputClass}
              />
            </label>
          ))}
          {extraFieldKeys.map((key) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">
                {formatFieldLabel(key)}
              </span>
              <input
                type="text"
                value={invoice.fields[key] ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
                disabled={disabled}
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            Líneas de detalle
          </h2>
          <button
            type="button"
            onClick={addLineItem}
            disabled={disabled}
            className="text-xs text-brand underline underline-offset-2 disabled:opacity-40"
          >
            Añadir línea
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">Descripción</th>
                <th className="w-20 px-2 py-2 font-medium">Cant.</th>
                <th className="w-20 px-2 py-2 font-medium">U. Inv</th>
                <th className="w-24 px-2 py-2 font-medium">Cant. Conv</th>
                <th className="px-2 py-2 font-medium">Catálogo</th>
                <th className="w-24 px-2 py-2 font-medium">Precio</th>
                <th className="w-24 px-2 py-2 font-medium">Importe</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lineItemsToRender.map((item, index) => {
                const isProcessed = invoice.processed_line_items?.length > 0;
                
                // Status colors
                let statusColor = "bg-gray-100 text-gray-500";
                let statusText = "Pte";
                if (isProcessed) {
                  if (item.status === "matched") {
                    statusColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                    statusText = "Match";
                  } else if (item.status === "converted") {
                    statusColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                    statusText = "Conv.";
                  } else if (item.status === "error" || !item.product_found) {
                    statusColor = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                    statusText = "Error";
                  }
                }

                return (
                  <tr key={index} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-1 text-center">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusColor}`} title={item.error_message || item.conversion_applied || ""}>
                        {statusText}
                      </span>
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) =>
                          updateLineItem(index, "description", e.target.value)
                        }
                        disabled={disabled}
                        className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none focus:bg-[var(--color-surface)] disabled:opacity-50"
                        placeholder="Descripción"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.quantity || ""}
                        onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                        disabled={disabled}
                        className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none focus:bg-[var(--color-surface)] disabled:opacity-50"
                      />
                    </td>
                    <td className="p-1 text-xs text-[var(--color-muted)]">
                       {item.invoice_unit || "UN"}
                    </td>
                    <td className="p-1 text-xs font-medium text-[var(--color-text)]">
                       {item.converted_quantity != null ? `${Number(item.converted_quantity).toFixed(2)} ${item.catalog_unit || ''}` : "—"}
                    </td>
                    <td className="p-1 text-xs text-[var(--color-text)] truncate max-w-[120px]" title={item.matched_product_name || "No encontrado"}>
                       {item.matched_product_name || <span className="text-red-400">No encontrado</span>}
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.unit_price || ""}
                        onChange={(e) =>
                          updateLineItem(index, "unit_price", e.target.value)
                        }
                        disabled={disabled}
                        className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none focus:bg-[var(--color-surface)] disabled:opacity-50"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.amount || ""}
                        onChange={(e) => updateLineItem(index, "amount", e.target.value)}
                        disabled={disabled}
                        className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none focus:bg-[var(--color-surface)] disabled:opacity-50"
                      />
                    </td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={disabled}
                        className="text-xs text-[var(--color-muted)] hover:text-brand disabled:opacity-40"
                        aria-label="Eliminar línea"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
