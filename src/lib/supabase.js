import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = url && key ? createClient(url, key) : null;
export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;

export function makeClient(customUrl, customKey) {
  if (!customUrl || !customKey) return null;
  return createClient(customUrl, customKey);
}

export const BUCKET = "product-images";

export async function uploadImage(file, client) {
  const sb = client || supabase;
  if (!sb) throw new Error("Supabase 未配置");
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
