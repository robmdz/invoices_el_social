import { supabase } from "../lib/supabase";

export async function getToteatSettings(userId) {
  const { data, error } = await supabase
    .from("toteat_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 means no rows found, which is fine (default empty state)
    throw new Error(error.message);
  }

  return data || null;
}

export async function saveToteatSettings(userId, settings) {
  // Check if exists
  const existing = await getToteatSettings(userId);
  
  const payload = {
    user_id: userId,
    api_url: settings.api_url,
    xir: settings.xir,
    xil: settings.xil,
    xiu: settings.xiu,
    xapitoken: settings.xapitoken,
    default_provider_vat: settings.default_provider_vat,
  };

  let result;
  if (existing) {
    result = await supabase
      .from("toteat_settings")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();
  } else {
    result = await supabase
      .from("toteat_settings")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
