<template>
  <div v-if="factors && factors.length" class="shap-card">
    <div class="shap-header">
      <div class="shap-title">
        <span class="shap-icon">🔍</span>
        <span>ИИ-анализ причин риска</span>
        <span class="shap-badge">SHAP</span>
      </div>
      <span class="shap-sub">Топ-{{ factors.length }} фактора влияния</span>
    </div>

    <div class="shap-body">
      <div
        v-for="(f, i) in factors"
        :key="f.feature"
        class="factor-row"
        :class="{ expanded: expandedIndex === i }"
        @click="toggleExpand(i)"
      >
        <!-- Rank -->
        <div class="factor-rank">{{ i + 1 }}</div>

        <!-- Label + value -->
        <div class="factor-info">
          <div class="factor-label">{{ f.label }}</div>
          <div class="factor-value">
            {{ f.value }}<span class="factor-unit">{{ f.unit || '' }}</span>
          </div>
        </div>

        <!-- Impact bar -->
        <div class="factor-bar-wrap">
          <div class="factor-bar-track">
            <div
              class="factor-bar-fill"
              :style="{ width: barWidth(f.impact) + '%' }"
            ></div>
          </div>
          <span class="factor-impact">+{{ (f.impact * 100).toFixed(1) }}%</span>
        </div>

        <!-- Expand arrow -->
        <div class="factor-arrow" :class="{ open: expandedIndex === i }">▸</div>
      </div>

      <!-- Рекомендация раскрывается под строкой -->
      <Transition name="rec">
        <div v-if="expandedIndex !== null" class="recommendation-box">
          <div class="rec-header">
            <span class="rec-icon">💡</span>
            <span class="rec-title">Как устранить: <b>{{ factors[expandedIndex]?.label }}</b></span>
          </div>
          <div class="rec-text">{{ getRecommendation(factors[expandedIndex]?.feature) }}</div>
        </div>
      </Transition>
    </div>

    <div class="shap-footer">
      <span>👆 Нажми на фактор чтобы увидеть рекомендацию</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  factors: { type: Array, default: () => [] }
})

// ── Рекомендации (зеркало словаря из notificator.py) ─────────────────────────
const RECOMMENDATIONS = {
  cpu_usage: (
    'Закрой лишние процессы через Диспетчер задач. ' +
    'Проверь автозапуск и отключи ненужные программы. ' +
    'Если нагрузка постоянно высокая — рассмотри апгрейд процессора.'
  ),
  ram_usage: (
    'Закрой неиспользуемые программы и вкладки браузера. ' +
    'Проверь процессы с растущим потреблением памяти (утечки). ' +
    'Рассмотри добавление дополнительной RAM-планки.'
  ),
  disk_usage: (
    'Освободи место: удали временные файлы (cleanmgr / Очистка диска), ' +
    'перенеси данные на внешний накопитель. ' +
    'Загрузка свыше 90% критична — диск может выйти из строя.'
  ),
  temperature: (
    'Почисти систему охлаждения от пыли с помощью баллончика со сжатым воздухом. ' +
    'Проверь термопасту — если не менялась более 3 лет, замени. ' +
    'Убедись что кулеры вращаются и корпус хорошо вентилируется.'
  ),
  fan_speed: (
    'Прочисти вентиляторы от пыли. ' +
    'Проверь что разъёмы кулеров надёжно подключены к плате. ' +
    'При аномально низких оборотах кулер, вероятно, неисправен — замени.'
  ),
  network_latency: (
    'Проверь сетевой кабель и перезагрузи роутер. ' +
    'Высокая задержка может указывать на перегруз сети или неисправность NIC. ' +
    'Попробуй обновить драйверы сетевого адаптера.'
  ),
  power_voltage: (
    'Проверь блок питания — возможна просадка напряжения под нагрузкой. ' +
    'Используй ИБП (источник бесперебойного питания) для стабилизации. ' +
    'Нестабильное питание — частая причина внезапных отказов оборудования.'
  ),
  errors_count: (
    'Проверь SMART-статус диска через CrystalDiskInfo или Victoria. ' +
    'Запусти проверку системных файлов: sfc /scannow в командной строке. ' +
    'Большое число ошибок — признак скорого отказа диска, сделай резервную копию.'
  ),
  uptime_days: (
    'Перезагрузи компьютер — длительная работа без перезагрузки ' +
    'накапливает утечки памяти и нестабильность системы. ' +
    'Рекомендуется перезагружать ПК раз в 7–14 дней.'
  ),
}

const expandedIndex = ref(null)

function toggleExpand(i) {
  expandedIndex.value = expandedIndex.value === i ? null : i
}

function getRecommendation(feature) {
  return RECOMMENDATIONS[feature] || 'Обратитесь к системному администратору для диагностики.'
}

const maxImpact = computed(() => {
  if (!props.factors.length) return 1
  return Math.max(...props.factors.map(f => Math.abs(f.impact)))
})

function barWidth(impact) {
  if (!maxImpact.value) return 0
  return Math.min(100, (Math.abs(impact) / maxImpact.value) * 100)
}
</script>

<style scoped>
.shap-card {
  background: var(--bg2);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: var(--r);
  overflow: hidden;
  margin-bottom: 16px;
}

.shap-header {
  padding: 14px 18px;
  background: rgba(239,68,68,0.05);
  border-bottom: 1px solid rgba(239,68,68,0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shap-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.shap-icon { font-size: 16px }

.shap-badge {
  background: rgba(239,68,68,0.12);
  color: var(--red);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  font-family: var(--mono);
  letter-spacing: 0.5px;
}

.shap-sub { font-size: 12px; color: var(--text2); }

.shap-body { padding: 4px 0; }

.factor-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
  cursor: pointer;
  user-select: none;
}
.factor-row:last-child { border-bottom: none }
.factor-row:hover { background: var(--bg3) }
.factor-row.expanded { background: var(--bg3); border-bottom-color: transparent; }

.factor-rank {
  width: 22px;
  height: 22px;
  background: var(--red-d);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--red);
  flex-shrink: 0;
}

.factor-info { min-width: 160px; flex-shrink: 0; }

.factor-label { font-size: 13px; font-weight: 500; margin-bottom: 2px; }

.factor-value {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--red);
}

.factor-unit {
  font-size: 11px;
  color: var(--text2);
  margin-left: 2px;
  font-weight: 400;
}

.factor-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.factor-bar-track {
  flex: 1;
  height: 8px;
  background: var(--bg4);
  border-radius: 4px;
  overflow: hidden;
}

.factor-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--yellow), var(--red));
  border-radius: 4px;
  transition: width 0.5s ease;
}

.factor-impact {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--red);
  min-width: 48px;
  text-align: right;
}

.factor-arrow {
  font-size: 12px;
  color: var(--text3);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.factor-arrow.open { transform: rotate(90deg); color: var(--accent); }

/* Блок рекомендации */
.recommendation-box {
  margin: 0 18px 12px;
  background: rgba(59,130,246,0.06);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: var(--r);
  padding: 14px;
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rec-icon { font-size: 16px; }

.rec-title {
  font-size: 13px;
  color: var(--text2);
}

.rec-text {
  font-size: 13px;
  color: var(--text);
  line-height: 1.6;
}

/* Анимация появления */
.rec-enter-active { transition: all 0.2s ease; }
.rec-leave-active { transition: all 0.15s ease; }
.rec-enter-from, .rec-leave-to { opacity: 0; transform: translateY(-6px); }

.shap-footer {
  padding: 10px 18px;
  background: var(--bg3);
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text2);
  font-style: italic;
}
</style>
