import axios from 'axios';

export default async function handler(req, res) {
  try {
    // 1. 自動取得台灣今天的日期 (格式：YYYY-MM-DD)
    const now = new Date();
    const twDate = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).format(now).replace(/\//g, '-');

    // 2. 正確的台彩 API 網址 (範例為當日賓果結果)
    const targetUrl = `https://api.taiwanlottery.com.tw/TLCAPI/Lottery/BingoBingoResult?period&month=${twDate.substring(0, 7)}&day=${twDate}`;

    // 3. 偽裝瀏覽器 Header，防止被擋
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.taiwanlottery.com.tw/'
      },
      timeout: 5000 // 5秒超時防止卡死
    });

    // 4. 設定 CORS 標頭，允許你的 Vercel 前端存取
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    // 5. 回傳資料
    res.status(200).json(response.data);
    
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ 
      error: '無法取得資料', 
      message: error.message 
    });
  }
}