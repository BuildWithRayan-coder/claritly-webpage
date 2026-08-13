// auth.js - Handles UI state based on authentication

document.addEventListener('DOMContentLoaded', async () => {
    const authButtonsContainer = document.getElementById('auth-buttons');
    
    // Check initial auth state
    const { data: { session } } = await supabase.auth.getSession();
    updateUI(session);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
        updateUI(session);
    });

    function updateUI(session) {
        if (!authButtonsContainer) return;

        if (session) {
            // Logged in state
            authButtonsContainer.innerHTML = `
                <a href="dashboard.html" class="btn btn-primary" style="margin-right: 10px;">Dashboard</a>
                <button id="logout-btn" class="btn btn-secondary">Log out</button>
            `;
            
            document.getElementById('logout-btn').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            });
        } else {
            // Logged out state
            authButtonsContainer.innerHTML = `
                <button id="login-btn" class="btn btn-primary">Sign in with Google</button>
            `;
            
            document.getElementById('login-btn').addEventListener('click', async () => {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/dashboard.html'
                    }
                });
                if (error) console.error("Login Error:", error.message);
            });
        }
    }
});
