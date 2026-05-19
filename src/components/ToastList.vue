<template>
  <div class="toasts">
    <TransitionGroup name="toast">
      <div v-for="t in toast.items" :key="t.id" :class="['toast', 't-' + t.type]">{{ t.msg }}</div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
const toast = useToastStore()
</script>

<style scoped>
.toasts { position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none }
.toast { background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r);padding:12px 16px;font-size:13px;min-width:260px;border-left:3px solid var(--accent) }
.t-success { border-left-color:var(--green) }
.t-error { border-left-color:var(--red) }
.toast-enter-active,.toast-leave-active { transition:all .25s }
.toast-enter-from { opacity:0;transform:translateX(20px) }
.toast-leave-to { opacity:0;transform:translateX(20px) }
</style>
