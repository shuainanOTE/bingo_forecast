import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. 設定台灣時間
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); 
    const year = twTime.getUTCFullYear();
    const month = String(twTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(twTime.getUTCDate()).padStart(2, '0');

    // 2. 🚨 關鍵修正：移除原本錯誤的 period& 參數，給出最純粹的日期請求
    const targetUrl = `https://api.taiwanlottery.com.tw/TLCAPI/Lottery/BingoBingoResult?month=${year}-${month}&day=${year}-${month}-${day}`;

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.taiwanlottery.com.tw/'
      },
      timeout: 10000
    });

    // 3. 成功取得官方真資料！
    if (response.data && response.data.content) {
      return res.status(200).json({
        success: true,
        content: response.data.content
      });
    } else {
      throw new Error('台彩回傳格式不符');
    }

  } catch (error) {
    // 4. 如果還是失敗，我們會看到 113888888，代表是 Vercel IP 被擋
    console.error('連線失敗:', error.message);
    return res.status(200).json({
      success: false,
      content: [
        { drawTerm: "113888888", resultNos: "01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20" }
      ]
    });
  }
}