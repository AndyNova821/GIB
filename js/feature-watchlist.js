// js/feature-watchlist.js 全文

import { updateDashboardUI } from './feature-timeline.js';
import { syncPreferencesToCloud } from './supabase-auth.js';
import { AppState } from './core.js'; // ★追加

let watchlist = JSON.parse(localStorage.getItem('gib_watchlist')) || [];

export function renderWatchlist() {
    const container = document.getElementById('watchlist-container');
    const section = document.getElementById('watchlist-section');
    container.innerHTML = '';
    
    if (watchlist.length === 0) {
        section.style.display = 'none'; return;
    }
    
    section.style.display = 'block';
    watchlist.forEach(item => {
        container.innerHTML += `
            <div class="list-item pinned" onclick="openDetail('${item.id}')" role="button" tabindex="0" data-target="${item.id}">
                <span class="pin-icon active" onclick="togglePin(event, '${item.id}', '${item.flag}', '${item.name}')" role="button" tabindex="0" aria-label="ピン留め解除">★</span>
                <div class="item-body">
                    <span class="update-date">確認中...</span>
                    <div class="item-title"><span class="flag">${item.flag}</span><span class="name">${item.name}</span></div>
                </div>
                <div class="item-meta"><span class="arrow">›</span></div>
            </div>
        `;
    });
}

// ★ 日付とプランを考慮して鍵マークを動的に更新する
export function updatePinIcons() {
    const userPlan = localStorage.getItem('gib_user_plan') || 'unregistered';
    
    // --- 日付計算ロジック (feature-detail.jsと共通) ---
    const requestedDate = AppState.TARGET_DATE;
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
    const isYesterday = (diffDays === 1);
    const isWithin7Days = (diffDays <= 7);
    // ----------------------------------------------

    // 各プランで閲覧を許可するIDの定義
    const unregisteredAllowed = ['all', 'us', 'iran', 'israel', 'korea'];
    const freeAllowed = ['all', 'us', 'iran', 'israel', 'korea', 'ukraine', 'russia', 'jp'];
    const standardAllowed = ['all', 'us', 'iran', 'jp', 'israel', 'ukraine', 'russia', 'korea'];

    document.querySelectorAll('.original-list .list-item').forEach(listItem => {
        const icon = listItem.querySelector('.pin-icon');
        if (!icon) return;
        const id = icon.getAttribute('data-id');
        if (!id) return;

        let canRead = false;

        // 閲覧権限の判定（日付条件を追加）
        if (userPlan === 'unregistered') {
            canRead = unregisteredAllowed.includes(id) && (isToday || isYesterday);
        } else if (userPlan === 'free') {
            canRead = freeAllowed.includes(id) && (isToday || isYesterday);
        } else if (userPlan === 'standard') {
            if (id === 'all' || standardAllowed.includes(id)) {
                canRead = isWithin7Days;
            } else {
                canRead = false; // 地域・国際機関はスタンダードでも不可
            }
        } else if (userPlan === 'pro') {
            canRead = true; // Proは何日前でもOK
        }

        if (!canRead) {
            // 【権限なし】 -> 🔒を表示
            icon.textContent = '🔒';
            icon.classList.remove('active');
            icon.style.color = 'var(--text-secondary)';
            
            icon.onclick = (e) => {
                e.stopPropagation();
                let msg = "このデータの閲覧は「スタンダードプラン」以上の権限が必要です。";
                if (userPlan === 'standard') {
                    msg = "地域・国際機関または過去7日を超えるアーカイブの閲覧は「プロプラン」限定の機能です。";
                } else if (userPlan === 'unregistered') {
                    msg = "このコンテンツへアクセスするには、無料の会員登録が必要です。";
                }
                if(window.openPaywallModal) window.openPaywallModal(msg);
            };
        } else {
            // 【権限あり】 -> ☆ または ★
            icon.style.color = ''; 
            
            if (watchlist.some(item => item.id === id)) {
                icon.textContent = '★'; 
                icon.classList.add('active');
            } else {
                icon.textContent = '☆'; 
                icon.classList.remove('active');
            }

            icon.onclick = (e) => {
                e.stopPropagation();
                if (userPlan !== 'pro') {
                    if(window.openPaywallModal) window.openPaywallModal("📌 注目エリア保存機能は「プロプラン」限定の機能です。");
                    return;
                }
                const flag = listItem.querySelector('.flag').textContent;
                const name = listItem.querySelector('.name').textContent;
                togglePin(e, id, flag, name);
            };
        }
    });
}

// オリジナルダイアログをPromiseで待つ関数
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const msgEl = document.getElementById('confirm-dialog-msg');
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        msgEl.textContent = message;
        modal.style.display = 'block';

        const cleanup = () => {
            modal.style.display = 'none';
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => { cleanup(); resolve(true); };
        btnCancel.onclick = () => { cleanup(); resolve(false); };
    });
}

export async function togglePin(event, id, flag, name) {
    event.stopPropagation(); 
    const userPlan = localStorage.getItem('gib_user_plan') || 'unregistered';
    if (userPlan !== 'pro') {
        if(window.openPaywallModal) window.openPaywallModal("📌 注目エリア保存機能は「プロプラン」限定の機能です。");
        return;
    }

    const index = watchlist.findIndex(item => item.id === id);
    
    if (index > -1) {
        const isConfirmed = await showCustomConfirm(`${name}を注目エリアリストから削除しますか？`);
        if (!isConfirmed) return; 
        
        watchlist.splice(index, 1);
    } else {
        watchlist.push({ id, flag, name });
    }
    
    localStorage.setItem('gib_watchlist', JSON.stringify(watchlist));
    renderWatchlist();
    updatePinIcons();
    updateDashboardUI();
    
    if (typeof syncPreferencesToCloud === 'function') syncPreferencesToCloud();
}

window.togglePin = togglePin;