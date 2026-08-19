const SUPABASE_URL = 'https://lxrrpuytbobhkkzvatew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4cnJwdXl0Ym9iaGtrenZhdGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODA2NTcsImV4cCI6MjEwMTk1NjY1N30.52m1Z9kTYCQ3Wcv3sLjpiUdbxTWqZyzsRABiuQuYvnQ';

// Fallback CDN URL in case the primary jsdelivr CDN is blocked or slow
const SUPABASE_FALLBACK_CDN = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase-js.min.js';

let _fallbackAttempted = false;

// Try to create the Supabase client if the library is available
function _tryInitSupabase() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase && window.supabase.createClient) {
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return window.supabaseClient;
        } catch (e) {
            console.error("Supabase createClient error:", e);
        }
    }
    return null;
}

// Load a fallback CDN script if the primary one hasn't loaded
function _loadFallbackCDN() {
    if (_fallbackAttempted) return;
    _fallbackAttempted = true;
    console.warn("[Claritly] Primary Supabase CDN not loaded. Loading fallback...");
    const script = document.createElement('script');
    script.src = SUPABASE_FALLBACK_CDN;
    script.async = true;
    document.head.appendChild(script);
}

// Exposed promise that auth.js can use: resolves with the initialized client
// Polls every 100ms for up to 8 seconds. Injects fallback CDN after 2 seconds.
window.waitForSupabase = function () {
    return new Promise((resolve, reject) => {
        // Already available
        const immediate = _tryInitSupabase();
        if (immediate) { resolve(immediate); return; }

        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 100;

            const client = _tryInitSupabase();
            if (client) {
                clearInterval(interval);
                resolve(client);
                return;
            }

            // After 2s without the library, inject fallback CDN
            if (elapsed >= 2000 && !_fallbackAttempted) {
                _loadFallbackCDN();
            }

            // Give up after 8 seconds
            if (elapsed >= 8000) {
                clearInterval(interval);
                console.error("[Claritly] Supabase failed to load after 8 seconds.");
                reject(new Error("Supabase library failed to load."));
            }
        }, 100);
    });
};

// Try an immediate init (works if CDN loaded synchronously before this script)
_tryInitSupabase();
