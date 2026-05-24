import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getToteatSettings, saveToteatSettings } from "../api/settings";

export default function SettingsPage() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    api_url: "",
    xir: "",
    xil: "",
    xiu: "",
    xapitoken: "",
    default_provider_vat: "",
  });

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getToteatSettings(user.id);
      if (data) {
        setFormData({
          api_url: data.api_url || "",
          xir: data.xir || "",
          xil: data.xil || "",
          xiu: data.xiu || "",
          xapitoken: data.xapitoken || "",
          default_provider_vat: data.default_provider_vat || "",
        });
      }
    } catch (err) {
      setError("Error al cargar configuraciones: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    setError(null);
    
    try {
      await saveToteatSettings(user.id, formData);
      setMessage("Configuración guardada exitosamente.");
    } catch (err) {
      setError("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-brand">Configuración Toteat</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Ingresa tus credenciales de API para permitir el registro automático de facturas en tu sistema Toteat.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Cargando...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            
            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
            {error && <p className="text-sm text-brand">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">API URL</span>
                <input
                  type="url"
                  name="api_url"
                  value={formData.api_url}
                  onChange={handleChange}
                  placeholder="https://api.toteat.com"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Restaurante ID (xir)</span>
                <input
                  type="text"
                  name="xir"
                  value={formData.xir}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Local ID (xil)</span>
                <input
                  type="text"
                  name="xil"
                  value={formData.xil}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Usuario ID (xiu)</span>
                <input
                  type="text"
                  name="xiu"
                  value={formData.xiu}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">API Token (xapitoken)</span>
                <input
                  type="password"
                  name="xapitoken"
                  value={formData.xapitoken}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
                  required
                />
              </label>
            </div>
            
            <div className="pt-4 border-t border-[var(--color-border)]">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">NIT/RUT por Defecto (Opcional)</span>
                <span className="mb-2 block text-xs text-[var(--color-muted)]">
                  Si la factura no lo incluye, se usará este valor por defecto.
                </span>
                <input
                  type="text"
                  name="default_provider_vat"
                  value={formData.default_provider_vat}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Guardando..." : "Guardar Credenciales"}
              </button>
            </div>
          </form>
        )}
      </main>
    </Layout>
  );
}
