// auth.js - Handles UI state based on authentication

document.addEventListener('DOMContentLoaded', () => {
    const authButtonsContainer = document.getElementById('auth-buttons');
    
    // Show a safe loading state initially while we wait for Supabase to initialize
    if (authButtonsContainer) {
        authButtonsContainer.innerHTML = `<span style="color: var(--gray); font-size: 0.95rem; margin-right: 12px;">Loading...</span>`;
    }

    // Function to safely get the initialized client (synchronous check)
    function getSupabaseClient() {
        if (window.supabaseClient) return window.supabaseClient;
        
        // If config.js ran but CDN was delayed, we can initialize it now that CDN is ready
        if (window.supabase && window.supabase.createClient && typeof SUPABASE_URL !== 'undefined') {
            try {
                window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                return window.supabaseClient;
            } catch (e) {}
        }
        return null;
    }

    // Use waitForSupabase() from config.js for robust initialization with fallback CDN
    if (typeof window.waitForSupabase === 'function') {
        window.waitForSupabase()
            .then(client => {
                initAuthLogic(client);
            })
            .catch(err => {
                console.error("[Claritly] Supabase init failed:", err);
                updateUI(null, null); // Fallback to logged out state
            });
    } else {
        // Legacy fallback: poll if waitForSupabase is not available
        let attempts = 0;
        const checkInterval = setInterval(() => {
            try {
                const client = getSupabaseClient();
                if (client) {
                    clearInterval(checkInterval);
                    initAuthLogic(client);
                } else {
                    attempts++;
                    if (attempts > 80) { // 8 seconds timeout
                        clearInterval(checkInterval);
                        console.error("Supabase client failed to load after 8 seconds.");
                        updateUI(null, null); // Fallback to logged out state
                    }
                }
            } catch (error) {
                // Catch any unexpected TDZ ReferenceErrors so we don't get stuck in "Loading..." forever
                console.error("Auth init error:", error);
                attempts++;
            }
        }, 100);
    }

    function initAuthLogic(client) {
        client.auth.getSession()
            .then(({ data: { session } }) => {
                updateUI(session, client);
            })
            .catch(err => {
                console.error("Supabase getSession error:", err);
                updateUI(null, client);
            });

        // Listen for auth changes
        client.auth.onAuthStateChange((_event, session) => {
            updateUI(session, client);
        });
    }

    function updateUI(session, client) {
        // 1. Sync auth state to extension
        try {
            window.postMessage({ 
                type: 'CLARITLY_AUTH_SYNC', 
                session: session ? JSON.parse(JSON.stringify(session)) : null 
            }, '*');
        } catch (e) {
            console.error("Failed to broadcast auth state", e);
        }

        // 2. Manage Top Banner for logged-in state
        let banner = document.getElementById('claritly-auth-banner');
        if (session) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'claritly-auth-banner';
                banner.style = "background: #2563eb; color: white; text-align: center; padding: 12px 20px; font-weight: 500; font-size: 0.95rem; display: flex; justify-content: center; align-items: center; gap: 8px; z-index: 1000; position: relative;";
                document.body.insertBefore(banner, document.body.firstChild);
            }
            const email = session.user.email;
            banner.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Welcome back, <strong>${email}</strong>! Your Claritly extension is successfully connected.</span>
            `;
        } else {
            if (banner) banner.remove();
        }

        // 3. Update Navbar Buttons
        if (!authButtonsContainer) return;

        if (session) {
            // Logged in state
            authButtonsContainer.innerHTML = `
                <a href="dashboard.html" class="btn btn-primary" style="margin-right: 12px;">Dashboard</a>
                <button id="logout-btn" class="btn" style="background: transparent; color: var(--dark); font-weight: 500; border: none; font-size: 1rem; cursor: pointer;">Log out</button>
            `;
            
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    const currentClient = getSupabaseClient();
                    if (currentClient) await currentClient.auth.signOut();
                    window.location.href = 'index.html';
                });
            }
        } else {
            // Logged out state
            authButtonsContainer.innerHTML = `
                <button id="login-btn" class="btn" style="background: transparent; color: var(--dark); font-weight: 500; margin-right: 12px; padding: 12px 24px; cursor: pointer; border: none; font-size: 1rem;">Login</button>
                <button id="signup-btn" class="btn btn-primary">Sign up</button>
            `;
            
            const handleAuth = async (e) => {
                e.preventDefault();
                // Try to get client, with one more async attempt if not ready
                let activeClient = getSupabaseClient();
                if (!activeClient && typeof window.waitForSupabase === 'function') {
                    try {
                        activeClient = await window.waitForSupabase();
                    } catch (err) {
                        // Still failed
                    }
                }
                if (!activeClient) {
                    alert("Authentication is temporarily unavailable. Please check your internet connection and refresh the page.");
                    return;
                }
                const { data, error } = await activeClient.auth.signInWithOAuth({
                    provider: 'google'
                });
                if (error) {
                    console.error("Auth Error:", error.message);
                    alert("Authentication Error: " + error.message);
                }
            };

            const loginBtn = document.getElementById('login-btn');
            const signupBtn = document.getElementById('signup-btn');
            if (loginBtn) loginBtn.addEventListener('click', handleAuth);
            if (signupBtn) signupBtn.addEventListener('click', handleAuth);
        }
    }
});
