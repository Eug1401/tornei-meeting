// Configurazione backend condiviso Supabase.
// 1) Crea un progetto Supabase.
// 2) Usa il Project URL base (es. https://xxxx.supabase.co), senza /rest/v1/.
// 3) Copia la publishable/anon key da Project Settings > API.
// Finché ENABLED è false, l'app continua a funzionare in locale con localStorage.
window.MEETING_TOURNAMENT_SUPABASE = {
  ENABLED: true,
  URL: 'https://fvcuganqopmshdpysoxi.supabase.co',
  ANON_KEY: 'sb_publishable_spt6qwcOgeGHW0azN9voXA_nTBpGhjb',
  TABLE: 'app_state',
  ROW_ID: 'main'
};
