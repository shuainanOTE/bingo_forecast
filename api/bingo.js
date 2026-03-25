import axios from 'axios';

export default async function handler(req, res) {
  // 1. 允許跨域 (CORS)，設定 OPTIONS 預檢請求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. 絕對時區校準：強制台灣時間 (UTC+8)
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const year = twTime.getUTCFullYear();
    const month = String(twTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(twTime.getUTCDate()).padStart(2, '0');
    
    // 組合台彩嚴格要求的日期格式
    const twDateStr = `${year}-${month}-${day}`; 
    const twMonthStr = `${year}-${month}`;

    // 3. 目標官方新版 API
    const targetUrl = `https://api.taiwanlottery.com.tw/TLCAPI/Lottery/BingoBingoResult?period&month=${twMonthStr}&day=${twDateStr}`;
    console.log('🚀 [2026 偽裝引擎啟動] 正在連線:', targetUrl);

    // 4. 2026 最新瀏覽器指紋偽裝
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.taiwanlottery.com.tw/',
        'Origin': 'https://www.taiwanlottery.com.tw',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      timeout: 12000 // 12秒黃金等待時間
    });

    // 5. 資料驗證與輸出
    if (response.data && response.data.content && response.data.content.length > 0) {
      console.log(`✅ 突圍成功！取得最新期數: ${response.data.content[0].drawTerm}`);
      
      // 直接把乾淨資料餵給你的前端
      return res.status(200).json({
        success: true,
        message: "資料同步成功",
        content: response.data.content
      });
    } else {
      throw new Error('台彩伺服器回傳空陣列（可能在換日或維護中）');
    }

  } catch (error) {
    console.error('❌ 偽裝引擎連線失敗:', error.message);
    
    // 6. 完美保底機制：如果真的被台彩拔網線，吐出擬真數據，確保你的 App 不會白屏死機
    return res.status(200).json({
      success: false,
      message: `連線異常 (${error.message})，啟用保底機制`,
      content: [
        { drawTerm: "113099999", resultNos: "01,05,08,12,15,22,28,33,35,42,48,55,59,62,68,71,73,75,78,80" },
        { drawTerm: "113099998", resultNos: "02,04,09,11,16,21,29,31,38,45,47,52,58,61,65,70,72,76,77,79" }
      ]
    });
  }
}