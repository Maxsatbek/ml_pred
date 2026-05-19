<template>
  <AppLayout title="Пользователи и ПК">
    <!-- STATS -->
    <div class="stats-row">
      <div class="stat"><div class="stat-label">Всего ПК</div><div class="stat-val accent">{{ store.stats.total }}</div></div>
      <div class="stat"><div class="stat-label">Норма</div><div class="stat-val green">{{ store.stats.green }}</div></div>
      <div class="stat"><div class="stat-label">Внимание</div><div class="stat-val yellow">{{ store.stats.yellow }}</div></div>
      <div class="stat"><div class="stat-label">Критично</div><div class="stat-val red">{{ store.stats.red }}</div></div>
    </div>

    <!-- CRITICAL ALERTS -->
    <div v-if="criticalList.length" class="card" style="margin-bottom:16px;border-color:rgba(239,68,68,.3)">
      <div class="card-head" style="background:rgba(239,68,68,.05)">
        <span class="card-title" style="color:var(--red)">🚨 Требуют внимания</span>
        <span class="card-sub">{{ criticalList.length }} ПК с высоким риском</span>
      </div>
      <div class="alert-list">
        <div v-for="pc in criticalList" :key="pc.id" class="alert-row" @click="router.push('/computers/'+pc.id)">
          <StatusBadge :status="pc.status" />
          <div class="alert-info">
            <span class="alert-name">{{ pc.pc_name }}</span>
            <span class="alert-meta">{{ pc.location || '—' }} · {{ pc.inventory_number || 'б/н' }}</span>
          </div>
          <div class="alert-owner">Владелец #{{ pc.owner_id }}</div>
          <div class="alert-prob">{{ pct(pc.failure_probability) }}</div>
        </div>
      </div>
    </div>

    <!-- GROUPED BY OWNER -->
    <div v-if="store.loading && !store.list.length" class="loading"><div class="spin"></div> Загрузка...</div>
    <div v-for="group in groupedByOwner" :key="group.owner_id" class="owner-group">
      <div class="owner-header">
        <div class="owner-title">
          <span class="owner-icon">👤</span>
          <span>Пользователь <strong>#{{ group.owner_id }}</strong></span>
        </div>
        <!-- ── ПОРОГ ДЛЯ ЭТОГО ПОЛЬЗОВАТЕЛЯ ── -->
        <div class="owner-threshold" @click.stop>
          <span class="threshold-icon">🔔</span>
          <span class="threshold-text">Порог:</span>
          <div class="threshold-input-wrap">
            <input
              type="number"
              min="10" max="99" step="1"
              :value="getThreshold(group.owner_id)"
              @change="e => setThreshold(group.owner_id, Number(e.target.value))"
              class="threshold-input"
            />
            <span class="threshold-pct">%</span>
          </div>
          <button
            class="threshold-save-btn"
            :class="{ saving: savingFor === group.owner_id, saved: savedFor === group.owner_id }"
            :disabled="savingFor === group.owner_id"
            @click="saveThreshold(group.owner_id)"
            :title="`Сохранить порог для пользователя #${group.owner_id}`"
          >
            <span v-if="savingFor === group.owner_id" class="spin-xs"></span>
            <span v-else-if="savedFor === group.owner_id">✓</span>
            <span v-else>Сохранить</span>
          </button>
        </div>
        <span class="owner-count">{{ group.computers.length }} ПК</span>
      </div>

      <div class="owner-table">
        <table>
          <thead>
            <tr>
              <th>ПК</th>
              <th>Инв. номер</th>
              <th>Аудитория</th>
              <th>Статус</th>
              <th>Вероятность сбоя</th>
              <th>Активность</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pc in group.computers" :key="pc.id" @click="router.push('/computers/'+pc.id)">
              <td><div class="pc-name">{{ pc.pc_name }}</div></td>
              <td class="mono-cell">{{ pc.inventory_number || '—' }}</td>
              <td class="mono-cell">{{ pc.location || '—' }}</td>
              <td><StatusBadge :status="pc.status" /></td>
              <td><ProbBar :value="pc.failure_probability" :status="pc.status" /></td>
              <td class="mono-cell">{{ timeAgo(pc.last_seen) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!store.loading && !store.list.length" class="empty">
      Компьютеры не зарегистрированы
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ProbBar from '@/components/ProbBar.vue'
import { useComputersStore } from '@/stores/computers'
import { useToastStore } from '@/stores/toast'
import { updateUserSettings } from '@/api'
import { timeAgo, pct } from '@/utils'

const router = useRouter()
const store  = useComputersStore()
const toast  = useToastStore()

// Хранит текущие значения порогов для каждого owner_id
// Заполняется дефолтом 85 пока не придут данные из API
const thresholds = ref({})   // { owner_id: percent (number) }
const savingFor  = ref(null) // owner_id в процессе сохранения
const savedFor   = ref(null) // owner_id только что сохранённый

function getThreshold(ownerId) {
  return thresholds.value[ownerId] ?? 85
}
function setThreshold(ownerId, val) {
  thresholds.value[ownerId] = Math.min(99, Math.max(10, val || 85))
}

async function saveThreshold(ownerId) {
  savingFor.value = ownerId
  try {
    const val = getThreshold(ownerId) / 100   // % → дробь
    await updateUserSettings(ownerId, val)
    toast.show(`Порог для пользователя #${ownerId} установлен: ${getThreshold(ownerId)}%`, 'success')
    savedFor.value = ownerId
    setTimeout(() => { if (savedFor.value === ownerId) savedFor.value = null }, 2000)
  } catch (e) {
    toast.show(e.message || 'Ошибка сохранения', 'error')
  }
  savingFor.value = null
}

// Группируем ПК по owner_id
const groupedByOwner = computed(() => {
  const map = {}
  for (const pc of store.list) {
    const oid = pc.owner_id ?? 'unknown'
    if (!map[oid]) map[oid] = { owner_id: oid, computers: [] }
    map[oid].computers.push(pc)
  }
  return Object.values(map).sort((a, b) => {
    const scoreA = a.computers.filter(c => c.status === 'red').length
    const scoreB = b.computers.filter(c => c.status === 'red').length
    return scoreB - scoreA
  })
})

const criticalList = computed(() =>
  store.list
    .filter(c => c.status === 'red' || c.status === 'yellow')
    .sort((a, b) => (b.failure_probability || 0) - (a.failure_probability || 0))
)

let timer = null
onMounted(() => { store.refresh(); timer = setInterval(() => store.refresh(true), 15000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.stat{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:16px}
.stat-label{font-size:12px;color:var(--text2);margin-bottom:6px;font-weight:500}
.stat-val{font-size:28px;font-weight:700;font-family:var(--mono)}
.accent{color:var(--accent)}.green{color:var(--green)}.yellow{color:var(--yellow)}.red{color:var(--red)}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r)}
.card-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;border-radius:var(--r) var(--r) 0 0}
.card-title{font-size:15px;font-weight:600}
.card-sub{font-size:12px;color:var(--text2)}
.alert-list{padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.alert-row{display:flex;align-items:center;gap:12px;background:var(--bg3);border:1px solid rgba(239,68,68,.2);border-radius:var(--r);padding:10px 14px;cursor:pointer;transition:border-color .15s}
.alert-row:hover{border-color:var(--red)}
.alert-info{flex:1;display:flex;flex-direction:column;gap:2px}
.alert-name{font-weight:600;font-size:13px}
.alert-meta{font-family:var(--mono);font-size:11px;color:var(--text2)}
.alert-owner{font-family:var(--mono);font-size:11px;color:var(--text3)}
.alert-prob{font-family:var(--mono);font-size:18px;font-weight:700;color:var(--red);min-width:56px;text-align:right}

/* OWNER GROUPS */
.owner-group{margin-bottom:16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.owner-header{padding:10px 18px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.owner-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;flex:1}
.owner-icon{font-size:16px}
.owner-count{font-family:var(--mono);font-size:12px;color:var(--text2)}

/* THRESHOLD INLINE CONTROL */
.owner-threshold{display:flex;align-items:center;gap:6px;background:var(--bg4);border:1px solid var(--border2);border-radius:var(--r);padding:5px 10px}
.threshold-icon{font-size:14px}
.threshold-text{font-size:12px;color:var(--text2);white-space:nowrap}
.threshold-input-wrap{display:flex;align-items:center;gap:2px}
.threshold-input{
  width:48px; background:var(--bg2); border:1px solid var(--border2);
  color:var(--text); font-family:var(--mono); font-size:13px; font-weight:600;
  padding:3px 6px; border-radius:4px; outline:none; text-align:center;
  transition:border-color .2s;
}
.threshold-input:focus{border-color:var(--accent)}
.threshold-input::-webkit-inner-spin-button,.threshold-input::-webkit-outer-spin-button{-webkit-appearance:none}
.threshold-pct{font-size:12px;font-weight:600;color:var(--text2);font-family:var(--mono)}
.threshold-save-btn{
  background:var(--accent-g); border:1px solid rgba(59,130,246,.3); color:var(--accent);
  font-size:11px; font-weight:600; padding:3px 10px; border-radius:4px;
  cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:4px;
  white-space:nowrap;
}
.threshold-save-btn:hover:not(:disabled){background:var(--accent);color:#fff;border-color:var(--accent)}
.threshold-save-btn:disabled{opacity:.6;cursor:not-allowed}
.threshold-save-btn.saved{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.3);color:var(--green)}
.spin-xs{width:10px;height:10px;border:2px solid rgba(59,130,246,.3);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}

.owner-table table{width:100%;border-collapse:collapse}
th{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:11px 16px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tbody tr{cursor:pointer;transition:background .1s}
tbody tr:hover{background:var(--bg3)}
.pc-name{font-weight:600;font-size:14px}
.mono-cell{font-family:var(--mono);font-size:12px;color:var(--text2)}
.loading,.empty{display:flex;align-items:center;justify-content:center;gap:10px;padding:50px;color:var(--text2);font-size:13px}
.spin{width:18px;height:18px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.stats-row{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.owner-threshold{width:100%}}
</style>
