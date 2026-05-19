<template>
  <div v-if="value !== null && value !== undefined" class="prob-wrap">
    <div class="track"><div class="fill" :style="fillStyle"></div></div>
    <span class="val">{{ (value * 100).toFixed(1) }}%</span>
  </div>
  <span v-else class="na">—</span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ value: Number, status: String })
const colors = { red: 'var(--red)', yellow: 'var(--yellow)', green: 'var(--green)' }
const fillStyle = computed(() => ({
  width: `${(props.value * 100).toFixed(1)}%`,
  background: colors[props.status] || 'var(--accent)'
}))
</script>

<style scoped>
.prob-wrap { display:flex;align-items:center;gap:10px;min-width:140px }
.track { flex:1;height:5px;background:var(--bg4);border-radius:3px;overflow:hidden }
.fill { height:100%;border-radius:3px;transition:width .4s }
.val { font-family:var(--mono);font-size:12px;color:var(--text2);min-width:42px }
.na { color:var(--text3);font-family:var(--mono);font-size:12px }
</style>
