import { supabase } from "../lib/supabase";

export async function fetchUserAlerts(userId) {
  const { data, error } = await supabase
    .from("invoice_alerts")
    .select("*, invoices(invoice_number)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function resolveAlert(alertId, userId) {
  const { error } = await supabase
    .from("invoice_alerts")
    .update({ 
      resolved: true, 
      resolved_at: new Date().toISOString(),
      resolved_by: userId 
    })
    .eq("id", alertId);

  if (error) throw new Error(error.message);
}
