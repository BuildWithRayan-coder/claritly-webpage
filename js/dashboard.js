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

    // 3. Fetch Usage Data from user_usage table
    async function fetchUsage() {
        try {
            const { data, error } = await supabase
                .from('user_usage')
                .select('rewrites_count')
                .eq('user_id', user.id)
                .single();
                
            if (error) {
                console.error("Error fetching usage:", error);
                return;
            }

            if (data) {
                const count = data.rewrites_count || 0;
                document.getElementById('usage-count').textContent = count;
                
                // Update progress bar
                const percentage = Math.min((count / 100) * 100, 100);
                document.getElementById('usage-bar').style.width = percentage + '%';
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
