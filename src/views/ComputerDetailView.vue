<template>
  <AppLayout>
    <template #title>
      <button class="back-btn" @click="router.push('/computers')">← Компьютеры</button>
      <span style="color:var(--text2);margin:0 8px">/</span>
      <span>{{ detail?.pc_name || '...' }}</span>
    </template>
    <template #actions>
      <span v-if="detail" style="font-size:12px;color:var(--text2);font-family:var(--mono)">
        <span :class="autoRefresh ? 'dot-green' : 'dot-off'"></span>
        {{ autoRefresh ? 'Авто-обновление' : 'Пауза' }}
      </span>
      <button v-if="detail" class="btn btn-secondary btn-sm" @click="loadAll">↺ Обновить</button>
    </template>

    <!-- LOADING -->
    <div v-if="loading" class="loading-page"><div class="spin"></div> Загрузка данных ПК...</div>

    <template v-else-if="detail">
      <!-- HERO ROW -->
      <div class="hero">
        <div class="hero-left">
          <div class="hero-title-row">
            <h1 class="hero-title">{{ detail.pc_name }}</h1>
            <StatusBadge :status="detail.status" />
          </div>
          <div class="hero-meta">
            <span v-if="detail.inventory_number">🏷 {{ detail.inventory_number }}</span>
            <span v-if="detail.location">📍 {{ detail.location }}</span>
            <span>ID: {{ detail.id }}</span>
            <span>Алертов: {{ detail.alerts_count || 0 }}</span>
            <span v-if="detail.last_seen">{{ timeAgo(detail.last_seen) }}</span>
          </div>
        </div>
        <div class="big-prob" :style="{borderColor: probBorderColor}">
          <div class="big-prob-val" :style="{color: probColor(detail.status)}">
            {{ detail.failure_probability !== null ? pct(detail.failure_probability) : '—' }}
          </div>
          <div class="big-prob-label">Вероятность сбоя</div>
          <div class="big-prob-pred" :class="detail.prediction === 1 ? 'pred-bad' : 'pred-ok'">
            {{ detail.prediction === 1 ? '⚠ Сбой прогнозируется' : '✓ Состояние нормальное' }}
          </div>
        </div>
      </div>

      <!-- ── SHAP EXPLANATION (только при prediction=1) ───────────────── -->
      <ShapExplanation
        v-if="detail.prediction === 1 && detail.explanation && detail.explanation.length"
        :factors="detail.explanation"
      />

      <!-- METRIC CHIPS -->
      <div v-if="detail.metrics" class="chips-grid">
        <div v-for="m in chips" :key="m.key" class="chip" :class="{warn: m.warn}">
          <div class="chip-label">{{ m.label }}</div>
          <div class="chip-val">
            {{ m.value }}<span class="chip-unit">{{ m.unit }}</span>
          </div>
          <div v-if="m.warn" class="chip-warn-dot"></div>
        </div>
      </div>
      <div v-else class="no-metrics">Метрики ещё не поступали — запусти <code>monitor_loop.py</code> на этом ПК</div>

      <!-- CHARTS -->
      <div v-if="history.length > 0" class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Нагрузка системы</span>
            <span class="chart-sub">CPU · RAM · Диск (%)</span>
          </div>
          <div class="chart-wrap">
            <canvas ref="canvasLoad"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Температура и риск</span>
            <span class="chart-sub">°C · Вероятность (%)</span>
          </div>
          <div class="chart-wrap">
            <canvas ref="canvasRisk"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Сеть и питание</span>
            <span class="chart-sub">Задержка (ms) · Напряжение (V)</span>
          </div>
          <div class="chart-wrap">
            <canvas ref="canvasNet"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Uptime и ошибки</span>
            <span class="chart-sub">Uptime (дней) · Ошибок (шт)</span>
          </div>
          <div class="chart-wrap">
            <canvas ref="canvasUptime"></canvas>
          </div>
        </div>
      </div>
      <div v-else class="no-history">
        📊 История метрик пока пуста. После первого запуска агента графики появятся здесь.
      </div>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Chart,
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  Filler, Legend, Tooltip
} from 'chart.js'
import AppLayout from '@/components/AppLayout.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ShapExplanation from '@/components/ShapExplanation.vue'   // ← NEW
import { getComputer, getComputerHistory } from '@/api'
import { useToastStore } from '@/stores/toast'
import { timeAgo, pct, probColor, parseDate } from '@/utils'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend, Tooltip)

const route  = useRoute()
const router = useRouter()
const toast  = useToastStore()

const loading     = ref(true)
const detail      = ref(null)
const history     = ref([])
const autoRefresh = ref(true)

const canvasLoad   = ref(null)
const canvasRisk   = ref(null)
const canvasNet    = ref(null)
const canvasUptime = ref(null)

let chartLoad = null, chartRisk = null, chartNet = null, chartUptime = null
let timer = null

// ── computed ───────────────────────────────────────────────────
const probBorderColor = computed(() => {
  return { red: 'rgba(239,68,68,.4)', yellow: 'rgba(234,179,8,.4)', green: 'rgba(34,197,94,.3)' }[detail.value?.status] || 'var(--border)'
})

const chips = computed(() => {
  const m = detail.value?.metrics
  if (!m) return []
  return [
    { key:'cpu',    label:'CPU',          value: m.cpu_usage?.toFixed(1)      ?? '—', unit:'%',   warn: m.cpu_usage > 85 },
    { key:'ram',    label:'RAM',          value: m.ram_usage?.toFixed(1)      ?? '—', unit:'%',   warn: m.ram_usage > 85 },
    { key:'disk',   label:'Диск',         value: m.disk_usage?.toFixed(1)     ?? '—', unit:'%',   warn: m.disk_usage > 90 },
    { key:'temp',   label:'Температура',  value: m.temperature?.toFixed(0)    ?? '—', unit:'°C',  warn: m.temperature > 80 },
    { key:'fan',    label:'Кулер',        value: m.fan_speed?.toFixed(0)      ?? '—', unit:' RPM',warn: false },
    { key:'volt',   label:'Питание',      value: m.power_voltage?.toFixed(2)  ?? '—', unit:'V',   warn: false },
    { key:'net',    label:'Задержка',     value: m.network_latency?.toFixed(0)?? '—', unit:' ms', warn: m.network_latency > 200 },
    { key:'err',    label:'Ошибок',       value: m.errors_count               ?? '—', unit:' шт', warn: m.errors_count > 5 },
    { key:'uptime', label:'Uptime',       value: m.uptime_days?.toFixed(1)    ?? '—', unit:' дн', warn: false },
  ]
})

// ── data loading ───────────────────────────────────────────────
async function loadAll(silent = false) {
  if (!silent) loading.value = true
  try {
    const id = route.params.id
    const [pc, hist] = await Promise.all([
      getComputer(id),
      getComputerHistory(id)
    ])
    detail.value  = pc
    history.value = hist.reverse()
    if (!silent) loading.value = false
    await nextTick()
    buildCharts()
  } catch (e) {
    loading.value = false
    toast.show(e.message, 'error')
  }
}

// ── charts ─────────────────────────────────────────────────────
const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#64748b', font: { size: 11, family: "'JetBrains Mono'" }, boxWidth: 12, padding: 16 } },
    tooltip: {
      backgroundColor: 'var(--bg2, #0c1018)', borderColor: '#243358', borderWidth: 1,
      titleColor: '#e2e8f0', bodyColor: '#64748b',
      titleFont: { family: "'JetBrains Mono'", size: 11 },
      bodyFont: { family: "'JetBrains Mono'", size: 11 }, padding: 10
    }
  },
  scales: {
    x: { grid: { color: 'rgba(26,37,64,.7)' }, ticks: { color: '#334155', font: { size: 10 }, maxTicksLimit: 10 } },
    y: { grid: { color: 'rgba(26,37,64,.7)' }, ticks: { color: '#64748b', font: { size: 11 } } }
  }
}

function makeLabels() {
  return history.value.map(h => {
    const d = parseDate(h.time)
    return d ? d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) : ''
  })
}

function destroyAll() {
  ;[chartLoad, chartRisk, chartNet, chartUptime].forEach(c => c?.destroy())
  chartLoad = chartRisk = chartNet = chartUptime = null
}

function buildCharts() {
  destroyAll()
  if (!history.value.length) return
  const labels = makeLabels()
  const h = history.value

  if (canvasLoad.value) {
    chartLoad = new Chart(canvasLoad.value, {
      type: 'line', data: { labels, datasets: [
        { label: 'CPU %',  data: h.map(x => x.cpu),  borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.07)', fill:true, tension:.4, pointRadius:0, borderWidth:2 },
        { label: 'RAM %',  data: h.map(x => x.ram),  borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,.07)', fill:true, tension:.4, pointRadius:0, borderWidth:2 },
        { label: 'Диск %', data: h.map(x => x.disk), borderColor: '#64748b', backgroundColor: 'rgba(100,116,139,.04)', fill:true, tension:.4, pointRadius:0, borderWidth:1.5 },
      ]},
      options: { ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, min:0, max:100 } } }
    })
  }
  if (canvasRisk.value) {
    chartRisk = new Chart(canvasRisk.value, {
      type: 'line', data: { labels, datasets: [
        { label: 'Темп °C', data: h.map(x => x.temperature), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,.07)', fill:true, tension:.4, pointRadius:0, borderWidth:2, yAxisID:'y' },
        { label: 'Риск %',  data: h.map(x => x.probability !== null ? +(x.probability*100).toFixed(2) : null), borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.07)', fill:true, tension:.4, pointRadius:0, borderWidth:2, yAxisID:'y2' },
      ]},
      options: { ...CHART_OPTS, scales: { x: CHART_OPTS.scales.x, y: { ...CHART_OPTS.scales.y, position:'left', title:{display:true,text:'°C',color:'#64748b',font:{size:11}} }, y2: { type:'linear', position:'right', min:0, max:100, grid:{drawOnChartArea:false}, ticks:{color:'#64748b',font:{size:11},callback:v=>v+'%'} } } }
    })
  }
  if (canvasNet.value) {
    chartNet = new Chart(canvasNet.value, {
      type: 'line', data: { labels, datasets: [
        { label: 'Задержка ms', data: h.map(x => x.network_latency), borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,.07)', fill:true, tension:.4, pointRadius:0, borderWidth:2, yAxisID:'y' },
        { label: 'Питание V',   data: h.map(x => x.power_voltage),   borderColor:'#06b6d4', backgroundColor:'rgba(6,182,212,.07)', fill:true, tension:.4, pointRadius:0, borderWidth:2, yAxisID:'y2' },
      ]},
      options: { ...CHART_OPTS, scales: { x: CHART_OPTS.scales.x, y: { ...CHART_OPTS.scales.y, position:'left', title:{display:true,text:'ms',color:'#64748b',font:{size:11}} }, y2: { type:'linear', position:'right', grid:{drawOnChartArea:false}, ticks:{color:'#64748b',font:{size:11},callback:v=>v+'V'} } } }
    })
  }
  if (canvasUptime.value) {
    chartUptime = new Chart(canvasUptime.value, {
      type: 'line', data: { labels, datasets: [
        { label: 'Uptime дн', data: h.map(x => x.uptime_days?.toFixed(1)), borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,.07)', fill:true, tension:.4, pointRadius:0, borderWidth:2, yAxisID:'y' },
        { label: 'Ошибок шт', data: h.map(x => x.errors_count), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,.07)', fill:false, tension:.4, pointRadius:2, borderWidth:1.5, yAxisID:'y2' },
      ]},
      options: { ...CHART_OPTS, scales: { x: CHART_OPTS.scales.x, y: { ...CHART_OPTS.scales.y, position:'left', title:{display:true,text:'дней',color:'#64748b',font:{size:11}} }, y2: { type:'linear', position:'right', min:0, grid:{drawOnChartArea:false}, ticks:{color:'#64748b',font:{size:11}} } } }
    })
  }
}

onMounted(() => {
  loadAll()
  timer = setInterval(() => { if (autoRefresh.value) loadAll(true) }, 15000)
})
onUnmounted(() => { clearInterval(timer); destroyAll() })
</script>

<style scoped>
.back-btn { background:none;border:none;color:var(--text2);font-size:14px;cursor:pointer;padding:0 }
.back-btn:hover { color:var(--accent) }
.loading-page { display:flex;align-items:center;justify-content:center;gap:12px;padding:80px;color:var(--text2);font-size:14px }
.spin { width:18px;height:18px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0 }
@keyframes spin { to { transform:rotate(360deg) } }

.hero { display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start;margin-bottom:20px }
.hero-title-row { display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px }
.hero-title { font-size:26px;font-weight:700 }
.hero-meta { display:flex;flex-wrap:wrap;gap:14px;font-family:var(--mono);font-size:12px;color:var(--text2) }

.big-prob { background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:20px 28px;text-align:center;min-width:160px;transition:border-color .3s }
.big-prob-val { font-size:42px;font-weight:700;font-family:var(--mono);line-height:1;transition:color .3s }
.big-prob-label { font-size:11px;color:var(--text2);margin-top:6px;text-transform:uppercase;letter-spacing:.5px }
.big-prob-pred { font-size:11px;margin-top:8px;padding:3px 8px;border-radius:4px;font-weight:600 }
.pred-ok  { background:var(--green-d);color:var(--green) }
.pred-bad { background:var(--red-d);color:var(--red) }

.chips-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px }
.chip { background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;position:relative;transition:border-color .2s }
.chip.warn { border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.03) }
.chip-label { font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;font-weight:500;margin-bottom:6px }
.chip-val { font-size:22px;font-weight:700;font-family:var(--mono) }
.chip.warn .chip-val { color:var(--red) }
.chip-unit { font-size:12px;color:var(--text2);margin-left:3px;font-weight:400 }
.chip-warn-dot { position:absolute;top:10px;right:10px;width:8px;height:8px;background:var(--red);border-radius:50%;box-shadow:0 0 6px var(--red) }

.charts-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px }
.chart-card { background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:16px }
.chart-header { display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px }
.chart-title { font-size:13px;font-weight:600 }
.chart-sub { font-size:11px;color:var(--text2) }
.chart-wrap { height:180px;position:relative }
.chart-wrap canvas { width:100%!important;height:100%!important }

.no-metrics,.no-history { background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:30px;text-align:center;color:var(--text2);font-size:13px;margin-bottom:20px }
.no-metrics code,.no-history code { background:var(--bg4);padding:1px 6px;border-radius:3px;font-family:var(--mono);font-size:12px;color:var(--accent-h) }

.btn { display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:var(--r);font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s }
.btn-secondary { background:var(--bg3);color:var(--text);border:1px solid var(--border2) }
.btn-secondary:hover { border-color:var(--accent);color:var(--accent) }
.btn-sm { padding:6px 12px }
.dot-green { display:inline-block;width:7px;height:7px;background:var(--green);border-radius:50%;box-shadow:0 0 6px var(--green);margin-right:5px;animation:blink 2s infinite }
.dot-off { display:inline-block;width:7px;height:7px;background:var(--text3);border-radius:50%;margin-right:5px }
@keyframes blink { 0%,100%{opacity:1}50%{opacity:.4} }

@media(max-width:900px) {
  .hero { grid-template-columns:1fr }
  .big-prob { display:none }
  .chips-grid { grid-template-columns:repeat(2,1fr) }
  .charts-grid { grid-template-columns:1fr }
}
</style>
