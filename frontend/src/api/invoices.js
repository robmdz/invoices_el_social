import { supabase } from "../lib/supabase";
import { compareInvoiceNumbers } from "../utils/sort";

function rowToInvoice(row) {
  return {
    id: row.id,
    filename: row.filename ?? "",
    fields: row.fields ?? {},
    line_items: row.line_items ?? [],
    processed_line_items: row.processed_line_items ?? [],
    processing_status: row.processing_status ?? "pending",
    toteat_registered: row.toteat_registered ?? false,
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
    processed_line_items: invoice.processed_line_items ?? [],
    processing_status: invoice.processing_status ?? "processed",
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Save alerts if any
  if (invoice.alerts?.length > 0) {
    const alertsPayload = invoice.alerts.map(a => ({
      invoice_id: data.id,
      user_id: userId,
      alert_type: a.alert_type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      product_name: a.product_name,
      line_item_index: a.line_item_index
    }));
    await supabase.from("invoice_alerts").insert(alertsPayload);
  }

  // Save comments if any
  if (invoice.comments?.length > 0) {
    const commentsPayload = invoice.comments.map(c => ({
      invoice_id: data.id,
      user_id: userId,
      comment_type: c.comment_type,
      invoice_number: c.invoice_number,
      product_name: c.product_name,
      issue: c.issue,
      action_taken: c.action_taken,
      next_step: c.next_step
    }));
    await supabase.from("invoice_review_comments").insert(commentsPayload);
  }

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
