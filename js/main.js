// js/main.js
import { JST_TODAY } from './core.js';
import { updateDashboardUI } from './feature-timeline.js';
import { renderWatchlist, updatePinIcons } from './feature-watchlist.js';
import { renderArchives } from './feature-archive.js';
import './feature-detail.js';
import './supabase-auth.js';
import { supabase } from './supabase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // ★ 決済完了（お帰り）の自動検知とローディング処理
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        const loadingOverlay = document.getElementById('payment-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            requestAnimationFrame(() => { loadingOverlay.classList.add('active'); });
        }
        
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        
        // ★ 3秒固定ではなく、SupabaseのDBを監視(ポーリング)して権限アップを待つ
        const waitForUpgrade = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { window.location.reload(); return; }

            let attempts = 0;
            const maxAttempts = 10; // 1.5秒 × 10回 = 最大15秒待機

            const checkInterval = setInterval(async () => {
                attempts++;
                const { data } = await supabase
                    .from('profiles')
                    .select('plan')
                    .eq('id', session.user.id)
                    .single();

                // プランが free 以外に更新されたら即リロード！
                if (data && data.plan !== 'free') {
                    clearInterval(checkInterval);
                    window.location.reload();
                } else if (attempts >= maxAttempts) {
                    // タイムアウト時は一旦リロードしてユーザーに委ねる
                    clearInterval(checkInterval);
                    window.location.reload();
                }
            }, 1500);
        };
        waitForUpgrade();
        
        return; 
    }

    // --- ここから下は通常の初期化処理 ---
    const dateInput = document.getElementById('target-date');
    if (dateInput) {
        dateInput.value = JST_TODAY.string;
    }

    renderWatchlist();
    updatePinIcons();
    renderArchives();
    updateDashboardUI();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.getAttribute('role') === 'button') {
                e.preventDefault(); 
                activeElement.click();
            }
        }
    });
});