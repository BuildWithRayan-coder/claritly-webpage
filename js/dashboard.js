// dashboard.js - Fetches data for the dashboard

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // Redirect to home if not logged in
        window.location.href = 'index.html';
        return;
    }

    const user = session.user;
    
    // 2. Display Name
    const nameElement = document.getElementById('user-name');
    if (nameElement) {
        const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
        nameElement.textContent = fullName;
    }

    // 2.5 Determine Plan & Limits
    const isPaid = user.user_metadata?.plan === 'paid';
    const planLimit = isPaid ? 5000 : 100;
    const planName = isPaid ? 'Premium' : 'Free';
    
    const planNameEl = document.getElementById('plan-name');
    if (planNameEl) planNameEl.textContent = planName;
    
    const usageLimitEl = document.getElementById('usage-limit');
    if (usageLimitEl) usageLimitEl.textContent = planLimit.toLocaleString();
    
    // Hide upgrade section if paid
    if (isPaid) {
        const upgradeSection = document.getElementById('upgrade-section');
        if (upgradeSection) upgradeSection.style.display = 'none';
    }

    // 3. Fetch Usage Data from user_usage table
    async function fetchUsage() {
        try {
            const { data, error } = await supabase
                .from('user_usage')
                .select('rewrites_count')
                .eq('user_id', user.id)
                .single();
                
            let count = 0;
            if (!error && data) {
                count = data.rewrites_count || 0;
            }
            
            const usageCountEl = document.getElementById('usage-count');
            if (usageCountEl) usageCountEl.textContent = count.toLocaleString();
            
            // Update SVG Circle Progress
            const percentage = Math.min((count / planLimit) * 100, 100);
            const circlePath = document.getElementById('usage-circle-path');
            if (circlePath) {
                // Delay slightly to trigger the CSS transition beautifully on load
                setTimeout(() => {
                    circlePath.style.strokeDasharray = `${percentage}, 100`;
                }, 200); // 200ms delay for smoothness
            }
        } catch (err) {
            console.error("Failed to fetch usage:", err);
        }
    }

    fetchUsage();

    // 4. Handle Upgrade Button Placeholder
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
            alert('Stripe checkout integration coming soon!');
        });
    }
});
