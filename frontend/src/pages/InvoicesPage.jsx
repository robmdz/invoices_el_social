import { useCallback, useEffect, useState } from "react";
import { deleteInvoice, fetchUserInvoices } from "../api/invoices";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { downloadInvoicesPdf } from "../utils/pdfExport";
import { formatFieldLabel } from "../utils/invoice";

function formatSavedDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchUserInvoices(user.id);
      setInvoices(rows);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las facturas.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownloadPdf = () => {
    if (!invoices.length) return;
    downloadInvoicesPdf(invoices, { userEmail: user?.email });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta factura del listado?")) return;
    setDeletingId(id);
    try {
      await deleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      setError(err.message || "No se pudo eliminar.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout compact>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-brand">Mis facturas</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Ordenadas por número de factura. Descarga el PDF para imprimir.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!invoices.length}
            className="btn-primary"
          >
            Descargar listado PDF
          </button>
        </div>

        {loading && (
          <p className="text-center text-sm text-[var(--color-muted)]">Cargando facturas…</p>
        )}

        {error && (
          <p role="alert" className="mb-4 text-sm text-brand">
            {error}
          </p>
        )}

        {!loading && !invoices.length && (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              Aún no hay facturas guardadas. Carga un PDF en Cargar factura y pulsa «Guardar factura».
            </p>
          </div>
        )}

        {invoices.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
                  <th className="px-3 py-3 font-medium"># Factura</th>
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Proveedor</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Total</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Guardada</th>
                  <th className="w-20 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-brand">
                      {inv.fields?.invoice_id || "—"}
                    </td>
                    <td className="px-3 py-2">{inv.fields?.invoice_date || "—"}</td>
                    <td className="max-w-[180px] truncate px-3 py-2">
                      {inv.fields?.supplier_name || "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2">
                      {inv.fields?.receiver_name || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {[inv.fields?.currency, inv.fields?.total_amount]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {inv.processing_status === 'partial' || inv.processing_status === 'failed' ? (
                          <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400 w-fit">
                            Alertas
                          </span>
                        ) : null}
                        
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${inv.toteat_registered ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {inv.toteat_registered ? 'Toteat: OK' : 'No reg.'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                      {formatSavedDate(inv.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(inv.id)}
                        disabled={deletingId === inv.id}
                        className="text-xs text-[var(--color-muted)] hover:text-brand disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoices.length > 0 && (
          <p className="mt-4 text-xs text-[var(--color-muted)]">
            El PDF incluye un resumen por {formatFieldLabel("invoice_id").toLowerCase()} y el
            detalle de líneas de cada factura, listo para imprimir.
          </p>
        )}
      </main>
    </Layout>
  );
}
