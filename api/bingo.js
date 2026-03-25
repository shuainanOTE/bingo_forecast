import axios from 'axios';

export default async function handler(req, res) {
  // 設定 CORS 標頭，防止前端抓不到
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  try {
    // 取得台灣今日日期 (YYYY-MM-DD)
    const now = new Date();
    const twDate = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).format(now).replace(/\//g, '-');

    const targetUrl = `https://api.taiwanlottery.com.tw/TLCAPI/Lottery/BingoBingoResult?period&month=${twDate.substring(0, 7)}&day=${twDate}`;

    console.log('正在請求台彩 API:', targetUrl);

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.taiwanlottery.com.tw/'
      },
      timeout: 10000 // 增加到 10 秒，台彩有時候反應慢
    });

    // 成功回傳
    return res.status(200).json(response.data);

  } catch (error) {
    console.error('後端出錯:', error.message);
    
    // 把錯誤噴給前端，我們才好抓蟲
    return res.status(500).json({ 
      success: false,
      message: "台彩連線失敗",
      error: error.message 
    });
  }
}