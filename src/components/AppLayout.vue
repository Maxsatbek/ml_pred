<template>
  <div class="layout">
    <!-- MOBILE OVERLAY -->
    <div v-if="sidebarOpen" class="mob-overlay" @click="sidebarOpen = false"></div>

    <!-- SIDEBAR -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-logo">
        <div class="logo-row">
          <div class="logo-icon">🖥</div>
          <div>
            <div class="logo-name">PC Monitor</div>
            <div class="logo-ver">v2.0</div>
          </div>
        </div>
        <button class="sidebar-close" @click="sidebarOpen = false">✕</button>
      </div>

      <div class="sidebar-user">
        <div class="user-name">
          {{ me?.username || '...' }}
          <span v-if="me?.is_admin" class="admin-badge">ADMIN</span>
        </div>
        <div class="user-role">{{ me?.is_admin ? 'Администратор' : 'Пользователь' }}</div>
      </div>

      <nav class="nav">
        <div class="nav-section">Мониторинг</div>
        <RouterLink class="nav-item" to="/dashboard" active-class="active" @click="closeMobile">
          <span>📊</span> Dashboard
        </RouterLink>
        <RouterLink class="nav-item" to="/computers" active-class="active" @click="closeMobile">
          <span>🖥</span> Компьютеры
        </RouterLink>
        <template v-if="me?.is_admin">
          <div class="nav-section">Администратор</div>
          <RouterLink class="nav-item" to="/admin" active-class="active" @click="closeMobile">
            <span>👥</span> Пользователи
          </RouterLink>
        </template>
        <div class="nav-section">Аккаунт</div>
        <RouterLink class="nav-item" to="/profile" active-class="active" @click="closeMobile">
          <span>⚙</span> Профиль
        </RouterLink>
      </nav>

      <div class="sidebar-bottom">
        <button class="btn-theme" @click="theme.toggle()" :title="theme.isDark ? 'Светлая тема' : 'Тёмная тема'">
          <span class="theme-icon">{{ theme.isDark ? '☀️' : '🌙' }}</span>
          <span>{{ theme.isDark ? 'Светлая тема' : 'Тёмная тема' }}</span>
        </button>
        <!-- Кнопка выхода теперь открывает диалог подтверждения -->
        <button class="btn-logout" @click="confirmLogout = true">🚪 Выйти</button>
      </div>
    </aside>

    <!-- MAIN -->
    <div class="main">
      <header class="topbar">
        <button class="hamburger" @click="sidebarOpen = true">☰</button>
        <div class="topbar-left">
          <slot name="title"><span class="topbar-title">{{ title }}</span></slot>
        </div>
        <div class="topbar-right">
          <slot name="actions" />
        </div>
      </header>
      <main class="page-content">
        <slot />
      </main>
    </div>
  </div>

  <!-- ── ДИАЛОГ ПОДТВЕРЖДЕНИЯ ВЫХОДА ─────────────────────────────── -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="confirmLogout" class="overlay" @click.self="confirmLogout = false">
        <Transition name="modal-pop">
          <div class="logout-modal" v-if="confirmLogout">
            <div class="logout-icon">🚪</div>
            <div class="logout-title">Выйти из системы?</div>
            <p class="logout-desc">
              Вы будете перенаправлены на страницу входа.<br>
              Все несохранённые данные будут потеряны.
            </p>
            <div class="logout-actions">
              <button class="btn btn-secondary" @click="confirmLogout = false">
                Отмена
              </button>
              <button class="btn btn-danger" @click="doLogout">
                Да, выйти
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useRouter } from 'vue-router'

defineProps({ title: String })

const auth    = useAuthStore()
const theme   = useThemeStore()
const router  = useRouter()

const me           = computed(() => auth.me)
const sidebarOpen  = ref(false)
const confirmLogout = ref(false)   // ← управляет видимостью диалога

function closeMobile() {
  if (window.innerWidth < 768) sidebarOpen.value = false
}

function doLogout() {
  confirmLogout.value = false
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout { display:flex; min-height:100vh }
.sidebar {
  width:220px; background:var(--bg2); border-right:1px solid var(--border);
  display:flex; flex-direction:column; flex-shrink:0;
  position:sticky; top:0; height:100vh; overflow-y:auto;
  transition:transform .25s ease, background .2s, border-color .2s;
}
.sidebar-logo {
  padding:16px 16px 14px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.logo-row { display:flex; align-items:center; gap:10px }
.logo-icon { width:32px;height:32px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0 }
.logo-name { font-family:var(--mono); font-size:13px; font-weight:600 }
.logo-ver  { font-size:11px; color:var(--text2) }
.sidebar-close { display:none; background:none; border:none; color:var(--text2); font-size:18px; cursor:pointer; padding:4px }
.sidebar-close:hover { color:var(--red) }
.sidebar-user { padding:12px 16px; border-bottom:1px solid var(--border) }
.user-name { font-size:13px; font-weight:600; margin-bottom:3px }
.user-role { font-size:11px; color:var(--text2) }
.admin-badge {
  display:inline-block; background:var(--accent-g); color:var(--accent);
  border:1px solid rgba(59,130,246,.3); border-radius:4px;
  font-size:10px; font-weight:600; padding:1px 6px; margin-left:4px; vertical-align:middle;
}
.nav { padding:10px 8px; flex:1 }
.nav-section { font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:1px;padding:8px 10px 4px }
.nav-item {
  display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:var(--r);
  font-size:13px; font-weight:500; color:var(--text2); transition:all .15s; margin-bottom:2px;
}
.nav-item:hover  { background:var(--bg3); color:var(--text) }
.nav-item.active { background:var(--accent-g); color:var(--accent) }
.sidebar-bottom { padding:12px 16px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px }
.btn-theme {
  width:100%; padding:8px 12px; background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--r); color:var(--text2); font-size:13px; font-weight:500;
  cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:8px;
}
.btn-theme:hover { border-color:var(--accent); color:var(--accent) }
.theme-icon { font-size:15px }
.btn-logout {
  width:100%; padding:8px; background:transparent; border:1px solid var(--border);
  border-radius:var(--r); color:var(--text2); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s;
}
.btn-logout:hover { border-color:var(--red); color:var(--red) }
.main { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden }
.topbar {
  padding:0 20px; height:54px; background:var(--bg2); border-bottom:1px solid var(--border);
  display:flex; align-items:center; gap:12px; flex-shrink:0; transition:background .2s;
}
.topbar-title { font-size:16px; font-weight:600 }
.topbar-left  { flex:1; display:flex; align-items:center; gap:6px; min-width:0 }
.topbar-right { display:flex; gap:8px; align-items:center; flex-shrink:0 }
.page-content { flex:1; overflow-y:auto; padding:20px }
.hamburger { display:none; background:none; border:none; color:var(--text); font-size:20px; cursor:pointer; padding:4px; flex-shrink:0 }
.mob-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:49; backdrop-filter:blur(2px) }

/* ── LOGOUT MODAL ─────────────────────────────────────────── */
.overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.75);
  z-index:300; display:flex; align-items:center; justify-content:center;
  backdrop-filter:blur(4px);
}
.logout-modal {
  background:var(--bg2); border:1px solid var(--border2);
  border-radius:var(--r); padding:32px 28px; width:360px; max-width:92vw;
  text-align:center; box-shadow:0 30px 80px rgba(0,0,0,.6);
}
.logout-icon  { font-size:40px; margin-bottom:14px; line-height:1 }
.logout-title { font-size:18px; font-weight:700; margin-bottom:10px }
.logout-desc  { font-size:13px; color:var(--text2); line-height:1.7; margin-bottom:24px }
.logout-actions { display:flex; gap:10px; justify-content:center }
.btn {
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:10px 24px; border-radius:var(--r); font-size:14px; font-weight:600;
  cursor:pointer; border:none; transition:all .2s;
}
.btn-secondary { background:var(--bg3); color:var(--text); border:1px solid var(--border2) }
.btn-secondary:hover { border-color:var(--accent); color:var(--accent) }
.btn-danger { background:var(--red-d); color:var(--red); border:1px solid rgba(239,68,68,.3) }
.btn-danger:hover { background:var(--red); color:#fff }

/* ── АНИМАЦИИ ─────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .2s }
.fade-enter-from, .fade-leave-to       { opacity: 0 }
.modal-pop-enter-active { transition: all .25s cubic-bezier(.34,1.56,.64,1) }
.modal-pop-leave-active { transition: all .15s ease }
.modal-pop-enter-from   { opacity:0; transform:scale(.88) translateY(12px) }
.modal-pop-leave-to     { opacity:0; transform:scale(.95) }

@media (max-width: 767px) {
  .hamburger { display:block }
  .mob-overlay { display:block }
  .sidebar-close { display:block }
  .sidebar {
    position:fixed; left:0; top:0; z-index:50; height:100vh;
    transform:translateX(-100%);
    box-shadow:4px 0 30px rgba(0,0,0,.5);
  }
  .sidebar.open { transform:translateX(0) }
}
</style>
