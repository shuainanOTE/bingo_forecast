// src/constants.js
export const BINGO_CONFIG = {
  TOTAL_NUMBERS: 80,
  DRAW_COUNT: 20,
  MAX_SELECT: 10,
  DRAW_INTERVAL: 300, // 5 分鐘
  PAYOUT_TABLE: { 10: 5000000, 9: 250000, 8: 25000, 7: 2500, 6: 250, 5: 25, 0: 0 },
  
  // 數據分析專屬色 (霓虹 Cyber 風)
  THEME: {
    HOT: 'text-rose-400 border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    COLD: 'text-cyan-300/40 border-cyan-500/10 bg-cyan-500/5',
    AI_PICK: 'text-black bg-gradient-to-br from-cyan-400 to-blue-500 border-white shadow-[0_0_25px_rgba(34,211,238,0.6)] scale-110 z-20',
    NORMAL: 'text-white/20 border-white/5 bg-neutral-900/40'
  }
}