import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { fetchUserAlerts, resolveAlert } from "../api/alerts";
import { Link } from "react-router-dom";

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserAlerts(user.id);
      setAlerts(data);
    } catch (err) {
      setError("Error al cargar alertas: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId, user.id);
      setAlerts((prev) => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    } catch (err) {
      alert("Error al resolver: " + err.message);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "error":
        return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">ERROR</span>;
      case "warning":
        return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">WARNING</span>;
      default:
        return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">INFO</span>;
    }
  };

  return (
    <Layout>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-brand">Faltas y Alertas</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Problemas detectados durante el procesamiento de facturas que requieren atención manual.
          </p>
        </div>

        {error && <p className="mb-4 text-sm text-brand">{error}</p>}

        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Cargando alertas...</p>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              No hay alertas pendientes. ¡Todo está en orden!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`rounded-xl border p-4 transition-colors ${alert.resolved ? 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-60' : 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      <h3 className="font-medium text-[var(--color-text)]">{alert.title}</h3>
                    </div>
                    <p className="text-sm text-[var(--color-text)] opacity-80">{alert.description}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                      <span>Factura: <strong>{alert.invoices?.invoice_number || "Sin número"}</strong></span>
                      {alert.product_name && <span>Producto: {alert.product_name}</span>}
                      <span>Fecha: {new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex shrink-0 flex-col gap-2">
                    <Link 
                      to={`/workspace`} 
                      state={{ invoiceId: alert.invoice_id }} // Note: Workspace might need logic to load from ID
                      className="btn-secondary text-xs"
                    >
                      Ver Factura
                    </Link>
                    {!alert.resolved && (
                      <button 
                        onClick={() => handleResolve(alert.id)}
                        className="btn-primary text-xs"
                      >
                        Marcar Resuelta
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
