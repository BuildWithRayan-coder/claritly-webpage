// dashboard.js - Fetches data for the dashboard

document.addEventListener('DOMContentLoaded', async () => {
    const nameElement = document.getElementById('user-name');
    
    // Try getSession first, fall back to onAuthStateChange
    let session = null;
    
    try {
        const result = await window.supabaseClient.auth.getSession();
        session = result?.data?.session;
    } catch (err) {
        console.error("getSession failed:", err);
    }
    
    if (!session) {
        // Wait briefly for auth state to resolve (e.g. after OAuth redirect)
        session = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 3000);
            const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, s) => {
                if (s) {
                    clearTimeout(timeout);
                    subscription.unsubscribe();
                    resolve(s);
                }
            });
        });
    }
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const user = session.user;
    
    // Set name immediately
    if (nameElement) {
        const fullName = user.user_metadata?.full_name 
            || user.user_metadata?.name 
            || user.email?.split('@')[0] 
            || 'User';
        nameElement.textContent = fullName;
    }

    // Fetch usage from user_usage table
    try {
        const { data, error } = await window.supabaseClient
            .from('user_usage')
            .select('rewrites_count')
            .eq('user_id', user.id)
            .single();

        const { data: subData, error: subError } = await window.supabaseClient
            .from('subscriptions')
            .select('monthly_limit, status')
            .eq('user_id', user.id)
            .single();
            
        let count = 0;
        let limit = 50; // Default free limit
        
        if (!error && data) {
            count = data.rewrites_count || 0;
        }

        if (!subError && subData && subData.status === 'ACTIVE') {
            limit = subData.monthly_limit || 50;
        }
        
        // Update usage count
        const usageCountEl = document.getElementById('usage-count');
        if (usageCountEl) usageCountEl.textContent = count.toLocaleString();
        
        // Update limit
        const usageLimitEl = document.getElementById('usage-limit');
        if (usageLimitEl) usageLimitEl.textContent = limit.toLocaleString();
        
        // Animate the circle
        const percentage = Math.min((count / limit) * 100, 100);
        const circlePath = document.getElementById('usage-circle-path');
        if (circlePath) {
            setTimeout(() => {
                circlePath.style.strokeDasharray = `${percentage}, 100`;
            }, 300);
        }
    } catch (err) {
        console.error("Failed to fetch usage:", err);
    }
});