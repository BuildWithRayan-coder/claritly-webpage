// dashboard.js - Fetches data for the dashboard

document.addEventListener('DOMContentLoaded', async () => {
    const nameElement = document.getElementById('user-name');
    
    // Ensure supabaseClient is ready
    let client = window.supabaseClient;
    if (!client && typeof window.waitForSupabase === 'function') {
        try {
            client = await window.waitForSupabase();
        } catch (err) {
            console.error("waitForSupabase failed in dashboard:", err);
        }
    }
    if (!client) return;

    // Try getSession first, fall back to onAuthStateChange
    let session = null;
    
    try {
        const result = await client.auth.getSession();
        session = result?.data?.session;
    } catch (err) {
        console.error("getSession failed:", err);
    }
    
    if (!session) {
        // Wait briefly for auth state to resolve (e.g. after OAuth redirect)
        session = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 3000);
            const { data: { subscription } } = client.auth.onAuthStateChange((_event, s) => {
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
        const { data, error } = await client
            .from('user_usage')
            .select('rewrites_count')
            .eq('user_id', user.id)
            .single();

        const { data: subData, error: subError } = await client
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

    // --- Blocked Websites Management ---
    const blockedListEl = document.getElementById('dashboard-blocked-list');
    const blockedCountEl = document.getElementById('blocked-count');

    async function loadBlockedWebsites() {
        if (!blockedListEl) return;

        try {
            const { data: websites, error } = await client
                .from('blocked_websites')
                .select('id, domain, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const count = websites ? websites.length : 0;
            if (blockedCountEl) {
                blockedCountEl.textContent = `${count} / 10`;
                if (count >= 10) {
                    blockedCountEl.style.color = '#dc3545'; // red color for limit reached
                } else {
                    blockedCountEl.style.color = ''; // default
                }
            }
            
            const limitNotice = document.getElementById('blocked-limit-notice');
            if (limitNotice) {
                limitNotice.style.display = count >= 10 ? 'block' : 'none';
            }

            if (!websites || websites.length === 0) {
                blockedListEl.innerHTML = `
                    <div class="empty-blocklist-state">
                        <div class="empty-blocklist-icon">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <div class="empty-blocklist-text">No websites blocked</div>
                        <div class="empty-blocklist-hint">Right-click any page and choose &ldquo;Claritly &gt; Block this website&rdquo; to disable Claritly on specific domains.</div>
                    </div>
                `;
                return;
            }

            blockedListEl.innerHTML = websites.map(site => `
                <div class="dashboard-blocked-row" data-id="${site.id}">
                    <div class="blocked-domain-info">
                        <div class="blocked-domain-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                        </div>
                        <span class="blocked-domain-name">${escapeHtml(site.domain)}</span>
                    </div>
                    <button class="btn-unblock" data-id="${site.id}" data-domain="${escapeHtml(site.domain)}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Unblock
                    </button>
                </div>
            `).join('');

            // Attach click listeners to unblock buttons
            blockedListEl.querySelectorAll('.btn-unblock').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const siteId = btn.getAttribute('data-id');
                    await handleUnblock(siteId, btn);
                });
            });

        } catch (err) {
            console.error("Failed to load blocked websites:", err);
            blockedListEl.innerHTML = `
                <div class="empty-blocklist-state">
                    <div class="empty-blocklist-text" style="color: #ef4444;">Error loading websites</div>
                    <div class="empty-blocklist-hint">Please refresh the page or try again in a few moments.</div>
                </div>
            `;
        }
    }

    async function handleUnblock(siteId, buttonEl) {
        if (!siteId) return;

        try {
            if (buttonEl) {
                buttonEl.disabled = true;
                buttonEl.innerHTML = `
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    Removing...
                `;
            }

            const { error } = await client
                .from('blocked_websites')
                .delete()
                .eq('id', siteId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Re-sync with extension background immediately
            try {
                window.postMessage({
                    type: 'CLARITLY_AUTH_SYNC',
                    session: JSON.parse(JSON.stringify(session))
                }, '*');
            } catch (syncErr) {
                console.warn("Could not post auth sync message:", syncErr);
            }

            // Reload UI list
            await loadBlockedWebsites();

        } catch (err) {
            console.error("Failed to unblock website:", err);
            alert("Could not unblock website. Please try again.");
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.textContent = "Unblock";
            }
        }
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }

    // Initialize blocked websites list
    loadBlockedWebsites();
});