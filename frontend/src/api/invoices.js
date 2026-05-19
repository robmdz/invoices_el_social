import { supabase } from "../lib/supabase";
import { compareInvoiceNumbers } from "../utils/sort";

function rowToInvoice(row) {
  return {
    id: row.id,
    filename: row.filename ?? "",
    fields: row.fields ?? {},
    line_items: row.line_items ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function saveInvoice(invoice, userId) {
  const invoiceNumber = (invoice.fields?.invoice_id ?? "").trim();

  const payload = {
    user_id: userId,
    invoice_number: invoiceNumber,
    filename: invoice.filename ?? "",
    fields: invoice.fields ?? {},
    line_items: invoice.line_items ?? [],
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToInvoice(data);
}

export async function fetchUserInvoices(userId) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const invoices = (data ?? []).map(rowToInvoice);
  invoices.sort((a, b) =>
    compareInvoiceNumbers(a.fields?.invoice_id, b.fields?.invoice_id)
  );
  return invoices;
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
