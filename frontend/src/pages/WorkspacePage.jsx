import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { saveInvoice } from "../api/invoices";
import { useAuth } from "../context/AuthContext";
import InvoiceEditor from "../components/InvoiceEditor";
import InvoicePreview from "../components/InvoicePreview";
import ThemeToggle from "../components/ThemeToggle";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function WorkspacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [previewFile, setPreviewFile] = useState(location.state?.file ?? null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [invoice, setInvoice] = useState(location.state?.invoice ?? null);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!location.state?.file || !location.state?.invoice) {
      navigate("/cargar", { replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (!previewFile) return;
    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  useEffect(() => {
    if (location.state?.file) setPreviewFile(location.state.file);
    if (location.state?.invoice) setInvoice(location.state.invoice);
  }, [location.state]);

  const handleNewDocument = useCallback(() => {
    navigate("/cargar");
  }, [navigate]);

  const handleSave = async () => {
    if (!invoice || !user) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await saveInvoice(invoice, user.id);
      setSaveMessage("Factura guardada correctamente.");
    } catch (err) {
      setSaveError(err.message || "No se pudo guardar la factura.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterToteat = async () => {
    if (!invoice) return;
    setRegistering(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoice/temp-id/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Error al registrar en Toteat");
      }
      setSaveMessage("Factura registrada exitosamente en Toteat.");
    } catch (err) {
      setSaveError(err.message || "No se pudo registrar la factura en Toteat.");
    } finally {
      setRegistering(false);
    }
  };

  if (!previewFile || !previewUrl || !invoice) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="shrink-0 border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <Link to="/" className="inline-block">
              <img src="/logo.png" alt="el Social facturas" className="h-10 object-contain" />
            </Link>
            <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{previewFile.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            
            <button 
              type="button" 
              onClick={handleRegisterToteat} 
              disabled={saving || registering} 
              className="btn-primary bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              {registering ? "Registrando…" : "Registrar en Toteat"}
            </button>

            <button type="button" onClick={handleSave} disabled={saving || registering} className="btn-primary">
              {saving ? "Guardando…" : "Guardar factura"}
            </button>
            <Link to="/facturas" className="btn-secondary">
              Ver listado
            </Link>
            <button type="button" onClick={handleNewDocument} className="btn-secondary">
              Cargar otro PDF
            </button>
          </div>
        </div>
        {(saveMessage || saveError) && (
          <p
            className={`px-4 pb-2 text-xs sm:px-6 ${saveError ? "text-brand" : "text-[var(--color-muted)]"}`}
          >
            {saveError || saveMessage}
          </p>
        )}
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col border-b border-[var(--color-border)] lg:border-b-0 lg:border-r">
          <h2 className="shrink-0 border-b border-[var(--color-border)] px-4 py-2 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            Documento
          </h2>
          <div className="min-h-0 flex-1">
            <InvoicePreview file={previewFile} previewUrl={previewUrl} fill />
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <h2 className="shrink-0 border-b border-[var(--color-border)] px-4 py-2 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            Datos extraídos
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <InvoiceEditor invoice={invoice} onChange={setInvoice} disabled={saving} />
          </div>
        </section>
      </main>
    </div>
  );
}
