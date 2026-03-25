<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  Cpu,
  Flame,
  Snowflake,
  Link2,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  History,
  Target,
  Timer,
  Zap,
} from "lucide-vue-next";

// --- 1. 核心狀態 ---
const numbers = Array.from({ length: 80 }, (_, i) => i + 1);
const history = ref([]);
const activeTab = ref(1);
const timeLeft = ref(300);
const isLoading = ref(false);
const errorMsg = ref(null);

// --- 2. 數據抓取引擎 ---

// 抓取「最新一期」
async function fetchLatestOnly() {
  const targetUrl = "https://bingo-predictor.zeabur.app/api/v1/draws/latest";
  try {
    const response = await fetch(targetUrl);
    const data = await response.json();

    const p = parseInt(data.term);
    const latestDraw = {
      period: isNaN(p) ? Date.now() : p,
      numbers: Array.isArray(data.numbers)
        ? [...data.numbers].sort((a, b) => a - b)
        : [],
      //  優化日期顯示：只顯示 月-日 時:分
      date: `${(data.draw_date || "").slice(5)} ${data.draw_time || ""}`.trim(),
    };

    if (!history.value.some((h) => h.period === latestDraw.period)) {
      history.value = [latestDraw, ...history.value];
    }
  } catch (e) {
    console.error("更新最新期數失敗");
  }
}

// 抓取「50期歷史」(完整修復版)
async function fetchBingoData() {
  isLoading.value = true;
  const targetUrl = `https://bingo-predictor.zeabur.app/api/v1/draws?limit=50&t=${Date.now()}`;

  try {
    const response = await fetch(targetUrl);
    const result = await response.json();

    const rawList = Array.isArray(result) ? result : result.draws || [];

    if (rawList.length > 0) {
      history.value = rawList.map((item) => {
        const p = parseInt(item.term);
        return {
          period: isNaN(p) ? 0 : p,
          numbers: Array.isArray(item.numbers)
            ? [...item.numbers].sort((a, b) => a - b)
            : [],
          // ✨ 同步優化歷史紀錄的日期顯示
          date: `${(item.draw_date || "").slice(5)} ${item.draw_time || ""}`.trim(),
        };
      });
      console.log("✅ 真實數據載入成功，最新期:", history.value[0]?.period);
    } else {
      generateMockHistory();
    }
  } catch (error) {
    console.error("抓取失敗:", error);
    if (history.value.length === 0) generateMockHistory();
  } finally {
    isLoading.value = false;
  }
}

// 墊底用的模擬數據
const generateMockHistory = () => {
  const mock = [];
  for (let i = 0; i < 50; i++) {
    const draw = [...numbers]
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)
      .sort((a, b) => a - b);
    mock.push({ period: 115016000 - i, numbers: draw });
  }
  history.value = mock;
};

// --- 3. 數據分析引擎 ---
const stats = computed(() => {
  const totalDraws = history.value.length;
  const hits = {};
  const omission = {};
  const consecutive = {};
  const serials = []; // 新增：用來存放連號結果

  // 初始化所有號碼的統計值
  numbers.forEach((n) => {
    hits[n] = 0;
    omission[n] = -1;
    consecutive[n] = 0;
  });

  // 1. 計算出現次數與遺漏值
  history.value.forEach((entry, index) => {
    if (!entry.numbers) return;
    entry.numbers.forEach((n) => {
      hits[n]++;
      if (omission[n] === -1) omission[n] = index;
    });
  });

  // 2. 計算連莊 (連開) 次數
  numbers.forEach((n) => {
    if (omission[n] === -1) omission[n] = totalDraws;
    let count = 0;
    for (let i = 0; i < history.value.length; i++) {
      if (history.value[i]?.numbers?.includes(n)) count++;
      else break;
    }
    consecutive[n] = count;
  });

  // 3. 【核心修正】計算最新一期的「連號」 (例如 05, 06 同時出現)
  const lastDraw = history.value[0]?.numbers || [];
  if (lastDraw.length > 0) {
    // 因為 numbers 已經在 fetch 時排序過，所以可以直接比對相鄰數字
    for (let i = 0; i < lastDraw.length - 1; i++) {
      if (lastDraw[i + 1] - lastDraw[i] === 1) {
        if (!serials.includes(lastDraw[i])) serials.push(lastDraw[i]);
        if (!serials.includes(lastDraw[i + 1])) serials.push(lastDraw[i + 1]);
      }
    }
  }

  return {
    hits,
    omission,
    // 將連號資料丟回回傳物件，讓 HTML 的 v-for="n in stats.serials" 抓得到
    serials: serials.slice(0, 5),
    hotNumbers: [...numbers]
      .sort((a, b) => (hits[b] || 0) - (hits[a] || 0))
      .slice(0, 5),
    coldNumbers: [...numbers]
      .sort((a, b) => (omission[b] || 0) - (omission[a] || 0))
      .slice(0, 5),
    topConsecutive: [...numbers]
      .sort((a, b) => (consecutive[b] || 0) - (consecutive[a] || 0))
      .slice(0, 5),
    totalDraws,
  };
});

// --- 4. 升級版 AI 綜合權重預測邏輯 ---
const starCount = ref(3);
const aiPickedNumbers = ref([]);
const isCalculating = ref(false);

const aiPick = () => {
  if (isCalculating.value) return;
  isCalculating.value = true;
  aiPickedNumbers.value = [];

  setTimeout(() => {
    // 取得最新一期開獎號碼 (做為引力與伴隨分析的基準)
    const lastDraw = history.value[0]?.numbers || [];

    const scoredNumbers = numbers.map((n) => {
      let totalScore = 0;

      // === 模組 1：歷史與遺漏基底 (Mean Reversion) ===
      // 越久沒開分數越高 (均值回歸)
      totalScore += stats.value.omission[n] * 1.5;
      // 保留一點歷史熱度加成
      totalScore += stats.value.hits[n] * 0.5;

      // === 模組 2：伴隨號分析 (Markov Chain) ===
      // 如果這顆號碼在歷史上，常跟「上一期開出的號碼」一起出現，就加分
      if (lastDraw.length > 0) {
        let companionStrength = 0;
        history.value.forEach((entry) => {
          if (entry.numbers.includes(n)) {
            // 計算這期開獎中，有幾顆是上一期也有的
            companionStrength += entry.numbers.filter((x) =>
              lastDraw.includes(x),
            ).length;
          }
        });
        totalScore += companionStrength * 0.05; // 給予適當權重
      }

      // === 模組 3：區塊引力分析 (Spatial Analysis) ===
      // 80碼分8區 (1-10, 11-20...)
      const zone = Math.floor((n - 1) / 10);
      const lastDrawZoneCount = lastDraw.filter(
        (x) => Math.floor((x - 1) / 10) === zone,
      ).length;

      if (lastDrawZoneCount < 2) {
        totalScore += 15; // 上期這區塊開太少，這期強力回補 (大加分)
      } else if (lastDrawZoneCount > 4) {
        totalScore -= 10; // 上期這區塊開太多，這期冷卻 (扣分)
      }

      // === 模組 4：短期過熱防守 ===
      // 計算近 10 期的開出次數
      const recentHits = history.value
        .slice(0, 10)
        .filter((entry) => entry.numbers.includes(n)).length;
      if (recentHits >= 4) {
        totalScore -= 20; // 10期內開4次以上，短期超買必然下修，強力扣分
      }

      // === 模組 5：隨機擾動 (AI 變異數) ===
      const randomFactor = Math.random() * 5;
      totalScore += randomFactor;

      return { n, score: totalScore };
    });

    // 依照總分從高到低排序
    scoredNumbers.sort((a, b) => b.score - a.score);

    // 抓出前 N 名 (依照你選的星數)，並由小到大排序方便閱讀
    aiPickedNumbers.value = scoredNumbers
      .slice(0, starCount.value)
      .map((item) => item.n)
      .sort((a, b) => a - b);

    isCalculating.value = false;
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }, 400); // 400毫秒的模擬運算時間
};

// 視圖控制
const viewIndex = ref(0);
const changeViewIndex = (step) => {
  const newVal = viewIndex.value + step;
  if (newVal >= 0 && newVal < history.value.length) viewIndex.value = newVal;
};

// --- 5. 生命週期 ---
let timer;
onMounted(() => {
  fetchBingoData();
  timer = setInterval(() => {
    const now = new Date();
    const nextFiveMin = (5 - (now.getMinutes() % 5)) * 60 - now.getSeconds();
    timeLeft.value = nextFiveMin;
    if (nextFiveMin === 0) fetchLatestOnly();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div
    class="min-h-screen bg-black text-white font-sans overflow-x-hidden flex flex-col"
  >
    <header
      class="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 pt-4 pb-0 px-4"
    >
      <div class="flex justify-between items-center mb-4 max-w-xl mx-auto">
        <h1 class="text-xl font-black italic tracking-tighter text-white/90">
          BINGO
        </h1>
        <div class="flex items-center gap-2">
          <span
            v-if="errorMsg"
            class="text-[10px] text-rose-500 font-bold animate-pulse mr-1"
            >{{ errorMsg }}</span
          >

          <div
            @click="fetchBingoData"
            class="group flex items-center gap-2 bg-neutral-900 border border-white/10 px-3 py-1.5 rounded-full cursor-pointer hover:border-cyan-500/50 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            <div
              class="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-bold"
            >
              <Timer class="w-3.5 h-3.5" />
              {{ Math.floor(timeLeft / 60) }}:{{
                (timeLeft % 60).toString().padStart(2, "0")
              }}
            </div>
            <div class="w-[1px] h-3 bg-white/20"></div>
            <div
              :class="[
                'transition-all duration-700',
                isLoading
                  ? 'animate-spin text-cyan-400'
                  : 'text-white/40 group-hover:text-white',
              ]"
            >
              <Zap class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-between gap-2 max-w-xl mx-auto pb-3">
        <button
          @click="activeTab = 1"
          :class="[
            'flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5',
            activeTab === 1
              ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]'
              : 'bg-neutral-900 text-white/40',
          ]"
        >
          <Target class="w-4 h-4" /> AI 分析
        </button>
        <button
          @click="
            activeTab = 2;
            viewIndex = 0;
          "
          :class="[
            'flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5',
            activeTab === 2
              ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
              : 'bg-neutral-900 text-white/40',
          ]"
        >
          <History class="w-4 h-4" /> 歷史看盤
        </button>
        <button
          @click="activeTab = 3"
          :class="[
            'flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5',
            activeTab === 3
              ? 'bg-rose-500 text-black shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              : 'bg-neutral-900 text-white/40',
          ]"
        >
          <ListOrdered class="w-4 h-4" /> 歷史表格
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-xl mx-auto p-4 pb-10">
      <div
        v-if="activeTab === 1"
        class="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <div class="grid grid-cols-2 gap-3">
          <div
            class="bg-neutral-900/40 p-3 rounded-2xl border border-rose-500/20 flex flex-col items-center"
          >
            <Flame class="w-4 h-4 text-rose-500 mb-1" />
            <span
              class="text-[9px] font-black text-white/40 tracking-widest mb-1"
              >熱門 (TOP 5)</span
            >
            <div class="flex gap-1.5">
              <span
                v-for="n in stats.hotNumbers"
                :key="'h' + n"
                class="text-xs font-bold text-rose-400"
                >{{ n }}</span
              >
            </div>
          </div>
          <div
            class="bg-neutral-900/40 p-3 rounded-2xl border border-cyan-500/20 flex flex-col items-center"
          >
            <Snowflake class="w-4 h-4 text-cyan-400 mb-1" />
            <span
              class="text-[9px] font-black text-white/40 tracking-widest mb-1"
              >冷門 (TOP 5)</span
            >
            <div class="flex gap-1.5">
              <span
                v-for="n in stats.coldNumbers"
                :key="'c' + n"
                class="text-xs font-bold text-cyan-400"
                >{{ n }}</span
              >
            </div>
          </div>
          <div
            class="bg-neutral-900/40 p-3 rounded-2xl border border-emerald-500/20 flex flex-col items-center"
          >
            <Link2 class="w-4 h-4 text-emerald-400 mb-1" />
            <span
              class="text-[9px] font-black text-white/40 tracking-widest mb-1"
              >連號預測</span
            >
            <div class="flex gap-1.5">
              <span
                v-for="n in stats.serials"
                :key="'s' + n"
                class="text-xs font-bold text-emerald-400"
                >{{ n }}</span
              >
            </div>
          </div>
          <div
            class="bg-neutral-900/40 p-3 rounded-2xl border border-amber-500/20 flex flex-col items-center"
          >
            <Zap class="w-4 h-4 text-amber-400 mb-1" />
            <span
              class="text-[9px] font-black text-white/40 tracking-widest mb-1"
              >連莊中 (TOP 5)</span
            >
            <div class="flex gap-1.5">
              <span
                v-for="n in stats.topConsecutive"
                :key="'st' + n"
                class="text-xs font-bold text-amber-400"
                >{{ n }}</span
              >
            </div>
          </div>
        </div>

        <div
          class="bg-neutral-950 p-6 rounded-[2rem] border border-white/10 shadow-2xl mt-8"
        >
          <div class="flex justify-between items-center mb-6">
            <h2
              class="text-sm font-black tracking-widest uppercase flex items-center gap-2"
            >
              <Cpu class="w-5 h-5 text-cyan-400" /> AI 系統演算
            </h2>
            <select
              v-model="starCount"
              class="bg-neutral-900 text-white border border-white/20 rounded-lg px-3 py-1 text-sm font-bold outline-none focus:border-cyan-500"
            >
              <option v-for="s in 10" :key="s" :value="s">{{ s }} 星</option>
            </select>
          </div>

          <div
            class="flex flex-wrap gap-2 justify-center min-h-[60px] items-center bg-black/50 p-4 rounded-2xl border border-white/5"
          >
            <template v-if="isCalculating">
              <span
                class="text-cyan-400/50 font-mono animate-pulse tracking-widest text-sm"
                >CALCULATING...</span
              >
            </template>
            <template v-else-if="aiPickedNumbers.length > 0">
              <span
                v-for="n in aiPickedNumbers"
                :key="n"
                class="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-in zoom-in"
              >
                {{ n }}
              </span>
            </template>
            <template v-else>
              <span class="text-white/20 font-black text-sm tracking-widest"
                >數據分析中...</span
              >
            </template>
          </div>

          <button
            @click="aiPick"
            class="w-full mt-6 py-4 rounded-xl bg-white text-black font-black active:scale-95 transition-transform flex justify-center items-center gap-2"
          >
            <Cpu class="w-5 h-5" />
            {{ aiPickedNumbers.length === 0 ? "開始選號" : "重新運算" }}
          </button>
        </div>
      </div>

      <div
        v-else-if="activeTab === 2"
        class="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col"
      >
        <div
          class="flex justify-between items-center mb-6 bg-neutral-900/50 p-2 rounded-2xl border border-white/5"
        >
          <button
            @click="changeViewIndex(-1)"
            :disabled="viewIndex === 0"
            class="p-3 text-white/50 disabled:opacity-20 active:bg-white/10 rounded-xl"
          >
            <ChevronLeft class="w-6 h-6" />
          </button>
          <div class="text-center">
            <p
              class="text-[10px] text-cyan-400 font-black tracking-widest uppercase mb-1"
            >
              {{ viewIndex === 0 ? "LATEST (最新期)" : "HISTORY (歷史)" }}
            </p>
            <p class="text-xl font-mono font-black">
              #{{ history[viewIndex]?.period || "------" }}
            </p>
            <span class="text-[10px] font-medium text-white/50 mt-1">
              {{ history[viewIndex]?.date }}
            </span>
          </div>
          <button
            @click="changeViewIndex(1)"
            :disabled="viewIndex === history.length - 1"
            class="p-3 text-white/50 disabled:opacity-20 active:bg-white/10 rounded-xl"
          >
            <ChevronRight class="w-6 h-6" />
          </button>
        </div>

        <p class="text-center text-[10px] text-white/30 mb-4 tracking-widest">
          💡 在網格左右滑動切換期數
        </p>

        <div
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
          class="flex-1 touch-pan-y"
        >
          <div class="grid grid-cols-10 md:grid-cols-10 gap-x-2 gap-y-3 px-2">
            <div
              v-for="num in numbers"
              :key="num"
              class="w-full aspect-square max-w-[48px] mx-auto rounded-full text-base font-black border flex items-center justify-center transition-all duration-300"
              :class="
                history[viewIndex]?.numbers?.includes(num)
                  ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.6)] scale-105 z-10'
                  : 'bg-transparent border-white/10 text-white/30 scale-95'
              "
            >
              {{ num }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="activeTab === 3"
        class="flex-1 overflow-hidden flex flex-col p-2"
      >
        <div
          class="flex-1 overflow-auto rounded-xl border border-white/10 bg-neutral-900/20 relative custom-scrollbar"
        >
          <table class="border-collapse min-w-[1600px] table-fixed">
            <thead class="sticky top-0 bg-black z-30 text-white/40 font-mono">
              <tr>
                <th
                  class="w-[60px] border-b border-white/10 text-left sticky left-0 bg-black shadow-[4px_0_10px_rgba(0,0,0,0.8)] z-40"
                >
                  <span class="text-[10px] font-black text-cyan-400 p-2"
                    >期數</span
                  >
                </th>
                <th
                  v-for="n in 80"
                  :key="'th' + n"
                  class="w-[18px] p-1 border-b border-white/10 text-center border-l border-white/5 text-[9px] font-bold text-white/40"
                >
                  {{ n }}
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-white/5">
              <tr
                v-for="(entry, index) in history"
                :key="entry?.period || index"
                class="hover:bg-white/5 transition-colors group"
              >
                <td
                  class="pl-2 font-mono text-[10px] text-white/60 bg-neutral-950 sticky left-0 z-20 shadow-[4px_0_10px_rgba(0,0,0,0.8)] group-hover:text-white"
                >
                  <template v-if="entry && entry.period">
                    {{ String(entry.period).slice(-3) }}期
                  </template>
                  <template v-else> ---期 </template>
                </td>

                <td
                  v-for="n in 80"
                  :key="n"
                  :class="[
                    'p-0 border-l border-white/5 relative',
                    n % 10 === 0 ? 'bg-white/[0.02]' : '',
                  ]"
                >
                  <div class="flex justify-center items-center h-5">
                    <div
                      v-if="entry?.numbers?.includes(n)"
                      class="w-3.5 h-3.5 rounded-full bg-rose-500 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.9)] z-10 animate-in zoom-in duration-300"
                    >
                      <span
                        class="text-[7px] font-black text-black leading-none"
                        >{{ n }}</span
                      >
                    </div>
                    <div v-else class="w-1 h-1 rounded-full bg-white/5"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="py-2 flex justify-between px-4 items-center">
          <span class="text-[8px] text-white/20 tracking-[0.2em]"
            >⬅️ 左右滑動搜尋 1-80 號 ➡️</span
          >
          <div class="flex gap-2">
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-rose-500"></div>
              <span class="text-[8px] text-white/40">已開出</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-white/10"></div>
              <span class="text-[8px] text-white/40">未開出</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
body {
  background: black;
  overscroll-behavior-y: none;
}
</style>
