/**
 * API client for the invoice backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Upload an invoice file to the backend.
 *
 * @param {File} file - Invoice file (PDF or image)
 * @returns {Promise<Object>} Invoice metadata from the backend
 */
export async function uploadInvoice(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/invoice/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
          : `Error al cargar el archivo (${response.status})`;
    throw new Error(message);
  }

  return data;
}
