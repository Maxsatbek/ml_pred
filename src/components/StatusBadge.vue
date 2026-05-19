<template>
  <span :class="['badge', 's-' + status]">
    <span class="dot"></span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ status: String })
const labels = { green: 'Норма', yellow: 'Внимание', red: 'Критично', unknown: 'Нет данных' }
const label = computed(() => labels[props.status] || props.status)
</script>

<style scoped>
.badge { display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap }
.dot { width:6px;height:6px;border-radius:50%;flex-shrink:0 }
.s-green { background:var(--green-d);color:var(--green) }
.s-green .dot { background:var(--green);box-shadow:0 0 6px var(--green) }
.s-yellow { background:var(--yellow-d);color:var(--yellow) }
.s-yellow .dot { background:var(--yellow);box-shadow:0 0 6px var(--yellow) }
.s-red { background:var(--red-d);color:var(--red) }
.s-red .dot { background:var(--red);box-shadow:0 0 6px var(--red);animation:blink 1.5s infinite }
.s-unknown { background:var(--bg3);color:var(--text2) }
.s-unknown .dot { background:var(--text3) }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
</style>
