module.exports = function handler(request, response) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "itinerary-attachments";

  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    enabled: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
    storageBucket
  });
};
