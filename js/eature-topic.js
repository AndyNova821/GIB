import { AppState, TODAY } from './core.js';

export async function renderDailyTopic() {
    const contentEl = document.getElementById('topic-content');
    if (!contentEl) return;

    // 取得中のプレースホルダー
    contentEl.innerHTML = '<p style="color: #8b949e; font-size: 0.9rem;">情報をデコード中...</p>';

    const folderPath = (AppState.TARGET_DATE === TODAY) ? 'data' : 'data/old';
    const filePath = `${folderPath}/all_${AppState.TARGET_DATE}.json`;

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Topic data not found');

        const rawData = await response.json();
        
        // 次のフェーズ4で定義する「summary」にマークダウンが入る想定
        if (rawData && rawData.summary) {
            const formattedText = marked.parse(rawData.summary);
            contentEl.innerHTML = formattedText;
        } else {
            throw new Error('Invalid topic data structure');
        }
    } catch (error) {
        // ファイルがない、または未生成の場合の表示
        contentEl.innerHTML = `<p style="color: #8b949e; font-size: 0.9rem; font-style: italic;">※指定日の全体要約データは未着電、またはアーカイブされていません。</p>`;
    }
}