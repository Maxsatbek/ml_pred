<template>
  <div class="auth-wrap">
    <div class="card">
      <div class="logo">
        <div class="logo-icon">🖥</div>
        <div>
          <div class="logo-name">PC Monitor</div>
          <div class="logo-sub">Система мониторинга ПК</div>
        </div>
      </div>

      <h2 class="title">{{ isLogin ? 'Вход в систему' : 'Регистрация' }}</h2>
      <p class="sub">{{ isLogin ? 'Введи логин и пароль' : 'Создай новый аккаунт' }}</p>

      <div v-if="error" class="alert-error">{{ error }}</div>
      <div v-if="ok" class="alert-ok">{{ ok }}</div>

      <div class="field">
        <label>Имя пользователя</label>
        <input v-model="form.username" type="text" placeholder="admin" autocomplete="username" @keyup.enter="submit">
      </div>
      <div class="field">
        <label>Пароль</label>
        <input v-model="form.password" type="password" placeholder="••••••••" autocomplete="current-password" @keyup.enter="submit">
      </div>

      <button class="btn-submit" @click="submit" :disabled="loading">
        <span v-if="loading" class="spin"></span>
        {{ isLogin ? 'Войти' : 'Зарегистрироваться' }}
      </button>

      <p class="switch">
        {{ isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
        <a @click="toggle">{{ isLogin ? ' Зарегистрироваться' : ' Войти' }}</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useComputersStore } from '@/stores/computers'

const router = useRouter()
const auth = useAuthStore()
const computersStore = useComputersStore()

const isLogin = ref(true)
const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const ok = ref('')

function toggle() {
  isLogin.value = !isLogin.value
  error.value = ''
  ok.value = ''
}

async function submit() {
  error.value = ''
  ok.value = ''
  if (!form.value.username || !form.value.password) { error.value = 'Заполни все поля'; return }
  loading.value = true
  try {
    if (!isLogin.value) {
      await auth.register(form.value.username, form.value.password)
      ok.value = 'Аккаунт создан! Теперь войди.'
      isLogin.value = true
    } else {
      await auth.login(form.value.username, form.value.password)
      await computersStore.refresh()
      router.push('/dashboard')
    }
  } catch (e) { error.value = e.message }
  loading.value = false
}
</script>

<style scoped>
.auth-wrap { min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(59,130,246,.08),transparent) }
.card { width:420px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r);padding:40px;box-shadow:0 30px 80px rgba(0,0,0,.5) }
.logo { display:flex;align-items:center;gap:12px;margin-bottom:30px }
.logo-icon { width:36px;height:36px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0 }
.logo-name { font-family:var(--mono);font-size:14px;font-weight:600 }
.logo-sub { font-size:11px;color:var(--text2);margin-top:1px }
.title { font-size:22px;font-weight:700;margin-bottom:6px }
.sub { color:var(--text2);font-size:13px;margin-bottom:24px }
.alert-error { background:var(--red-d);border:1px solid rgba(239,68,68,.3);color:var(--red);border-radius:var(--r);padding:10px 14px;font-size:13px;margin-bottom:14px }
.alert-ok { background:var(--green-d);border:1px solid rgba(34,197,94,.3);color:var(--green);border-radius:var(--r);padding:10px 14px;font-size:13px;margin-bottom:14px }
.field { margin-bottom:14px }
.field label { display:block;font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px }
.field input { width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text);font-family:var(--sans);font-size:14px;padding:10px 14px;border-radius:var(--r);outline:none;transition:border-color .2s }
.field input:focus { border-color:var(--accent);background:var(--bg4) }
.btn-submit { width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:var(--r);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s }
.btn-submit:hover { background:var(--accent-h) }
.btn-submit:disabled { opacity:.6;cursor:not-allowed }
.switch { text-align:center;margin-top:16px;font-size:13px;color:var(--text2) }
.switch a { color:var(--accent);cursor:pointer }
.spin { width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite }
@keyframes spin { to { transform:rotate(360deg) } }
</style>
