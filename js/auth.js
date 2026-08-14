// auth.js - Handles UI state based on authentication

document.addEventListener('DOMContentLoaded', () => {
    const authButtonsContainer = document.getElementById('auth-buttons');
    
    // Render logged out state immediately so the buttons are always visible on load
    updateUI(null);
    
    // Check Supabase asynchronously
    if (typeof window.supabaseClient !== 'undefined') {
        window.supabaseClient.auth.getSession()
            .then(({ data: { session } }) => {
                updateUI(session);
            })
            .catch(err => {
                console.error("Supabase getSession error:", err);
            });

        // Listen for auth changes
        window.supabaseClient.auth.onAuthStateChange((_event, session) => {
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
        if (session && session.user) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'claritly-auth-banner';
                banner.style = "background: #2563eb; color: white; text-align: center; padding: 12px 20px; font-weight: 500; font-size: 0.95rem; display: flex; justify-content: center; align-items: center; gap: 8px; z-index: 1000; position: relative;";
                document.body.insertBefore(banner, document.body.firstChild);
            }
            const email = session.user.email || 'User';
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
            let isDashboard = window.location.pathname.includes('dashboard');
            if (isDashboard) {
                authButtonsContainer.innerHTML = `
                    <a href="index.html" class="btn btn-primary" style="margin-right: 12px;">Home</a>
                `;
            } else {
                authButtonsContainer.innerHTML = `
                    <a href="dashboard.html" class="btn btn-primary" style="margin-right: 12px;">Dashboard</a>
                `;
            }
        } else {
            // Logged out state
            authButtonsContainer.innerHTML = `
                <button id="login-btn" class="btn" style="background: transparent; color: var(--dark); font-weight: 500; margin-right: 12px; padding: 12px 24px; cursor: pointer; border: none; font-size: 1rem;">Login</button>
                <button id="signup-btn" class="btn btn-primary">Sign up</button>
            `;
            
            const handleAuth = async (e) => {
                e.preventDefault();
                console.log("Auth button clicked!");
                
                if (typeof window.supabaseClient === 'undefined') {
                    alert("Authentication is currently unavailable. Supabase is not loaded.");
                    return;
                }
                
                try {
                    // Redirect back to the exact page the user is currently on (index.html)
                    let redirectUrl = window.location.href;
                    
                    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: redirectUrl
                        }
                    });
                    
                    if (error) {
                        console.error("Auth Error:", error.message);
                        alert("Authentication Error: " + error.message + "\\n\\nDid you enable Google Auth in Supabase?");
                    }
                } catch (err) {
                    console.error("Critical Auth Error:", err);
                    alert("Critical Error: " + err.message);
                }
            };

            // Force fresh listeners by replacing the nodes
            let loginBtn = document.getElementById('login-btn');
            let signupBtn = document.getElementById('signup-btn');
            
            if (loginBtn) {
                let newLoginBtn = loginBtn.cloneNode(true);
                loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
                newLoginBtn.addEventListener('click', handleAuth);
            }
            if (signupBtn) {
                let newSignupBtn = signupBtn.cloneNode(true);
                signupBtn.parentNode.replaceChild(newSignupBtn, signupBtn);
                newSignupBtn.addEventListener('click', handleAuth);
            }
        }
    }
});