// js/feature-timeline.js
import { AppState, TODAY, JST_TODAY, YESTERDAY, JST_YESTERDAY } from './core.js';

export async function updateDashboardUI() {
    const isToday = (AppState.TARGET_DATE === TODAY);
    const t = AppState.TARGET_DATE;
    const formattedDate = `${t.substring(0,4)}/${t.substring(4,6)}/${t.substring(6,8)}`;
    const folderPath = isToday ? 'data' : 'data/old';

    // HTMLに記述された data-target 属性を収集（allも含めて自動収集される）
    const itemElements = document.querySelectorAll('.original-list .list-item[data-target], #watchlist-container .list-item[data-target]');
    const targetIds = [...new Set(Array.from(itemElements).map(el => el.getAttribute('data-target')))];

    // ★ 修正箇所：再取得の前に、古いステータス属性を完全に削除してリセットする
    targetIds.forEach(id => {
        document.querySelectorAll(`[data-target="${id}"]:not(.archived) .update-date`).forEach(el => {
            el.textContent = "確認中...";
            el.className = "update-date is-past";
            delete el.dataset.status; // ★ データ属性を削除してリセット
        });
    });

    await Promise.all(targetIds.map(async (targetId) => {
        const dateElements = document.querySelectorAll(`[data-target="${targetId}"]:not(.archived) .update-date`);
        try {
            // ★ HEADではなくGETで中身を取得するように変更
            const response = await fetch(`${folderPath}/${targetId}_${AppState.TARGET_DATE}.json`);
            if (!response.ok) throw new Error('Not Found');

            const data = await response.json();
            let isValid = false;

            // ★ データの実効性チェック（全ターゲット共通ルール）
            // factions内にそのID（all含む）のデータが存在するかチェック
            isValid = !!(data && data.factions && data.factions[targetId]);

            if (isValid) {
                dateElements.forEach(el => {
                    el.textContent = `更新: ${formattedDate}`;
                    el.className = isToday ? "update-date is-today" : "update-date is-past";
                    delete el.dataset.status;
                });
            } else {
                // ファイルはあっても中身が空ならエラー扱いにする
                throw new Error('Empty Content');
            }
        } catch (error) {
            dateElements.forEach(el => {
                el.textContent = "データ未取得";
                el.className = "update-date is-missing";
                el.dataset.status = "missing"; // ★ これにより詳細画面への遷移がブロックされます
            });
        }
    }));

// ★ ALLのリスト名テキストを動的に変更（🌍アイコンを保持して確実に書き換える）
    const allFactionNameEl = document.querySelector('[data-target="all"] .faction-name');
    if (allFactionNameEl) {
        if (AppState.TARGET_DATE === TODAY) {
            allFactionNameEl.textContent = "🌍 今日の情勢トピック";
        } else {
            const d = AppState.TARGET_DATE;
            allFactionNameEl.textContent = `🌍 ${d.substring(0,4)}/${d.substring(4,6)}/${d.substring(6,8)} の情勢トピック`;
        }
    }
}

export function updateTargetDate(dateString, source = 'calendar') {
    if (!dateString) return;
    AppState.TARGET_DATE = dateString.replace(/-/g, "");
    
    updateActiveButtons(source);
    updateDashboardUI();
}

export function setQuickDate(type) {
    const dateInput = document.getElementById('target-date');
    if (type === 'today') {
        dateInput.value = JST_TODAY.string;
        updateTargetDate(JST_TODAY.string, 'today');
    } else if (type === 'yesterday') {
        dateInput.value = JST_YESTERDAY.string;
        updateTargetDate(JST_YESTERDAY.string, 'yesterday');
    }
}

function updateActiveButtons(activeType) {
    const btnToday = document.getElementById('btn-today');
    const btnYesterday = document.getElementById('btn-yesterday');
    
    if (btnToday) btnToday.classList.remove('active');
    if (btnYesterday) btnYesterday.classList.remove('active');
    
    if (activeType === 'today' && btnToday) {
        btnToday.classList.add('active');
    } else if (activeType === 'yesterday' && btnYesterday) {
        btnYesterday.classList.add('active');
    } else if (activeType === 'calendar') {
        if (AppState.TARGET_DATE === TODAY && btnToday) btnToday.classList.add('active');
        if (AppState.TARGET_DATE === YESTERDAY && btnYesterday) btnYesterday.classList.add('active');
    }
}

window.updateTargetDate = updateTargetDate;
window.setQuickDate = setQuickDate;