<template>
  <AppLayout title="Компьютеры">
    <template #actions>
      <input class="search" v-model="search" placeholder="Поиск...">
      <button class="btn btn-sim" @click="showSimModal = true">🔬 Симуляция</button>
      <button class="btn btn-primary" @click="showModal = true">+ Добавить ПК</button>
    </template>

    <div class="card">
      <div class="card-head">
        <span class="card-title">Все компьютеры</span>
        <span class="card-sub">{{ store.list.length }} устройств</span>
      </div>
      <div v-if="store.loading && !store.list.length" class="loading">
        <div class="spin"></div> Загрузка...
      </div>
      <div v-else-if="!filtered.length" class="empty">Нет данных</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Компьютер</th>
              <th>Инв. номер</th>
              <th>Аудитория</th>
              <th>Статус</th>
              <th>Вероятность</th>
              <th>Активность</th>
              <th style="text-align:right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pc in filtered" :key="pc.id" @click="router.push('/computers/'+pc.id)">
              <td>
                <div class="pc-name">
                  {{ pc.pc_name }}
                  <span v-if="pc.pc_name.startsWith('SIM-')" class="sim-tag">SIM</span>
                </div>
              </td>
              <td class="mono-cell">{{ pc.inventory_number || '—' }}</td>
              <td class="mono-cell">{{ pc.location || '—' }}</td>
              <td><StatusBadge :status="pc.status" /></td>
              <td><ProbBar :value="pc.failure_probability" :status="pc.status" /></td>
              <td class="mono-cell">{{ timeAgo(pc.last_seen) }}</td>
              <td style="text-align:right" @click.stop>
                <button class="btn-icon" @click="editPc = pc; showModal = true">✎</button>
                <button class="btn-icon danger" @click="delTarget = pc">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PcModal v-if="showModal" :editing="editPc" @close="showModal=false;editPc=null" @done="onDone" />

    <!-- Удаление одного ПК -->
    <Teleport to="body">
      <div v-if="delTarget" class="overlay" @click.self="delTarget=null">
        <div class="del-modal">
          <div class="del-title">Удалить ПК?</div>
          <p>«<strong>{{ delTarget.pc_name }}</strong>» и все его метрики будут удалены.</p>
          <div class="del-actions">
            <button class="btn btn-secondary" @click="delTarget=null">Отмена</button>
            <button class="btn btn-danger" @click="doDelete">Удалить</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Модальное окно симуляции -->
    <Teleport to="body">
      <div v-if="showSimModal" class="overlay" @click.self="closeSimModal">
        <div class="sim-modal">
          <div class="sim-header">
            <span class="sim-title">🔬 Симуляция нагрузки</span>
            <button class="modal-close" @click="closeSimModal">×</button>
          </div>

          <div class="sim-body">
            <!-- Начальное состояние -->
            <template v-if="simState === 'idle'">
              <p class="sim-desc">
                Создаёт тестовые ПК на основе реальных данных из CSV-файла.
                Каждый ПК получит случайные метрики, и ML-модель сделает прогноз поломки.
              </p>
              <div class="sim-count-row">
                <label>Количество ПК:</label>
                <div class="count-controls">
                  <button class="count-btn" @click="simCount = Math.max(1, simCount - 5)">−5</button>
                  <span class="count-val">{{ simCount }}</span>
                  <button class="count-btn" @click="simCount = Math.min(100, simCount + 5)">+5</button>
                </div>
              </div>
              <div class="sim-presets">
                <button
                  v-for="n in [10, 20, 30, 50]"
                  :key="n"
                  class="preset-btn"
                  :class="{ active: simCount === n }"
                  @click="simCount = n"
                >{{ n }} ПК</button>
              </div>

              <!-- Кнопка очистки если есть SIM-ПК -->
              <div v-if="hasSimPcs" class="cleanup-hint">
                <span>⚠ В системе уже есть SIM-ПК</span>
                <button class="btn-cleanup" @click="doCleanup" :disabled="cleaning">
                  <span v-if="cleaning" class="spin-sm"></span>
                  {{ cleaning ? 'Удаление...' : '🗑 Удалить все SIM-ПК' }}
                </button>
              </div>
            </template>

            <!-- Загрузка -->
            <template v-else-if="simState === 'loading'">
              <div class="sim-loading">
                <div class="spin-lg"></div>
                <div class="sim-loading-text">Создаём {{ simCount }} ПК и запускаем ML-анализ...</div>
                <div class="sim-loading-sub">Это может занять 10–30 секунд</div>
              </div>
            </template>

            <!-- Результат -->
            <template v-else-if="simState === 'done'">
              <div class="sim-result-title">✅ Симуляция завершена!</div>
              <div class="sim-stats">
                <div class="sim-stat green">
                  <div class="sim-stat-val">{{ simResult.summary.green }}</div>
                  <div class="sim-stat-label">В норме</div>
                </div>
                <div class="sim-stat yellow">
                  <div class="sim-stat-val">{{ simResult.summary.yellow }}</div>
                  <div class="sim-stat-label">Внимание</div>
                </div>
                <div class="sim-stat red">
                  <div class="sim-stat-val">{{ simResult.summary.red }}</div>
                  <div class="sim-stat-label">Критично</div>
                </div>
              </div>
              <p class="sim-result-sub">
                Создано {{ simResult.created }} ПК. Перейди в список чтобы посмотреть детали каждого.
              </p>
            </template>

            <!-- Ошибка -->
            <template v-else-if="simState === 'error'">
              <div class="sim-error">❌ {{ simError }}</div>
            </template>
          </div>

          <div class="sim-footer">
            <template v-if="simState === 'idle'">
              <button class="btn btn-secondary" @click="closeSimModal">Отмена</button>
              <button class="btn btn-primary" @click="doSimulate" :disabled="simLoading">
                <span v-if="simLoading" class="spin-sm"></span>
                Запустить симуляцию
              </button>
            </template>
            <template v-else-if="simState === 'loading'">
              <span class="sim-wait">Пожалуйста, подождите...</span>
            </template>
            <template v-else>
              <button class="btn btn-secondary" @click="simState = 'idle'">← Назад</button>
              <button class="btn btn-primary" @click="closeSimModal">Готово</button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ProbBar from '@/components/ProbBar.vue'
import PcModal from '@/components/PcModal.vue'
import { useComputersStore } from '@/stores/computers'
import { useToastStore } from '@/stores/toast'
import { deleteComputer, simulateComputers, cleanupSimulated } from '@/api'
import { timeAgo } from '@/utils'

const router = useRouter()
const store = useComputersStore()
const toast = useToastStore()

const search     = ref('')
const showModal  = ref(false)
const editPc     = ref(null)
const delTarget  = ref(null)

// ── Симуляция ─────────────────────────────────────────────────
const showSimModal = ref(false)
const simCount     = ref(30)
const simState     = ref('idle')   // idle | loading | done | error
const simResult    = ref(null)
const simError     = ref('')
const simLoading   = ref(false)
const cleaning     = ref(false)

const hasSimPcs = computed(() =>
  store.list.some(pc => pc.pc_name.startsWith('SIM-'))
)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return store.list
  return store.list.filter(c =>
    c.pc_name.toLowerCase().includes(q) ||
    (c.location || '').toLowerCase().includes(q) ||
    (c.inventory_number || '').toLowerCase().includes(q)
  )
})

async function doDelete() {
  try {
    await deleteComputer(delTarget.value.id)
    toast.show(`ПК «${delTarget.value.pc_name}» удалён`, 'success')
    delTarget.value = null
    store.refresh(true)
  } catch (e) { toast.show(e.message, 'error') }
}

function onDone() {
  showModal.value = false
  editPc.value = null
  store.refresh(true)
}

function closeSimModal() {
  showSimModal.value = false
  simState.value = 'idle'
  simResult.value = null
  simError.value = ''
}

async function doSimulate() {
  simLoading.value = true
  simState.value = 'loading'
  try {
    const result = await simulateComputers(simCount.value)
    simResult.value = result
    simState.value = 'done'
    toast.show(`Создано ${result.created} ПК`, 'success')
    store.refresh(true)
  } catch (e) {
    simError.value = e.message
    simState.value = 'error'
  }
  simLoading.value = false
}

async function doCleanup() {
  cleaning.value = true
  try {
    const r = await cleanupSimulated()
    toast.show(`Удалено ${r.deleted} SIM-ПК`, 'success')
    store.refresh(true)
  } catch (e) {
    toast.show(e.message, 'error')
  }
  cleaning.value = false
}

let timer = null
onMounted(() => { store.refresh(); timer = setInterval(() => store.refresh(true), 15000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r)}
.card-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.card-title{font-size:15px;font-weight:600}
.card-sub{font-size:12px;color:var(--text2)}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;text-align:left;background:var(--bg3);border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:12px 16px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tbody tr{cursor:pointer;transition:background .1s}
tbody tr:hover{background:var(--bg3)}
.pc-name{font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px}
.sim-tag{font-size:10px;font-weight:700;background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);border-radius:4px;padding:1px 6px;font-family:var(--mono)}
.mono-cell{font-family:var(--mono);font-size:12px;color:var(--text2)}
.btn-icon{background:var(--bg3);border:1px solid var(--border);color:var(--text2);padding:5px 10px;border-radius:4px;font-size:13px;cursor:pointer;margin-left:5px;transition:all .15s}
.btn-icon:hover{border-color:var(--accent);color:var(--accent)}
.btn-icon.danger:hover{border-color:var(--red);color:var(--red)}
.search{background:var(--bg3);border:1px solid var(--border2);color:var(--text);font-size:13px;padding:8px 12px;border-radius:var(--r);outline:none;width:200px}
.search:focus{border-color:var(--accent)}
.search::placeholder{color:var(--text3)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:9px 18px;border-radius:var(--r);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s}
.btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{background:var(--accent-h)}
.btn-primary:disabled{opacity:.6;cursor:not-allowed}
.btn-secondary{background:var(--bg3);color:var(--text);border:1px solid var(--border2)}.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
.btn-danger{background:var(--red-d);color:var(--red);border:1px solid rgba(239,68,68,.3)}.btn-danger:hover{background:var(--red);color:#fff}
.btn-sim{background:rgba(168,85,247,.12);color:#a855f7;border:1px solid rgba(168,85,247,.3)}.btn-sim:hover{background:rgba(168,85,247,.2)}
.loading,.empty{padding:50px;text-align:center;color:var(--text2);font-size:13px;display:flex;align-items:center;justify-content:center;gap:10px}
.spin{width:18px;height:18px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.del-modal{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r);padding:28px;width:380px}
.del-title{font-size:18px;font-weight:700;color:var(--red);margin-bottom:12px}
.del-modal p{color:var(--text2);font-size:13px;line-height:1.6;margin-bottom:20px}
.del-actions{display:flex;justify-content:flex-end;gap:10px}

/* Симуляция */
.sim-modal{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r);width:480px;max-width:95vw;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.sim-header{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.sim-title{font-size:16px;font-weight:600}
.modal-close{background:none;border:none;color:var(--text2);font-size:22px;cursor:pointer;line-height:1}.modal-close:hover{color:var(--red)}
.sim-body{padding:22px}
.sim-footer{padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;align-items:center}
.sim-desc{font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px}
.sim-count-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;font-size:13px;font-weight:500}
.count-controls{display:flex;align-items:center;gap:12px}
.count-btn{background:var(--bg3);border:1px solid var(--border2);color:var(--text);width:32px;height:32px;border-radius:var(--r);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}.count-btn:hover{border-color:var(--accent);color:var(--accent)}
.count-val{font-family:var(--mono);font-size:20px;font-weight:700;min-width:40px;text-align:center}
.sim-presets{display:flex;gap:8px;margin-bottom:18px}
.preset-btn{background:var(--bg3);border:1px solid var(--border2);color:var(--text2);padding:6px 14px;border-radius:var(--r);font-size:13px;cursor:pointer;transition:all .15s}.preset-btn:hover,.preset-btn.active{background:var(--accent-g);border-color:var(--accent);color:var(--accent)}
.cleanup-hint{display:flex;align-items:center;justify-content:space-between;background:rgba(234,179,8,.07);border:1px solid rgba(234,179,8,.2);border-radius:var(--r);padding:10px 14px;font-size:12px;color:var(--yellow)}
.btn-cleanup{background:var(--red-d);color:var(--red);border:1px solid rgba(239,68,68,.3);padding:5px 12px;border-radius:4px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s}.btn-cleanup:hover{background:var(--red);color:#fff}.btn-cleanup:disabled{opacity:.6;cursor:not-allowed}
.sim-loading{display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px 0}
.spin-lg{width:48px;height:48px;border:3px solid var(--border2);border-top-color:#a855f7;border-radius:50%;animation:spin .8s linear infinite}
.sim-loading-text{font-size:14px;font-weight:600;color:var(--text)}
.sim-loading-sub{font-size:12px;color:var(--text2)}
.spin-sm{width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
.sim-result-title{font-size:16px;font-weight:700;color:var(--green);margin-bottom:16px;text-align:center}
.sim-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.sim-stat{background:var(--bg3);border-radius:var(--r);padding:16px;text-align:center;border:1px solid var(--border)}
.sim-stat.green{border-color:rgba(34,197,94,.2)}
.sim-stat.yellow{border-color:rgba(234,179,8,.2)}
.sim-stat.red{border-color:rgba(239,68,68,.2)}
.sim-stat-val{font-size:32px;font-weight:800;font-family:var(--mono)}
.sim-stat.green .sim-stat-val{color:var(--green)}
.sim-stat.yellow .sim-stat-val{color:var(--yellow)}
.sim-stat.red .sim-stat-val{color:var(--red)}
.sim-stat-label{font-size:11px;color:var(--text2);margin-top:4px}
.sim-result-sub{font-size:12px;color:var(--text2);text-align:center}
.sim-error{background:var(--red-d);border:1px solid rgba(239,68,68,.3);color:var(--red);border-radius:var(--r);padding:14px;font-size:13px}
.sim-wait{font-size:13px;color:var(--text2)}
</style>
