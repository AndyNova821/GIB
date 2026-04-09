// js/core.js
export const FLAGS = {
    all: "🌍", us: "🇺🇸", jp: "🇯🇵", israel: "🇮🇱", iran: "🇮🇷", ukraine: "🇺🇦", russia: "🇷🇺",
    china: "🇨🇳", korea: "🇰🇷", sea: "🌏", oceania: "🇦🇺", eu: "🇪🇺", africa: "🌍", sa: "🌎",
    un: "🇺🇳", nato: "🛡️", other_orgs: "🌐"
};

export function getJSTDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Tokyo', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    });
    const formatted = formatter.format(date);
    return {
        string: formatted,
        id: formatted.replace(/-/g, "")
    };
}

export const JST_TODAY = getJSTDate();
export const TODAY = JST_TODAY.id;
export const JST_YESTERDAY = getJSTDate(-1);
export const YESTERDAY = JST_YESTERDAY.id;

export const AppState = {
    TARGET_DATE: TODAY,
    CURRENT_VIEW_TARGET: "",
    CURRENT_VIEW_DATE: ""
};

// トースト通知機能
export function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `gib-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // アニメーション完了後（約2.5秒）にDOMから削除
    setTimeout(() => {
        toast.remove();
    }, 2500);
}
window.showToast = showToast;