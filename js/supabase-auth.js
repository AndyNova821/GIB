// js/supabase-auth.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { showToast } from './core.js';

const supabaseUrl = 'https://jlecfhihaxaovkcfgyqq.supabase.co';
const supabaseKey = 'sb_publishable_7Gqzizc1c1yU465To3ch4Q_KPxGOuSP';

export const supabase = createClient(supabaseUrl, supabaseKey);

export function updateAuthUI() {
    const userPlan = localStorage.getItem('gib_user_plan');
    const badge = document.getElementById('auth-status-badge');
    const loginBtn = document.getElementById('menu-auth-btn');
    const logoutBtn = document.getElementById('menu-logout-btn');
    const accountBtn = document.getElementById('menu-account-btn');

    if (!userPlan) {
        if (badge) {
            badge.textContent = '[未ログイン]';
            badge.style.color = 'var(--text-secondary)';
            badge.style.borderColor = 'var(--border-color)';
        }
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (accountBtn) accountBtn.style.display = 'none';
    } else {
        if (badge) {
            if (userPlan === 'free') {
                badge.textContent = '[🆓 フリープラン]';
                badge.style.color = 'var(--text-primary)';
                badge.style.borderColor = 'var(--border-color)';
            } else if (userPlan === 'standard') {
                badge.textContent = '[📖 スタンダード]';
                badge.style.color = 'var(--accent-color)';
                badge.style.borderColor = 'var(--accent-color)';
            } else if (userPlan === 'pro') {
                badge.textContent = '[👑 プロ]';
                badge.style.color = '#e3b341';
                badge.style.borderColor = '#e3b341';
            }
        }
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (accountBtn) accountBtn.style.display = 'block'; 
    }
}

export function handleBadgeClick() {
    const userPlan = localStorage.getItem('gib_user_plan');
    if (!userPlan) {
        openAuthModal(); 
    } else {
        if (window.openPaywallModal) {
            window.openPaywallModal("現在のプラン確認・アップグレード");
        }
    }
}
window.handleBadgeClick = handleBadgeClick;

export async function handleAuth(action) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showToast("メールアドレスとパスワードを入力してください。", "error");
        return;
    }

    const loginBtn = document.querySelector('button[onclick="handleAuth(\'login\')"]');
    const signupBtn = document.querySelector('button[onclick="handleAuth(\'signup\')"]');
    
    const originalLoginText = loginBtn.textContent;
    const originalSignupText = signupBtn.textContent;
    
    loginBtn.disabled = true;
    signupBtn.disabled = true;
    loginBtn.style.opacity = '0.5';
    signupBtn.style.opacity = '0.5';
    loginBtn.style.cursor = 'not-allowed';
    signupBtn.style.cursor = 'not-allowed';
    
    if (action === 'login') {
        loginBtn.textContent = '🔄 認証中...';
    } else {
        signupBtn.textContent = '🔄 登録処理中...';
    }

    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 15000)
        );

        if (action === 'signup') {
            const redirectUrl = window.location.origin + window.location.pathname;
            
            const authPromise = supabase.auth.signUp({
                email: email,
                password: password,
                options: { emailRedirectTo: redirectUrl }
            });
            
            const { data, error } = await Promise.race([authPromise, timeoutPromise]);
            if (error) throw error;
            
            if (data?.user?.identities?.length === 0) {
                showToast("このメールアドレスは既に登録されています。ログインしてください。", "error");
                return; 
            }
            
            // ★ 修正: モーダルを閉じずに、フォームを隠して完了メッセージを表示する
            const formContainer = document.getElementById('auth-form-container');
            const successMsg = document.getElementById('auth-success-msg');
            if (formContainer) formContainer.style.display = 'none';
            if (successMsg) successMsg.style.display = 'block';
            
            // showToastは不要になるため削除（または控えめなメッセージに変更）
        }
        else if (action === 'login') {
            const authPromise = supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            const { data, error } = await Promise.race([authPromise, timeoutPromise]);
            if (error) throw error;
            
            const profilePromise = supabase.from('profiles').select('plan, preferences').eq('id', data.user.id).single();
            const { data: profileData, error: profileError } = await Promise.race([profilePromise, timeoutPromise]);
                
            if (profileError) throw profileError;

            localStorage.setItem('gib_user_plan', profileData.plan);
            
            if (profileData.preferences) {
                if (profileData.preferences.watchlist) localStorage.setItem('gib_watchlist', JSON.stringify(profileData.preferences.watchlist));
                if (profileData.preferences.archives) localStorage.setItem('gib_archives', JSON.stringify(profileData.preferences.archives));
            }

            showToast(`アクセス承認。現在の権限: ${profileData.plan.toUpperCase()}`, "success");
            
            updateAuthUI();
            closeAuthModal();
            closePaywallModal();
            
            // ログイン後にUIを更新するためにリロード
            setTimeout(() => { window.location.reload(); }, 1000);
        }
    } catch (error) {
        let errorMsg = error.message;
        if (errorMsg === 'TIMEOUT') {
            errorMsg = "サーバーからの応答がありません（タイムアウト）。通信環境を確認してください。";
        } else if (errorMsg.includes('Invalid login credentials')) {
            errorMsg = "メールアドレスまたはパスワードが間違っているか、アカウントが未登録です。";
        } else {
            errorMsg = "システムエラーが発生しました。時間を置いて再度お試しください。";
        }
        showToast(`認証エラー: ${errorMsg}`, "error");
    } finally {
        loginBtn.disabled = false;
        signupBtn.disabled = false;
        loginBtn.style.opacity = '1';
        signupBtn.style.opacity = '1';
        loginBtn.style.cursor = 'pointer';
        signupBtn.style.cursor = 'pointer';
        loginBtn.textContent = originalLoginText;
        signupBtn.textContent = originalSignupText;
    }
}

export async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showToast("ログアウトに失敗しました。", "error");
        return;
    }
    
    // ★ 追加: ローカルデータを完全にクリア
    localStorage.removeItem('gib_user_plan');
    localStorage.removeItem('gib_watchlist');
    localStorage.removeItem('gib_archives');
    
    showToast("システムからログアウトしました。", "success");
    
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

window.handleAuth = handleAuth;
window.handleLogout = handleLogout;

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('plan, preferences') 
            .eq('id', session.user.id)
            .single();
            
        if (profileData) {
            localStorage.setItem('gib_user_plan', profileData.plan);
            if (profileData.preferences) {
                if (profileData.preferences.watchlist) localStorage.setItem('gib_watchlist', JSON.stringify(profileData.preferences.watchlist));
                if (profileData.preferences.archives) localStorage.setItem('gib_archives', JSON.stringify(profileData.preferences.archives));
            }
        }
    } else {
        localStorage.removeItem('gib_user_plan');
    }
    updateAuthUI();
});

export async function syncPreferencesToCloud() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; 

    const watchlist = JSON.parse(localStorage.getItem('gib_watchlist')) || [];
    const archives = JSON.parse(localStorage.getItem('gib_archives')) || [];

    await supabase.from('profiles').update({ 
        preferences: { watchlist, archives } 
    }).eq('id', session.user.id);
}

export async function handleDeleteAccount() {
    const confirmFirst = confirm("⚠️ 重要: GIBシステムから退会しますか？\n\nこの操作を行うと、ピン留めやアーカイブを含む全てのデータが完全に消去され、復元はできません。");
    if (!confirmFirst) return;

    const confirmSecond = confirm("本当に、本当によろしいですか？\n(この操作を持って、全てのインテリジェンス・アクセス権が喪失します)");
    if (confirmSecond) {
        try {
            showToast("アカウントを削除しています...", "success");
            const { error } = await supabase.rpc('delete_user_account');
            if (error) throw error;

            localStorage.clear();
            await supabase.auth.signOut();
            
            showToast("全てのアカウントデータが消去されました。ご利用ありがとうございました。", "success");
            setTimeout(() => { window.location.href = "/"; }, 3000);
            
        } catch (error) {
            showToast(`退会エラー: ${error.message}`, "error");
        }
    }
}
window.handleDeleteAccount = handleDeleteAccount;