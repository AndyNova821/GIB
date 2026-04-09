// js/feature-watchlist.js
import { updateDashboardUI } from './feature-timeline.js';
import { syncPreferencesToCloud } from './supabase-auth.js';

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

// ★ 閲覧権限と注目エリア登録権限を完全に分離したアイコン更新ロジック
export function updatePinIcons() {
    const userPlan = localStorage.getItem('gib_user_plan') || 'unregistered';
    
    // 各プランで閲覧を許可するIDの定義
    const freeAllowed = ['all', 'us', 'iran'];
    const standardAllowed = ['all', 'us', 'iran', 'jp', 'israel', 'ukraine', 'russia'];

    document.querySelectorAll('.original-list .list-item').forEach(listItem => {
        const icon = listItem.querySelector('.pin-icon');
        if (!icon) return;
        const id = icon.getAttribute('data-id');
        if (!id) return; // 'all' などピン留め対象外の項目はスキップ

        let canRead = false;

        // 1. 閲覧権限の判定
        if (userPlan === 'unregistered') {
            canRead = false; // 未登録は詳細を開けないため全て🔒対象
        } else if (userPlan === 'free') {
            canRead = freeAllowed.includes(id);
        } else if (userPlan === 'standard') {
            canRead = standardAllowed.includes(id);
        } else if (userPlan === 'pro') {
            canRead = true;
        }

        // 2. アイコンの描画とクリックイベントのバインド
        if (!canRead) {
            // 【閲覧権限なし】 -> 🔒を表示し、ペイウォールへ
            icon.textContent = '🔒';
            icon.classList.remove('active');
            icon.style.color = 'var(--text-secondary)';
            
            icon.onclick = (e) => {
                e.stopPropagation();
                let msg = "この地域のデータ閲覧は「スタンダードプラン」以上の権限が必要です。";
                if (userPlan === 'standard') {
                    msg = "地域・国際機関のデータ閲覧は「プロプラン」限定の機能です。";
                } else if (userPlan === 'unregistered') {
                    msg = "このコンテンツへアクセスするには、無料の会員登録が必要です。";
                }
                if(window.openPaywallModal) window.openPaywallModal(msg);
            };
        } else {
            // 【閲覧権限あり】 -> ☆ または ★ を表示
            icon.style.color = ''; // 🔒のグレースタイルをリセット
            
            if (watchlist.some(item => item.id === id)) {
                icon.textContent = '★'; 
                icon.classList.add('active');
            } else {
                icon.textContent = '☆'; 
                icon.classList.remove('active');
            }

            // クリックイベント：Proプラン未満はペイウォール、Proはピン留め処理を実行
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
    
    // システムの堅牢化：直接関数を呼ばれた場合でもプロプラン以外は弾く
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