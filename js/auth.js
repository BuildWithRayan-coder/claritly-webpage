// auth.js - Handles UI state based on authentication

document.addEventListener('DOMContentLoaded', () => {
    const authButtonsContainer = document.getElementById('auth-buttons');
    
    // Render logged out state immediately so the buttons are always visible on load
    updateUI(null);
    
    // Then safely check Supabase asynchronously
    if (typeof supabase !== 'undefined') {
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                updateUI(session);
            })
            .catch(err => {
                console.error("Supabase getSession error:", err);
            });

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            updateUI(session);
        });
    } else {
        console.error("Supabase client is not initialized.");
    }

    function updateUI(session) {
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
                    await supabase.auth.signOut();
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
                if (typeof supabase === 'undefined') {
                    alert("Authentication is currently unavailable.");
                    return;
                }
                const { data, error } = await supabase.auth.signInWithOAuth({
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
