const SUPABASE_URL = 'https://lxrrpuytbobhkkzvatew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4cnJwdXl0Ym9iaGtrenZhdGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODA2NTcsImV4cCI6MjEwMTk1NjY1N30.52m1Z9kTYCQ3Wcv3sLjpiUdbxTWqZyzsRABiuQuYvnQ';

// Initialize Supabase Client and attach to window so other scripts can access it!
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
