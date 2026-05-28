// Configurazione backend condiviso Supabase.
// 1) Crea un progetto Supabase.
// 2) Copia Project URL e anon public key da Project Settings > API.
// 3) Incollali qui.
// Finché ENABLED è false, l'app continua a funzionare in locale con localStorage.
window.NEW_GENERATION_SUPABASE = {
  ENABLED: true,
  URL: 'https://zkhbpxwwbsfysgbybdwh.supabase.co',
  ANON_KEY: 'sb_publishable_DQ_5MwmLWuJlH1KYlngSpw_ApVULy5s',
  TABLE: 'app_state',
  ROW_ID: 'main'
};

// Configurazione foto squadra via Cloudinary.
// Le chiavi segrete NON devono stare nel frontend: sono nei Secrets della Edge Function Supabase.
window.NEW_GENERATION_CLOUDINARY = {
  CLOUD_NAME: 'dc17izhac',
  FOLDER: 'squadra',
  SECTION: 'foto-squadra',
  EDGE_FUNCTION: 'team-photos'
};
