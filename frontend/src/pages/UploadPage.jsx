import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadInvoice } from "../api/client";
import Layout from "../components/Layout";
import InvoiceUpload from "../components/InvoiceUpload";
import { normalizeInvoice } from "../utils/invoice";

export default function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleUpload = useCallback(
    async (file) => {
      setLoading(true);
      setError(null);
      try {
        const data = await uploadInvoice(file);
        const invoice = normalizeInvoice(data);
        navigate("/workspace", {
          state: { file, invoice },
        });
      } catch (err) {
        setError(err.message || "No se pudo procesar la factura.");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl text-brand">Cargar factura</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sube un PDF para extraer y revisar sus datos automáticamente.
          </p>
        </div>

        <InvoiceUpload
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          onClear={handleClearSelection}
          loading={loading}
          error={error}
        />
      </main>
    </Layout>
  );
}
