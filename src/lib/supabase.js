import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://kkjiowbnzgcjnxocygsb.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtramlvd2Juemdjam54b2N5Z3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTE1MDksImV4cCI6MjA5MDM2NzUwOX0.asfu59Yy7LrEAOdD_KnC7r1jKmzx9Wr2pGYBAys44ZI";

function getCached() {
  try {
    const s = localStorage.getItem("yeye_sb");
    if (s) { const o = JSON.parse(s); if (o.url && o.key) return o; }
  } catch {}
  return null;
}

const envUrl = import.meta.env.VITE_SUPABASE_URL || "";
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const cached = getCached();

export const SUPABASE_URL = cached?.url || envUrl || FALLBACK_URL;
export const SUPABASE_KEY = cached?.key || envKey || FALLBACK_KEY;

export const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export function makeClient(customUrl, customKey) {
  if (!customUrl || !customKey) return null;
  return createClient(customUrl, customKey);
}

export function cacheConfig(url, key) {
  try { localStorage.setItem("yeye_sb", JSON.stringify({ url, key })); } catch {}
}

export function clearCachedConfig() {
  try { localStorage.removeItem("yeye_sb"); } catch {}
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
