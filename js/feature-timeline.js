import { AppState, TODAY, JST_TODAY, YESTERDAY, JST_YESTERDAY } from './core.js';
import { updatePinIcons } from './feature-watchlist.js'; // ★追加

export async function updateDashboardUI() {
    const isToday = (AppState.TARGET_DATE === TODAY);
    const t = AppState.TARGET_DATE;
    const formattedDate = `${t.substring(0,4)}/${t.substring(4,6)}/${t.substring(6,8)}`;
    const folderPath = isToday ? 'data' : 'data/old';

    const itemElements = document.querySelectorAll('.original-list .list-item[data-target], #watchlist-container .list-item[data-target]');
    const targetIds = [...new Set(Array.from(itemElements).map(el => el.getAttribute('data-target')))];

    targetIds.forEach(id => {
        document.querySelectorAll(`[data-target="${id}"]:not(.archived) .update-date`).forEach(el => {
            el.textContent = "確認中...";
            el.className = "update-date is-past";
            el.style.color = ""; // リセット
            delete el.dataset.status;
        });
    });

    // ★重要: 日付が変わるたびに権限（鍵マーク）を再計算する
    updatePinIcons();

    await Promise.all(targetIds.map(async (targetId) => {
        const dateElements = document.querySelectorAll(`[data-target="${targetId}"]:not(.archived) .update-date`);
        try {
            const response = await fetch(`${folderPath}/${targetId}_${AppState.TARGET_DATE}.json`);
            if (!response.ok) throw new Error('Not Found');

            const data = await response.json();
            let isValid = !!(data && data.factions && data.factions[targetId]);

            if (isValid) {
                dateElements.forEach(el => {
                    el.textContent = `更新: ${formattedDate}`;
                    if (isToday) {
                        el.className = "update-date is-today";
                        el.style.color = ""; // 今日はデフォルト（白/グレー）
                    } else {
                        el.className = "update-date is-past";
                        el.style.color = "#2fb344"; // ★過去日でデータがある場合は緑文字
                    }
                    delete el.dataset.status;
                });
            } else {
                throw new Error('Empty Content');
            }
        } catch (error) {
            dateElements.forEach(el => {
                el.textContent = "データ未取得";
                el.className = "update-date is-missing";
                el.style.color = ""; // ★データ未取得時は白のまま
                el.dataset.status = "missing";
            });
        }
    }));

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