import { supabase } from "@/lib/supabase";

const BUCKET = "crm-attachments";

/**
 * Upload a file to Supabase Storage and return its public URL.
 * Requires a bucket named "crm-attachments" with public read access.
 */
export async function uploadAttachment(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
