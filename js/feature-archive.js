import { AppState, FLAGS } from './core.js';
import { syncPreferencesToCloud } from './supabase-auth.js';

let archives = JSON.parse(localStorage.getItem('gib_archives')) || [];

export function renderArchives() {
    const container = document.getElementById('archive-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (archives.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem; padding: 10px 20px;">現在、アーカイブされたデータはありません。</p>';
        return; 
    }
    
    [...archives].reverse().forEach(item => {
        const formattedDate = `${item.date.substring(0,4)}/${item.date.substring(4,6)}/${item.date.substring(6,8)}`;
        container.innerHTML += `
            <div class="list-item archived" onclick="openDetail('${item.targetId}', '${item.date}')" role="button" tabindex="0">
                <span class="archive-icon" onclick="removeArchive(event, '${item.id}')" role="button" tabindex="0" aria-label="アーカイブ削除">📦</span>
                <div class="item-body">
                    <span class="update-date is-past">記録日: ${formattedDate}</span>
                    <div class="item-title"><span class="flag">${item.flag}</span><span class="name">${item.name}</span></div>
                </div>
                <div class="item-meta"><span class="arrow">›</span></div>
            </div>
        `;
    });
}

export function removeArchive(event, archiveId) {
    event.stopPropagation();
    archives = archives.filter(item => item.id !== archiveId);
    localStorage.setItem('gib_archives', JSON.stringify(archives));
    renderArchives();
    if (typeof syncPreferencesToCloud === 'function') syncPreferencesToCloud(); 
}

export function toggleArchive() {
    const userPlan = localStorage.getItem('gib_user_plan') || 'free';
    if (userPlan !== 'pro') {
        openPaywallModal("過去のデータを保存できる「情報アーカイブ倉庫」は、プロプラン限定の機能です。");
        return;
    }

    const archiveId = `${AppState.CURRENT_VIEW_TARGET}_${AppState.CURRENT_VIEW_DATE}`;
    const index = archives.findIndex(item => item.id === archiveId);

    if (index > -1) archives.splice(index, 1);
    else {
        const name = document.getElementById('detail-title').textContent;
        const flag = FLAGS[AppState.CURRENT_VIEW_TARGET] || "📁";
        archives.push({ id: archiveId, targetId: AppState.CURRENT_VIEW_TARGET, date: AppState.CURRENT_VIEW_DATE, flag, name });
    }
    
    localStorage.setItem('gib_archives', JSON.stringify(archives));
    renderArchives();
    updateArchiveBtnState();
    if (typeof syncPreferencesToCloud === 'function') syncPreferencesToCloud();
}

export function updateArchiveBtnState() {
    const btn = document.getElementById('archive-btn');
    if (!btn) return;

    const userPlan = localStorage.getItem('gib_user_plan') || 'free';
    
    if (userPlan !== 'pro') {
        btn.classList.remove('active'); 
        btn.innerHTML = "🔒 アーカイブ (Pro限定)";
        btn.onclick = () => openPaywallModal("過去のデータを保存できる「情報アーカイブ倉庫」は、プロプラン限定の機能です。");
        return;
    }

    const archiveId = `${AppState.CURRENT_VIEW_TARGET}_${AppState.CURRENT_VIEW_DATE}`;
    btn.onclick = toggleArchive;

    if (archives.some(item => item.id === archiveId)) {
        btn.classList.add('active'); btn.innerHTML = "📌 アーカイブ済";
    } else {
        btn.classList.remove('active'); btn.innerHTML = "📌 アーカイブ";
    }
}

// ==========================================
// ★ 独立したアーカイブ画面の開閉ロジック
// ==========================================
export function openArchiveView() {
    if (typeof toggleMenu === 'function') toggleMenu(); 
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('archive-view').classList.add('active');
    
    if (window.location.hash !== '#archive') {
        history.pushState({ view: 'archive' }, '', '#archive');
    }
    
    renderArchives();
    window.scrollTo(0, 0);
}

export function closeArchiveView() {
    if (window.location.hash === '#archive') {
        history.back();
    } else {
        document.getElementById('archive-view').classList.remove('active');
        document.getElementById('dashboard-view').classList.add('active');
    }
}

window.removeArchive = removeArchive;
window.toggleArchive = toggleArchive;
window.openArchiveView = openArchiveView;
window.closeArchiveView = closeArchiveView;