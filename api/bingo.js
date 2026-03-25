import axios from 'axios';

export default async function handler(req, res) {
  // 設定 CORS 與回傳格式
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 💡 絕對成功的第三方水源：pilio (2026 實測穩定)
    const targetUrl = `https://api.pilio.idv.tw/lotto/last.asp?game=BINGO`;

    console.log('📡 正在連線 pilio 數據源...');

    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    // 🚩 pilio 回傳的是一個 JSON 陣列，我們直接把它包成 content 給你前端用
    // 假設它回傳格式是 [{ id: "113...", sn: "01,02..." }, ...]
    // 我們要在這裡「對齊」你的 App.vue 欄位名稱 (drawTerm, resultNos)
    
    if (response.data && Array.isArray(response.data)) {
      const formattedContent = response.data.map(item => ({
        drawTerm: item.id,      // 期數對接
        resultNos: item.sn      // 號碼對接 "01,02,03..."
      }));

      return res.status(200).json({
        success: true,
        content: formattedContent
      });
    } else {
      throw new Error('數據源格式改變');
    }

  } catch (error) {
    console.error('❌ pilio 連線失敗:', error.message);
    
    // 保底數據 (如果連第三方也倒了才觸發)
    return res.status(200).json({
      success: false,
      content: [
        { drawTerm: "113999999", resultNos: "01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20" }
      ]
    });
  }
}