const SUPABASE_URL = 'https://lxrrpuytbobhkkzvatew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4cnJwdXl0Ym9iaGtrenZhdGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODA2NTcsImV4cCI6MjEwMTk1NjY1N30.52m1Z9kTYCQ3Wcv3sLjpiUdbxTWqZyzsRABiuQuYvnQ';

// Initialize Supabase safely (avoiding crashes if the CDN script is delayed)
let supabase;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabase;
    }
} catch (e) {
    console.error("Supabase init delayed:", e);
}