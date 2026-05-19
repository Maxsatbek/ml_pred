import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, register as apiRegister, getMe } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const me = ref(JSON.parse(localStorage.getItem('me') || 'null'))

  async function login(username, password) {
    const d = await apiLogin(username, password)
    token.value = d.access_token
    localStorage.setItem('token', d.access_token)
    await fetchMe()
  }

  async function register(username, password) {
    return apiRegister(username, password)
  }

  async function fetchMe() {
    try {
      const d = await getMe()
      me.value = d
      localStorage.setItem('me', JSON.stringify(d))
    } catch {}
  }

  function logout() {
    token.value = ''
    me.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('me')
  }

  return { token, me, login, register, fetchMe, logout }
})
