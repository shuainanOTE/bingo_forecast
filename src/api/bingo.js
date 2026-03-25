// /api/bingo.js (Vercel Node.js Function)
import axios from 'axios';

export default async function handler(req, res) {
  try {
    // 這是台彩官方某個公開的 JSON 接口或是爬蟲目標
    const targetUrl = 'https://api.taiwanlottery.com.tw/TLCAPI/Lottery/BingoBingoResult?年月...'; 
    
    const response = await axios.get(targetUrl);
    
    // 設定回傳標頭，允許你的前端存取
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: '無法取得資料' });
  }
}