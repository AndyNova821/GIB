// js/main.js
import { JST_TODAY, showToast } from './core.js';
import { updateDashboardUI } from './feature-timeline.js';
import { renderWatchlist, updatePinIcons } from './feature-watchlist.js';
import { renderArchives } from './feature-archive.js';
import './feature-detail.js';
import { supabase, updateAuthUI } from './supabase-auth.js';

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

                // ★ 修正: プランが free 以外に更新されたらリロードせずにUIを直接書き換える
                if (data && data.plan !== 'free') {
                    clearInterval(checkInterval);
                    
                    // 1. ローカルストレージを最新プランに更新
                    localStorage.setItem('gib_user_plan', data.plan);
                    
                    // 2. ヘッダーのバッジとリストの鍵アイコンを更新（ここで鍵が外れる）
                    updateAuthUI();
                    updatePinIcons();
                    
                    // 3. ローディング画面をフェードアウト
                    if (loadingOverlay) {
                        loadingOverlay.classList.remove('active');
                        setTimeout(() => loadingOverlay.style.display = 'none', 300);
                    }
                    
                    // 4. 完了を知らせるトースト表示
                    let planName = data.plan === 'pro' ? 'プロ' : 'スタンダード';
                    showToast(`✨ ${planName}プランへのアップグレードが完了しました！`, 'success');

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