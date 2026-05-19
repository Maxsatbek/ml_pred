<template>
  <AppLayout title="Оперативный мониторинг">
    <template #actions>
      <div class="refresh-info">
        <span v-if="store.loading" class="spin-sm"></span>
        {{ store.lastRefresh ? 'Обновлено в ' + refreshLabel : 'Загрузка...' }}
      </div>
    </template>

    <div class="dashboard-grid">
      <aside class="stats-sidebar">
        <div class="stat-card stat-total">
          <div class="stat-label">Всего устройств</div>
          <div class="stat-val">{{ store.stats.total }}</div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-label">В норме</div>
          <div class="stat-val">{{ store.stats.green }}</div>
        </div>
        <div class="stat-card stat-yellow">
          <div class="stat-label">Внимание</div>
          <div class="stat-val">{{ store.stats.yellow }}</div>
        </div>
        <div class="stat-card stat-red">
          <div class="stat-label">Критично</div>
          <div class="stat-val">{{ store.stats.red }}</div>
        </div>

        <div class="sidebar-info">
          <h4>О системе</h4>
          <p>Данные обновляются автоматически каждые 15 секунд. ML-модель анализирует входящие метрики на лету.</p>
        </div>
      </aside>

      <main class="feed-container">
        <div class="card">
          <div class="card-head">
            <span class="card-title">Лента активности (Live Log)</span>
          </div>

          <div v-if="store.loading && !events.length" class="loading-state">
            <div class="spin"></div> Анализ данных...
          </div>

          <div v-else-if="!events.length" class="empty-state">
            Событий пока нет. Запустите агентов на ПК.
          </div>

          <div v-else class="feed-list">
            <div 
              v-for="ev in events" 
              :key="ev.id" 
              class="feed-item" 
              :class="'border-' + ev.status"
              @click="router.push('/computers/' + ev.id)"
            >
              <div class="ev-time">{{ timeAgo(ev.time) }}</div>
              
              <div class="ev-content">
                <div class="ev-header">
                  <span class="ev-pc-name">{{ ev.name }}</span>
                  <span class="ev-location" v-if="ev.location">{{ ev.location }}</span>
                  <StatusBadge :status="ev.status" size="sm" />
                </div>
                
                <div class="ev-message">{{ ev.message }}</div>
                
                <div class="ev-footer" v-if="ev.status !== 'green'">
                  <div class="prob-mini-bar">
                    <div class="prob-fill" :class="ev.status" :style="{width: ev.prob + '%'}"></div>
                  </div>
                  <span class="prob-text">Вероятность сбоя: {{ ev.prob }}%</span>
                </div>
              </div>

              <div class="ev-arrow">→</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useComputersStore } from '@/stores/computers'
import { timeAgo } from '@/utils'

const router = useRouter()
const store = useComputersStore()

// Формируем "События" на лету из списка компьютеров
const events = computed(() => {
  return [...store.list]
    .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
    .map(pc => ({
      id: pc.id,
      time: pc.last_seen,
      name: pc.pc_name,
      location: pc.location,
      status: pc.status,
      prob: Math.round(pc.failure_probability * 100),
      message: generateMessage(pc)
    }))
})

function generateMessage(pc) {
  const prob = pc.failure_probability * 100
  if (pc.status === 'red') {
    return `Критическая угроза! ML-модель зафиксировала аномалии в работе системы. Требуется немедленный осмотр.`
  } else if (pc.status === 'yellow') {
    return `Растущий риск (вероятность ${Math.round(prob)}%). Замечены отклонения в температурном режиме или нагрузке.`
  }
  return `Стабильная работа. Метрики в пределах нормы. Обновление получено успешно.`
}

const refreshLabel = computed(() => {
  if (!store.lastRefresh) return ''
  return store.lastRefresh.toLocaleTimeString('ru')
})

let timer = null
onMounted(() => {
  store.refresh()
  timer = setInterval(() => store.refresh(true), 15000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

/* СТИЛИ САЙДБАРА */
.stats-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 16px;
  border-left: 4px solid var(--border);
}

.stat-total { border-left-color: var(--accent); }
.stat-green { border-left-color: var(--green); }
.stat-yellow { border-left-color: var(--yellow); }
.stat-red { border-left-color: var(--red); }

.stat-label { font-size: 12px; color: var(--text2); margin-bottom: 4px; }
.stat-val { font-size: 28px; font-weight: 800; font-family: var(--mono); }

.sidebar-info {
  margin-top: 10px;
  padding: 16px;
  background: var(--bg3);
  border-radius: var(--r);
  font-size: 12px;
  color: var(--text3);
  line-height: 1.5;
}
.sidebar-info h4 { color: var(--text2); margin-bottom: 8px; font-size: 13px; }

/* СТИЛИ ЛЕНТЫ */
.feed-container { min-width: 0; }
.card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.card-head { padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--bg3); }
.card-title { font-weight: 700; font-size: 16px; }

.feed-list { display: flex; flex-direction: column; }

.feed-item {
  display: flex;
  gap: 20px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.feed-item:hover { background: var(--bg3); }
.feed-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: transparent;
}

.border-green::before { background: var(--green); }
.border-yellow::before { background: var(--yellow); }
.border-red::before { background: var(--red); }

.ev-time {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text3);
  white-space: nowrap;
  width: 80px;
  padding-top: 4px;
}

.ev-content { flex: 1; }

.ev-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.ev-pc-name { font-weight: 700; font-size: 15px; }
.ev-location { font-size: 12px; color: var(--text3); background: var(--bg3); padding: 2px 8px; border-radius: 10px; }

.ev-message { font-size: 14px; color: var(--text2); line-height: 1.4; margin-bottom: 12px; }

.ev-footer { display: flex; align-items: center; gap: 12px; }

.prob-mini-bar { width: 100px; height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; }
.prob-fill { height: 100%; transition: width 0.5s; }
.prob-fill.yellow { background: var(--yellow); }
.prob-fill.red { background: var(--red); }
.prob-text { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text3); }

.ev-arrow { align-self: center; color: var(--text3); font-size: 18px; opacity: 0; transition: opacity 0.2s; }
.feed-item:hover .ev-arrow { opacity: 1; transform: translateX(5px); }

.refresh-info { font-size: 12px; color: var(--text3); display: flex; align-items: center; gap: 8px; }

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .stats-sidebar { flex-direction: row; flex-wrap: wrap; }
  .stat-card { flex: 1; min-width: 140px; }
}
</style>