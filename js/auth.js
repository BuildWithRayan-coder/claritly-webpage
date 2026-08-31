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

        // Listen for requests from the extension
        if (!window.claritlyAuthSyncListenerAdded) {
            window.claritlyAuthSyncListenerAdded = true;
            window.addEventListener("message", (event) => {
                if (event.source !== window || !event.data) return;
                if (event.data.type === "CLARITLY_REQUEST_AUTH_SYNC") {
                    try {
                        window.postMessage({ 
                            type: 'CLARITLY_AUTH_SYNC', 
                            session: session ? JSON.parse(JSON.stringify(session)) : null 
                        }, '*');
                    } catch (e) {}
                }
            });
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
            const avatarUrl = session.user.user_metadata?.avatar_url || `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#666"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>')}`;
            
            // Check if we are currently on the dashboard
            const isDashboard = window.location.pathname.includes('dashboard.html');
            const dashboardLinkHtml = isDashboard ? '' : '<a href="dashboard.html" class="dropdown-item">Dashboard</a><div class="dropdown-divider"></div>';
            
            authButtonsContainer.innerHTML = `
                <div class="profile-dropdown-container">
                    <img src="${avatarUrl}" class="profile-avatar" id="profile-btn" alt="Profile" referrerpolicy="no-referrer">
                    <div class="dropdown-menu" id="profile-dropdown">
                        ${dashboardLinkHtml}
                        <button class="dropdown-item" id="logout-btn" style="color: #ff4d4f;">Log out</button>
                    </div>
                </div>
            `;
            
            const profileBtn = document.getElementById('profile-btn');
            const dropdown = document.getElementById('profile-dropdown');
            const logoutBtn = document.getElementById('logout-btn');

            // Toggle dropdown
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && e.target !== profileBtn) {
                    dropdown.classList.remove('active');
                }
            });

            // Handle logout
            logoutBtn.addEventListener('click', async () => {
                logoutBtn.textContent = 'Logging out...';
                const currentClient = getSupabaseClient();
                if (currentClient) await currentClient.auth.signOut();
                // Wait briefly to allow auth sync message to reach extension before unloading page
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            });
        } else {
            // Logged out state
            const defaultAvatar = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>')}`;
            authButtonsContainer.innerHTML = `
                <div class="profile-dropdown-container">
                    <img src="${defaultAvatar}" class="profile-avatar" id="profile-btn-out" alt="Profile">
                    <div class="dropdown-menu" id="profile-dropdown-out" style="width: 200px;">
                        <button class="dropdown-item" id="login-dropdown-btn">Login / Sign up</button>
                    </div>
                </div>
            `;
            
            const profileBtn = document.getElementById('profile-btn-out');
            const dropdown = document.getElementById('profile-dropdown-out');
            
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && e.target !== profileBtn) {
                    dropdown.classList.remove('active');
                }
            });

            const handleAuth = async (e) => {
                e.preventDefault();
                let activeClient = getSupabaseClient();
                if (!activeClient && typeof window.waitForSupabase === 'function') {
                    try { activeClient = await window.waitForSupabase(); } catch (err) {}
                }
                if (!activeClient) {
                    alert("Authentication is temporarily unavailable. Please check your internet connection and refresh the page.");
                    return;
                }
                const { error } = await activeClient.auth.signInWithOAuth({ provider: 'google' });
                if (error) {
                    console.error("Auth Error:", error.message);
                    alert("Authentication Error: " + error.message);
                }
            };

            const loginBtn = document.getElementById('login-dropdown-btn');
            if (loginBtn) loginBtn.addEventListener('click', handleAuth);
        }
    }
});