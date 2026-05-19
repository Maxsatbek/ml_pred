import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getComputers } from '@/api'

export const useComputersStore = defineStore('computers', () => {
  const list = ref([])
  const loading = ref(false)
  const lastRefresh = ref(null)

  const stats = computed(() => ({
    total:  list.value.length,
    green:  list.value.filter(c => c.status === 'green').length,
    yellow: list.value.filter(c => c.status === 'yellow').length,
    red:    list.value.filter(c => c.status === 'red').length,
  }))

  async function refresh(silent = false) {
    if (!silent) loading.value = true
    try {
      list.value = await getComputers()
      lastRefresh.value = new Date()
    } catch {}
    loading.value = false
  }

  return { list, loading, lastRefresh, stats, refresh }
})
