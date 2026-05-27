import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadInvoice, fetchSuppliers } from "../api/client";
import Layout from "../components/Layout";
import InvoiceUpload from "../components/InvoiceUpload";
import { normalizeInvoice } from "../utils/invoice";
import { findPartialSupplierMatches, matchSupplier } from "../utils/supplierMatching";
import { useAuth } from "../context/AuthContext";

export default function UploadPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
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

        // Fetch suppliers and match if token is available
        if (session?.access_token) {
          try {
            const suppliers = await fetchSuppliers(session.access_token);
            const supplierName = invoice.fields?.supplier_name;

            if (supplierName && suppliers.length > 0) {
              // Try to find partial matches
              const candidates = findPartialSupplierMatches(supplierName, suppliers);

              if (candidates.length > 0) {
                invoice.supplier_candidates = candidates;

                // If only one match, auto-select it
                if (candidates.length === 1) {
                  invoice.matched_supplier_id = candidates[0].id;
                  invoice.matched_supplier_name = candidates[0].name;
                  invoice.fields.supplier_name = candidates[0].name;
                  invoice.supplier_candidates = [];
                } else {
                  // Multiple matches - user will select via modal
                  const { supplier: bestMatch } = matchSupplier(
                    supplierName,
                    candidates
                  );
                  if (bestMatch) {
                    invoice.matched_supplier_id = bestMatch.id;
                    invoice.matched_supplier_name = bestMatch.name;
                  }
                }
              }
            }
          } catch (err) {
            // Log supplier matching error but don't fail the upload
            console.warn("Failed to match suppliers:", err.message);
          }
        }

        navigate("/workspace", {
          state: { file, invoice },
        });
      } catch (err) {
        setError(err.message || "No se pudo procesar la factura.");
      } finally {
        setLoading(false);
      }
    },
    [navigate, session]
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
