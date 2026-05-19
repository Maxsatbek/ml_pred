<template>
  <AppLayout title="Профиль">
    <div class="profile-grid">
      <!-- LEFT: account info -->
      <div class="card">
        <div class="card-head"><span class="card-title">Данные аккаунта</span></div>
        <div class="card-body">
          <div v-if="loading" class="loading"><div class="spin"></div></div>
          <template v-else-if="me">
            <div class="row"><span class="row-label">Пользователь</span><span class="row-val">{{ me.username }}</span></div>
            <div class="row"><span class="row-label">User ID</span><span class="row-val mono">#{{ me.user_id }}</span></div>
            <div class="row">
              <span class="row-label">Роль</span>
              <span class="row-val">{{ me.is_admin ? '👑 Администратор' : '👤 Пользователь' }}</span>
            </div>
            <div class="row">
              <span class="row-label">Telegram</span>
              <span :class="me.telegram_linked ? 'tg-yes' : 'tg-no'">
                {{ me.telegram_linked ? `✓ Привязан` : '✕ Не привязан' }}
              </span>
            </div>
          </template>
        </div>
      </div>

      <!-- RIGHT: telegram -->
      <div class="card">
        <div class="card-head"><span class="card-title">Уведомления Telegram</span></div>
        <div class="card-body">
          <div v-if="loading" class="loading"><div class="spin"></div></div>
          <template v-else-if="me?.telegram_linked">
            <div class="tg-linked-block">
              <div class="tg-ok-icon">✓</div>
              <div>
                <div class="tg-ok-title">Telegram привязан</div>
                <div class="tg-ok-sub">Уведомления при вероятности сбоя ≥{{ Math.round((me.alert_threshold || 0.85) * 100) }}%</div>
              </div>
            </div>
            <div class="tg-info">Chat ID: <code>{{ me.telegram_id }}</code></div>
            <button class="btn btn-danger btn-sm" @click="unlink">Отвязать Telegram</button>
          </template>
          <template v-else-if="me">
            <p class="tg-desc">Привяжи Telegram чтобы получать уведомления при высоком риске сбоя ПК.</p>
            <div class="steps">
              <div class="step"><span class="step-num">1</span><span>Открой бота и напиши <code>/start</code></span></div>
              <div class="step"><span class="step-num">2</span><span>Скопируй свой JWT токен и отправь боту:</span></div>
            </div>
            <div class="token-block">
              <div class="token-val">{{ authToken }}</div>
              <button class="btn-copy" @click="copyToken">{{ copied ? '✓ Скопировано' : 'Копировать' }}</button>
            </div>
            <div class="step" style="margin:10px 0 14px"><span class="step-num">3</span><span>Бот ответит подтверждением привязки</span></div>
            <a class="btn-tg" href="https://t.me/Monitoring_PC_prediction_bot" target="_blank">
              ✈ Открыть @Monitoring_PC_prediction_bot
            </a>
          </template>
        </div>
      </div>
    </div>

    <!-- ── БЛОК НАСТРОЙКИ ПОРОГА УВЕДОМЛЕНИЙ ──────────────────── -->
    <div class="card threshold-card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">🔔 Порог уведомлений</span>
        <span class="card-sub">При какой вероятности отправлять Telegram-сообщение</span>
      </div>
      <div class="card-body" v-if="!loading && me">
        <div class="threshold-wrap">
          <!-- Описание -->
          <p class="threshold-desc">
            Уведомление будет отправлено, когда ИИ-модель определит вероятность сбоя
            <strong>{{ sliderLabel }}% или выше</strong>.
            Чем ниже порог — тем чаще приходят уведомления.
          </p>

          <!-- Слайдер -->
          <div class="slider-row">
            <span class="slider-min">10%</span>
            <div class="slider-wrap">
              <input
                type="range"
                min="10" max="99" step="1"
                v-model.number="thresholdPct"
                class="slider"
                :style="sliderStyle"
              />
              <div class="slider-ticks">
                <span v-for="t in [25,50,75]" :key="t" class="tick" :style="{left: ((t-10)/89*100)+'%'}">{{ t }}%</span>
              </div>
            </div>
            <span class="slider-max">99%</span>
          </div>

          <!-- Визуальная индикация зоны -->
          <div class="threshold-zones">
            <div class="zone zone-green" :style="{flex: thresholdPct - 10}">
              <span>Тихий режим</span>
            </div>
            <div class="zone zone-yellow" :style="{flex: Math.max(0, Math.min(30, thresholdPct - 40))}">
            </div>
            <div class="zone zone-red" :style="{flex: Math.max(0, 99 - thresholdPct)}">
              <span>Уведомления</span>
            </div>
            <div class="zone-marker" :style="{left: ((thresholdPct-10)/89*100)+'%'}">
              <div class="zone-marker-line"></div>
              <div class="zone-marker-label">{{ thresholdPct }}%</div>
            </div>
          </div>

          <!-- Пресеты быстрого выбора -->
          <div class="presets">
            <span class="presets-label">Быстрый выбор:</span>
            <button
              v-for="p in presets" :key="p.value"
              class="preset-btn"
              :class="{ active: thresholdPct === p.value }"
              @click="thresholdPct = p.value"
            >{{ p.label }}</button>
          </div>

          <!-- Кнопка сохранения -->
          <div class="threshold-footer">
            <span class="current-val">
              Текущий порог: <strong>{{ Math.round((me.alert_threshold || 0.85) * 100) }}%</strong>
              <span v-if="thresholdPct !== Math.round((me.alert_threshold || 0.85) * 100)" class="changed-hint">
                → будет <strong>{{ thresholdPct }}%</strong>
              </span>
            </span>
            <button
              class="btn btn-primary"
              :disabled="savingThreshold || thresholdPct === Math.round((me.alert_threshold || 0.85) * 100)"
              @click="saveThreshold"
            >
              <span v-if="savingThreshold" class="spin-sm"></span>
              {{ savingThreshold ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>
      <div v-else-if="loading" class="card-body"><div class="loading"><div class="spin"></div></div></div>
    </div>

    <!-- MY COMPUTERS -->
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Мои компьютеры</span>
        <span class="card-sub">User ID #{{ me?.user_id }}</span>
      </div>
      <div class="card-body">
        <div v-if="loading" class="loading"><div class="spin"></div></div>
        <div v-else-if="!myComputers.length" class="empty">
          Ты ещё не добавил ни одного ПК.
          <router-link to="/computers" class="link"> Добавить ПК →</router-link>
        </div>
        <div v-else class="pc-list">
          <div v-for="pc in myComputers" :key="pc.id" class="pc-row" @click="router.push('/computers/'+pc.id)">
            <div>
              <div class="pc-name">{{ pc.pc_name }}</div>
              <div class="pc-meta">{{ pc.location || '—' }} · {{ pc.inventory_number || 'б/н' }}</div>
            </div>
            <StatusBadge :status="pc.status" />
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useComputersStore } from '@/stores/computers'
import { useToastStore } from '@/stores/toast'
import { unbindTelegram, updateMySettings } from '@/api'
import { copyToClipboard } from '@/utils'

const router = useRouter()
const auth = useAuthStore()
const computersStore = useComputersStore()
const toast = useToastStore()

const loading        = ref(true)
const copied         = ref(false)
const savingThreshold = ref(false)

const authToken = computed(() => auth.token)
const me        = computed(() => auth.me)

// Порог в процентах (10–99), синхронизируется с me.alert_threshold
const thresholdPct = ref(85)

// Обновляем слайдер когда загружается me
const sliderLabel = computed(() => thresholdPct.value)

// Стиль слайдера: закрашиваем заполненную часть
const sliderStyle = computed(() => {
  const pct = ((thresholdPct.value - 10) / (99 - 10)) * 100
  return {
    background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg4) ${pct}%, var(--bg4) 100%)`
  }
})

const presets = [
  { label: '70% — Раннее предупреждение', value: 70 },
  { label: '85% — Рекомендуется',         value: 85 },
  { label: '92% — Только критичное',      value: 92 },
]

const myComputers = computed(() => {
  const myId = Number(me.value?.user_id)
  if (!myId) return []
  return computersStore.list.filter(c => Number(c.owner_id) === myId)
})

async function unlink() {
  try {
    await unbindTelegram()
    toast.show('Telegram отвязан', 'success')
    await auth.fetchMe()
  } catch { toast.show('Ошибка', 'error') }
}

function copyToken() {
  copyToClipboard(authToken.value).then(() => {
    copied.value = true
    toast.show('Токен скопирован', 'success')
    setTimeout(() => copied.value = false, 2000)
  })
}

async function saveThreshold() {
  savingThreshold.value = true
  try {
    const val = thresholdPct.value / 100   // переводим % → дробь (0.85)
    await updateMySettings(val)
    await auth.fetchMe()                   // обновляем me в сторе
    toast.show(`Порог установлен: ${thresholdPct.value}%`, 'success')
  } catch (e) {
    toast.show(e.message || 'Ошибка сохранения', 'error')
  }
  savingThreshold.value = false
}

onMounted(async () => {
  await Promise.all([auth.fetchMe(), computersStore.refresh()])
  // Инициализируем слайдер из БД
  if (me.value?.alert_threshold !== undefined) {
    thresholdPct.value = Math.round(me.value.alert_threshold * 100)
  }
  loading.value = false
})
</script>

<style scoped>
.profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r)}
.card-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.card-title{font-size:15px;font-weight:600}
.card-sub{font-size:12px;color:var(--text2)}
.card-body{padding:18px}
.row{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border)}
.row:last-child{border-bottom:none}
.row-label{font-size:12px;color:var(--text2);font-weight:500}
.row-val{font-size:13px}.mono{font-family:var(--mono)}
.tg-yes{color:var(--green);font-family:var(--mono);font-size:12px}
.tg-no{color:var(--text3);font-size:13px}
.tg-linked-block{display:flex;align-items:center;gap:14px;background:var(--green-d);border:1px solid rgba(34,197,94,.2);border-radius:var(--r);padding:14px;margin-bottom:14px}
.tg-ok-icon{width:32px;height:32px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0}
.tg-ok-title{font-weight:600;color:var(--green);margin-bottom:2px}
.tg-ok-sub{font-size:12px;color:var(--text2)}
.tg-info{font-size:12px;color:var(--text2);margin-bottom:14px}
.tg-info code{font-family:var(--mono);background:var(--bg4);padding:1px 5px;border-radius:3px}
.tg-desc{font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.6}
.steps{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.step{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text2);line-height:1.5}
.step-num{width:20px;height:20px;background:var(--accent-g);border:1px solid rgba(59,130,246,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent);flex-shrink:0;margin-top:1px}
.step code{background:var(--bg4);padding:1px 5px;border-radius:3px;font-family:var(--mono);font-size:12px;color:var(--accent-h)}
.token-block{background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r);padding:12px}
.token-val{font-family:var(--mono);font-size:11px;word-break:break-all;color:var(--text);line-height:1.5;margin-bottom:8px}
.btn-copy{background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:12px;padding:5px 12px;border-radius:4px;cursor:pointer;transition:all .2s}
.btn-copy:hover{border-color:var(--accent);color:var(--accent)}
.btn-tg{display:inline-flex;align-items:center;gap:8px;background:#229ed9;color:#fff;padding:9px 16px;border-radius:var(--r);font-size:13px;font-weight:600;text-decoration:none;transition:opacity .2s}
.btn-tg:hover{opacity:.85}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:9px 18px;border-radius:var(--r);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s}
.btn-sm{padding:7px 14px;font-size:13px}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover:not(:disabled){background:var(--accent-h)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-danger{background:var(--red-d);color:var(--red);border:1px solid rgba(239,68,68,.3)}.btn-danger:hover{background:var(--red);color:#fff}
.loading{display:flex;justify-content:center;padding:30px}
.spin{width:18px;height:18px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
.spin-sm{width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.empty{color:var(--text2);font-size:13px;text-align:center;padding:20px}
.link{color:var(--accent)}
.pc-list{display:flex;flex-direction:column}
.pc-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:all .1s;border-radius:4px}
.pc-row:last-child{border-bottom:none}
.pc-row:hover{background:var(--bg3);padding:12px 10px;margin:0 -10px}
.pc-name{font-weight:600;font-size:14px}
.pc-meta{font-size:11px;color:var(--text2);font-family:var(--mono);margin-top:2px}

/* ── THRESHOLD BLOCK ─────────────────────────────────────── */
.threshold-wrap { display:flex; flex-direction:column; gap:16px }
.threshold-desc { font-size:13px; color:var(--text2); line-height:1.6 }
.threshold-desc strong { color:var(--text) }

.slider-row { display:flex; align-items:center; gap:12px }
.slider-min,.slider-max { font-family:var(--mono); font-size:11px; color:var(--text3); flex-shrink:0; width:32px }
.slider-max { text-align:right }
.slider-wrap { flex:1; position:relative; padding-bottom:20px }
.slider {
  width:100%; height:6px; border-radius:3px; outline:none;
  -webkit-appearance:none; appearance:none; cursor:pointer;
  transition:background .2s;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance:none; appearance:none;
  width:18px; height:18px; border-radius:50%;
  background:var(--accent); border:2px solid var(--bg2);
  box-shadow:0 0 0 2px var(--accent), 0 2px 6px rgba(59,130,246,.4);
  cursor:pointer; transition:transform .15s;
}
.slider::-webkit-slider-thumb:hover { transform:scale(1.2) }
.slider::-moz-range-thumb {
  width:18px; height:18px; border-radius:50%;
  background:var(--accent); border:2px solid var(--bg2);
  box-shadow:0 0 0 2px var(--accent); cursor:pointer;
}
.slider-ticks { position:absolute; bottom:0; left:0; right:0; display:flex }
.tick {
  position:absolute; transform:translateX(-50%);
  font-size:10px; color:var(--text3); font-family:var(--mono);
}

.threshold-zones {
  position:relative; display:flex; height:28px; border-radius:4px; overflow:visible;
  border:1px solid var(--border); overflow:hidden;
}
.zone { display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; letter-spacing:.5px; text-transform:uppercase; transition:flex .3s; min-width:0; overflow:hidden }
.zone span { white-space:nowrap; overflow:hidden }
.zone-green { background:rgba(34,197,94,.08); color:var(--green) }
.zone-yellow { background:rgba(234,179,8,.08) }
.zone-red   { background:rgba(239,68,68,.08); color:var(--red) }
.zone-marker {
  position:absolute; top:0; bottom:0;
  display:flex; flex-direction:column; align-items:center;
  pointer-events:none; transition:left .2s;
  transform:translateX(-50%);
}
.zone-marker-line { width:2px; height:100%; background:var(--accent); flex-shrink:0 }
.zone-marker-label {
  position:absolute; top:-20px;
  background:var(--accent); color:#fff;
  font-size:10px; font-weight:700; font-family:var(--mono);
  padding:1px 6px; border-radius:3px; white-space:nowrap;
}

.presets { display:flex; align-items:center; gap:8px; flex-wrap:wrap }
.presets-label { font-size:12px; color:var(--text2); flex-shrink:0 }
.preset-btn {
  background:var(--bg3); border:1px solid var(--border2);
  color:var(--text2); font-size:12px; padding:5px 12px;
  border-radius:var(--r); cursor:pointer; transition:all .2s;
}
.preset-btn:hover { border-color:var(--accent); color:var(--accent) }
.preset-btn.active { background:var(--accent-g); border-color:var(--accent); color:var(--accent); font-weight:600 }

.threshold-footer {
  display:flex; align-items:center; justify-content:space-between;
  padding-top:14px; border-top:1px solid var(--border);
}
.current-val { font-size:13px; color:var(--text2) }
.current-val strong { color:var(--text) }
.changed-hint { color:var(--accent); margin-left:4px }

@media(max-width:768px){.profile-grid{grid-template-columns:1fr}}
@media(max-width:600px){.threshold-footer{flex-direction:column;gap:12px;align-items:flex-start}}
</style>
