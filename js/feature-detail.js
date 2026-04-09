// js/feature-detail.js
import { AppState, TODAY, showToast } from './core.js';
import { updateArchiveBtnState } from './feature-archive.js';
import { supabase } from './supabase-auth.js'; 

export async function openDetail(targetId, specificDate = null) {
    const requestedDate = specificDate || AppState.TARGET_DATE;
    
    // ==========================================
    // ★ 4段階アクセスチェック（未登録 / FREE / STD / PRO）
    // ==========================================
    const { data: { session } } = await supabase.auth.getSession();
    const isLogged = !!session;
    const userPlan = isLogged ? (localStorage.getItem('gib_user_plan') || 'free') : 'unregistered';
    
    let isAllowed = false;
    let denyReason = "";

    const reqYear = parseInt(requestedDate.substring(0,4));
    const reqMonth = parseInt(requestedDate.substring(4,6)) - 1;
    const reqDay = parseInt(requestedDate.substring(6,8));
    const reqDateObj = new Date(reqYear, reqMonth, reqDay);
    const todayObj = new Date();
    todayObj.setHours(0,0,0,0);
    reqDateObj.setHours(0,0,0,0);
    
    const diffTime = Math.abs(todayObj - reqDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    const isToday = (diffDays === 0);
    const isWithin7Days = (diffDays <= 7);
    const standardFactions = ['us', 'jp', 'israel', 'iran', 'ukraine', 'russia'];

    if (userPlan === 'unregistered') {
        // ① 未登録: 今日の「情勢トピック」のみ
        if (targetId === 'all' && isToday) {
            isAllowed = true;
        } else {
            isAllowed = false;
            denyReason = "このコンテンツへアクセスするには、無料の会員登録が必要です。";
        }
    } else if (userPlan === 'free') {
        // ② フリー会員: 今日の「情勢トピック」「アメリカ」「イラン」のみ
        if ((targetId === 'all' || targetId === 'us' || targetId === 'iran') && isToday) {
            isAllowed = true;
        } else {
            isAllowed = false;
            denyReason = "各国の詳細データや過去のアーカイブを閲覧するには「スタンダードプラン」以上の権限が必要です。";
        }
    } else if (userPlan === 'standard') {
        // ③ スタンダード: 今日の「情勢トピック」および主要国の「今日〜過去7日」
        if (targetId === 'all') {
            isAllowed = isWithin7Days;
            if (!isAllowed) denyReason = "過去7日を超える情勢トピックの閲覧は「プロプラン」限定の機能です。";
        } else if (standardFactions.includes(targetId)) {
            isAllowed = isWithin7Days;
            if (!isAllowed) denyReason = "過去7日を超えるアーカイブの閲覧は「プロプラン」限定の機能です。";
        } else {
            isAllowed = false;
            denyReason = "地域・国際機関のデータ閲覧は「プロプラン」限定の機能です。";
        }
    } else if (userPlan === 'pro') {
        // ④ プロ: 全て許可
        isAllowed = true;
    }

    if (!isAllowed) {
        // 権限がない場合、状況に応じたペイウォール（または登録画面）を呼び出す
        openPaywallModal(denyReason, isLogged, userPlan);
        return; 
    }
    // ==========================================

    if (window.location.hash !== '#detail') {
        history.pushState({ view: 'detail' }, '', '#detail');
    }

    const targetListItem = document.querySelector(`[data-target="${targetId}"] .update-date`);
    if (targetListItem && targetListItem.dataset.status === "missing") {
        showToast("データが未取得のため表示できません", "error");
        return; 
    }

    AppState.CURRENT_VIEW_TARGET = targetId;
    AppState.CURRENT_VIEW_DATE = requestedDate;
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('detail-view').classList.add('active');
    
    const titleEl = document.getElementById('detail-title');
    const contentEl = document.getElementById('detail-content');
    
    titleEl.textContent = 'データ復号中...';
    contentEl.innerHTML = '<p style="color: #8b949e;">インテリジェンス・データを取得しています...</p>';
    updateArchiveBtnState();

    const folderPath = (AppState.CURRENT_VIEW_DATE === TODAY) ? 'data' : 'data/old';

    try {
        const response = await fetch(`${folderPath}/${AppState.CURRENT_VIEW_TARGET}_${AppState.CURRENT_VIEW_DATE}.json`);
        if (!response.ok) throw new Error('Not Found');

        const rawData = await response.json();
        let htmlBuilder = "";
        const dateStr = AppState.CURRENT_VIEW_DATE;
        const formattedDate = `${dateStr.substring(0,4)}/${dateStr.substring(4,6)}/${dateStr.substring(6,8)}`;

        if (AppState.CURRENT_VIEW_TARGET === 'all') {
            titleEl.textContent = `${formattedDate} の世界情勢トピック`;
            if (rawData.summary) {
                const formattedText = marked.parse(rawData.summary);
                htmlBuilder = `<div class="matrix-section"><div class="matrix-content">${formattedText}</div></div>`;
            }
        } else {
            const targetData = rawData.factions ? rawData.factions[AppState.CURRENT_VIEW_TARGET] : null; 
            titleEl.textContent = `${targetData.display_name} (${formattedDate})`;
            const matrices = targetData.matrices;
            if (matrices) {
                Object.keys(matrices).sort().forEach(key => {
                    const matrix = matrices[key];
                    const formattedText = marked.parse(matrix.detail);
                    htmlBuilder += `<div class="matrix-section"><h3 style="color:#58a6ff;">${matrix.title}</h3><div class="matrix-content">${formattedText}</div></div>`;
                });
            }
        }
        contentEl.innerHTML = htmlBuilder;
        updateArchiveBtnState();
    } catch (error) {
        titleEl.textContent = 'アクセスエラー';
        contentEl.innerHTML = `<div style="text-align:center;"><p style="color:#ff7b72;">データが存在しませんでした。</p></div>`;
    }
    window.scrollTo(0, 0); 
}

export function closeDetail() {
    if (window.location.hash === '#detail') {
        history.back();
    } else {
        document.getElementById('detail-view').classList.remove('active');
        document.getElementById('dashboard-view').classList.add('active');
    }
}
export function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('active');
    document.getElementById('menu-overlay').classList.toggle('active');
}
export function openProfile() {
    toggleMenu(); 
    if (window.location.hash !== '#profile') {
        history.pushState({ view: 'profile' }, '', '#profile');
    }
    document.getElementById('profile-modal').classList.add('active');
}
export function closeProfile() {
    if (window.location.hash === '#profile') {
        history.back();
    } else {
        document.getElementById('profile-modal').classList.remove('active');
    }
}

export async function openPaywallModal(customMessage = null, passedIsLogged = null, passedUserPlan = null) {
    let isLogged = passedIsLogged;
    let userPlan = passedUserPlan;
    let userId = '';

    if (isLogged === null) {
        const { data: { session } } = await supabase.auth.getSession();
        isLogged = !!session;
        userPlan = isLogged ? (localStorage.getItem('gib_user_plan') || 'free') : 'unregistered';
        userId = session ? session.user.id : '';
    } else if (isLogged) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session ? session.user.id : '';
    }

    const stripeStandardUrl = "https://buy.stripe.com/5kQ3cx3Vu1OL6x159x9R600";
    const stripeProUrl = "https://buy.stripe.com/5kQ8wR63C0KH3kP9pN9R601";

    const finalStandardUrl = userId ? `${stripeStandardUrl}?client_reference_id=${userId}` : stripeStandardUrl;
    const finalProUrl = userId ? `${stripeProUrl}?client_reference_id=${userId}` : stripeProUrl;

    const standardBtn = document.getElementById('btn-upgrade-standard');
    const proBtn = document.getElementById('btn-upgrade-pro');
    const msgPro = document.getElementById('msg-pro-tier');
    const btnContainer = document.getElementById('paywall-buttons');
    const loginPrompt = document.getElementById('paywall-login-prompt');
    const msgEl = document.getElementById('paywall-message');

    if (standardBtn) standardBtn.href = finalStandardUrl;
    if (proBtn) proBtn.href = finalProUrl;

    if (!isLogged) {
        if (btnContainer) btnContainer.style.display = 'none'; 
        if (msgPro) msgPro.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block'; 
        msgEl.textContent = customMessage || "このコンテンツへアクセスするには、無料の会員登録が必要です。";
    } else {
        if (loginPrompt) loginPrompt.style.display = 'none'; 
        
        if (userPlan === 'free') {
            if (btnContainer) btnContainer.style.display = 'flex';
            if (standardBtn) standardBtn.style.display = 'block';
            if (proBtn) proBtn.style.display = 'block';
            if (msgPro) msgPro.style.display = 'none';
        } else if (userPlan === 'standard') {
            if (btnContainer) btnContainer.style.display = 'flex';
            if (standardBtn) standardBtn.style.display = 'none'; 
            if (proBtn) proBtn.style.display = 'block';
            if (msgPro) msgPro.style.display = 'none';
        } else if (userPlan === 'pro') {
            if (btnContainer) btnContainer.style.display = 'none'; 
            if (msgPro) msgPro.style.display = 'block'; 
        }
        msgEl.textContent = customMessage || "このインテリジェンス・データにアクセスするには、権限のアップグレードが必要です。";
    }

    document.getElementById('paywall-modal').style.display = 'block';
    document.body.style.overflow = 'hidden'; 
}

export function closePaywallModal() { 
    document.getElementById('paywall-modal').style.display = 'none'; 
    document.body.style.overflow = ''; 
}
export function openAuthModal() { 
    // モーダルを開くたびに表示状態をリセットする
    const formContainer = document.getElementById('auth-form-container');
    const successMsg = document.getElementById('auth-success-msg');
    if (formContainer) formContainer.style.display = 'block';
    if (successMsg) successMsg.style.display = 'none';

    document.getElementById('auth-modal').style.display = 'block'; 
    document.body.style.overflow = 'hidden'; 
}
export function closeAuthModal() { 
    document.getElementById('auth-modal').style.display = 'none'; 
    document.body.style.overflow = ''; 
}

window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.toggleMenu = toggleMenu;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.openPaywallModal = openPaywallModal;
window.closePaywallModal = closePaywallModal;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

export async function openAccountInfo() {
    if (typeof toggleMenu === 'function') toggleMenu(); 
    
    if (window.location.hash !== '#account') {
        history.pushState({ view: 'account' }, '', '#account');
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    const userPlan = localStorage.getItem('gib_user_plan') || 'free';
    const contentEl = document.getElementById('account-info-content');
    
    // ★追加: カスタマーポータルへ飛ぶボタンを取得
    const portalBtn = document.getElementById('btn-customer-portal');
    
    if (session && contentEl) {
        let planDisplay = '🆓 フリープラン';
        let planColor = 'var(--text-primary)';
        if (userPlan === 'standard') { planDisplay = '📖 スタンダードプラン'; planColor = 'var(--accent-color)'; }
        if (userPlan === 'pro') { planDisplay = '👑 プロプラン'; planColor = '#e3b341'; }
        
        contentEl.innerHTML = `
            <p style="margin-bottom: 10px; color: var(--text-secondary); font-size: 0.9rem;">ログイン中のアカウント</p>
            <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 20px; word-break: break-all;">${session.user.email}</p>
            <p style="margin-bottom: 5px; color: var(--text-secondary); font-size: 0.9rem;">現在の権限レベル</p>
            <p style="font-weight: bold; font-size: 1.15rem; color: ${planColor};">${planDisplay}</p>
        `;
        // ★追加: ログイン中ならポータルボタンを表示する
        if (portalBtn) portalBtn.style.display = 'block';

    } else if (contentEl) {
        contentEl.innerHTML = '<p style="color: #ff7b72;">ユーザー情報を取得できませんでした。再ログインしてください。</p>';
        // ★追加: 未ログインなら隠す
        if (portalBtn) portalBtn.style.display = 'none';
    }

    document.getElementById('account-modal').classList.add('active');
}

export function closeAccountInfo() {
    if (window.location.hash === '#account') {
        history.back();
    } else {
        document.getElementById('account-modal').classList.remove('active');
    }
}

window.openAccountInfo = openAccountInfo;
window.closeAccountInfo = closeAccountInfo;

window.addEventListener('popstate', (event) => {
    const hash = window.location.hash;
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('profile-modal').classList.remove('active');
    const accountModal = document.getElementById('account-modal');
    if (accountModal) accountModal.classList.remove('active');
    
    document.getElementById('side-menu').classList.remove('active');
    document.getElementById('menu-overlay').classList.remove('active');
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('paywall-modal').style.display = 'none';
    document.body.style.overflow = ''; 

    if (hash === '#detail') {
        document.getElementById('detail-view').classList.add('active');
    } else if (hash === '#archive') {
        document.getElementById('archive-view').classList.add('active');
    } else if (hash === '#profile') {
        document.getElementById('dashboard-view').classList.add('active');
        document.getElementById('profile-modal').classList.add('active');
    } else if (hash === '#account') {
        document.getElementById('dashboard-view').classList.add('active');
        if (accountModal) accountModal.classList.add('active');
    } else {
        document.getElementById('dashboard-view').classList.add('active');
    }
});

export function openCustomerPortal() {
    const portalUrl = "https://billing.stripe.com/p/login/5kQ3cx3Vu1OL6x159x9R600";
    if (portalUrl.includes("your_unique_id")) {
        showToast("ポータルURLが未設定です。開発者にお問い合わせください。", "error");
        return;
    }
    window.location.href = portalUrl;
}
window.openCustomerPortal = openCustomerPortal;