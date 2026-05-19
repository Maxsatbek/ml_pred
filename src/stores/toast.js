import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const items = ref([])
  let id = 0

  function show(msg, type = 'info') {
    const t = { id: ++id, msg, type }
    items.value.push(t)
    setTimeout(() => { items.value = items.value.filter(x => x.id !== t.id) }, 3500)
  }

  return { items, show }
})
