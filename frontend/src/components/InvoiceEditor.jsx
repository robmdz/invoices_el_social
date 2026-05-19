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
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
                <th className="px-2 py-2 font-medium">Descripción</th>
                <th className="w-20 px-2 py-2 font-medium">Cant.</th>
                <th className="w-28 px-2 py-2 font-medium">Precio unit.</th>
                <th className="w-28 px-2 py-2 font-medium">Importe</th>
                <th className="w-16 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, index) => (
                <tr key={index} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-1">
                    <input
                      type="text"
                      value={item.description}
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
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                      disabled={disabled}
                      className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none focus:bg-[var(--color-surface)] disabled:opacity-50"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      value={item.unit_price}
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
                      value={item.amount}
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
