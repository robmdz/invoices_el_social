/**
 * API client for the invoice backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Get authorization header with JWT token.
 */
function getAuthHeaders(token) {
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Upload an invoice file to the backend.
 *
 * @param {File} file - Invoice file (PDF or image)
 * @returns {Promise<Object>} Invoice metadata from the backend
 */
export async function uploadInvoice(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/invoice/process`, {
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

/**
 * Fetch suppliers for the authenticated user.
 *
 * @param {string} token - JWT token from Supabase
 * @returns {Promise<Array>} List of suppliers
 */
export async function fetchSuppliers(token) {
  if (!token) {
    throw new Error("Authentication token required");
  }

  const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(token),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : `Error fetching suppliers (${response.status})`;
    throw new Error(message);
  }

  return data.suppliers || [];
}

/**
 * Create a new supplier for the authenticated user.
 *
 * @param {string} token - JWT token from Supabase
 * @param {Object} supplierData - Supplier data
 * @returns {Promise<Object>} Created supplier
 */
export async function createSupplier(token, supplierData) {
  if (!token) {
    throw new Error("Authentication token required");
  }

  const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(token),
    },
    body: JSON.stringify(supplierData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : `Error creating supplier (${response.status})`;
    throw new Error(message);
  }

  return data.supplier;
}
