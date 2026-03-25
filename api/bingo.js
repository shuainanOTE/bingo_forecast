const axios = require('axios'); // 改用 require 確保相容性

module.exports = async (req, res) => {
  try {
    const now = new Date();
    const twDate = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).format(now).replace(/\//g, '-');

    const targetUrl = `https://api.taiwanlottery.com.tw/TLCAPI/Lottery/BingoBingoResult?period&month=${twDate.substring(0, 7)}&day=${twDate}`;

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.taiwanlottery.com.tw/'
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};