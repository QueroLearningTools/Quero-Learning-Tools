// Supabase client setup for Quero Learning Tools.
// Browser-safe only: use the public anon/publishable key here, never the service role key.

const SUPABASE_URL = "https://uldcorspehmwexrfomkp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_18iMUDpwhvIE6t1sh2rpuw_1mBHogfy";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
