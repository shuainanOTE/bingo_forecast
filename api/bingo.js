import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // 💡 修正日期抓取邏輯，確保在 Vercel 雲端伺服器 (UTC) 也能抓到台灣正確日期
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 強制轉成 UTC+8
    const year = twTime.getUTCFullYear();
    const month = String(twTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(twTime.getUTCDate()).padStart(2, '0');
    
    const dateStr = `${year}-${month}-${day}`;
    const monthStr = `${year}-${month}`;

    const targetUrl = `https://api.taiwanlottery.com.tw/TLCAPI/Lottery/BingoBingoResult?period&month=${monthStr}&day=${dateStr}`;

    console.log('Fetching:', targetUrl);

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.taiwanlottery.com.tw/'
      },
      timeout: 10000
    });

    // 如果台彩回傳成功
    if (response.data) {
      return res.status(200).json(response.data);
    } else {
      throw new Error('台彩回傳空數據');
    }

  } catch (error) {
    // 🚩 這裡很重要：如果失敗，我們回傳一組「模擬數據」給前端測試，
    // 這樣你的 App 至少不會白屏，且能確認前端解析邏輯是通的。
    console.error('API Error:', error.message);
    
    return res.status(200).json({
      success: false,
      message: "目前無法連線台彩，顯示模擬數據中",
      content: [
        { drawTerm: "113000001", resultNos: "01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20" }
      ]
    });
  }
}