
// // src/api/index.js
// const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// function getToken() {
//   return localStorage.getItem('token') || ''
// }

// export async function apiFetch(method, path, body = null) {
//   const opts = {
//     method,
//     headers: {
//       'Authorization': `Bearer ${getToken()}`,
//       'Content-Type': 'application/json'
//     }
//   }
//   if (body) opts.body = JSON.stringify(body)
//   const r = await fetch(`${BASE}${path}`, opts)
//   if (r.status === 401) {
//     localStorage.removeItem('token')
//     localStorage.removeItem('me')
//     window.location.href = '/login'
//     throw new Error('Сессия истекла')
//   }
//   return r
// }

// // ── Auth ──────────────────────────────────────────────────────
// export async function login(username, password) {
//   const form = new URLSearchParams()
//   form.append('username', username)
//   form.append('password', password)
//   const r = await fetch(`${BASE}/auth/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: form
//   })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка входа')
//   return d
// }

// export async function register(username, password) {
//   const r = await fetch(`${BASE}/auth/register`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ username, password })
//   })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка регистрации')
//   return d
// }

// export async function getMe() {
//   const r = await apiFetch('GET', '/auth/me')
//   if (!r.ok) throw new Error()
//   return r.json()
// }

// export async function bindTelegram(telegram_id) {
//   const r = await apiFetch('POST', '/auth/telegram/bind', { telegram_id })
//   return r.json()
// }

// export async function unbindTelegram() {
//   const r = await apiFetch('DELETE', '/auth/telegram/unbind')
//   return r.json()
// }

// // ── НОВОЕ: Настройки пользователя (порог уведомлений) ─────────
// // Обновить свой порог (текущий пользователь)
// export async function updateMySettings(alert_threshold) {
//   const r = await apiFetch('PATCH', '/auth/settings', { alert_threshold })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка обновления настроек')
//   return d
// }

// // Обновить порог другого пользователя (только для администратора)
// export async function updateUserSettings(userId, alert_threshold) {
//   const r = await apiFetch('PATCH', `/auth/settings/${userId}`, { alert_threshold })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка обновления настроек')
//   return d
// }

// // ── Computers ─────────────────────────────────────────────────
// export async function getComputers() {
//   const r = await apiFetch('GET', '/computers/')
//   if (!r.ok) throw new Error('Ошибка загрузки компьютеров')
//   return r.json()
// }

// export async function getComputer(id) {
//   const r = await apiFetch('GET', `/computers/${id}`)
//   if (!r.ok) throw new Error('Компьютер не найден')
//   return r.json()
// }

// export async function getComputerHistory(id) {
//   const r = await apiFetch('GET', `/computers/${id}/history`)
//   if (!r.ok) throw new Error()
//   return r.json()
// }

// export async function createComputer(data) {
//   const r = await apiFetch('POST', '/computers/', data)
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка создания')
//   return d
// }

// export async function updateComputer(id, data) {
//   const r = await apiFetch('PATCH', `/computers/${id}`, data)
//   if (!r.ok) throw new Error('Ошибка обновления')
//   return r.json()
// }

// export async function deleteComputer(id) {
//   const r = await apiFetch('DELETE', `/computers/${id}`)
//   if (!r.ok) throw new Error('Ошибка удаления')
//   return r.json()
// }

// src/api/index.js
// const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// function getToken() {
//   return localStorage.getItem('token') || ''
// }

// export async function apiFetch(method, path, body = null) {
//   const opts = {
//     method,
//     headers: {
//       'Authorization': `Bearer ${getToken()}`,
//       'Content-Type': 'application/json'
//     }
//   }
//   if (body) opts.body = JSON.stringify(body)
//   const r = await fetch(`${BASE}${path}`, opts)
//   if (r.status === 401) {
//     localStorage.removeItem('token')
//     localStorage.removeItem('me')
//     window.location.href = '/login'
//     throw new Error('Сессия истекла')
//   }
//   return r
// }

// // ── Auth ──────────────────────────────────────────────────────
// export async function login(username, password) {
//   const form = new URLSearchParams()
//   form.append('username', username)
//   form.append('password', password)
//   const r = await fetch(`${BASE}/auth/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: form
//   })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка входа')
//   return d
// }

// export async function register(username, password) {
//   const r = await fetch(`${BASE}/auth/register`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ username, password })
//   })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка регистрации')
//   return d
// }

// export async function getMe() {
//   const r = await apiFetch('GET', '/auth/me')
//   if (!r.ok) throw new Error()
//   return r.json()
// }

// export async function bindTelegram(telegram_id) {
//   const r = await apiFetch('POST', '/auth/telegram/bind', { telegram_id })
//   return r.json()
// }

// export async function unbindTelegram() {
//   const r = await apiFetch('DELETE', '/auth/telegram/unbind')
//   return r.json()
// }

// // ── Настройки пользователя (порог уведомлений) ────────────────
// export async function updateMySettings(alert_threshold) {
//   const r = await apiFetch('PATCH', '/auth/settings', { alert_threshold })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка обновления настроек')
//   return d
// }

// export async function updateUserSettings(userId, alert_threshold) {
//   const r = await apiFetch('PATCH', `/auth/settings/${userId}`, { alert_threshold })
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка обновления настроек')
//   return d
// }

// // ── Computers ─────────────────────────────────────────────────
// export async function getComputers() {
//   const r = await apiFetch('GET', '/computers/')
//   if (!r.ok) throw new Error('Ошибка загрузки компьютеров')
//   return r.json()
// }

// export async function getComputer(id) {
//   const r = await apiFetch('GET', `/computers/${id}`)
//   if (!r.ok) throw new Error('Компьютер не найден')
//   return r.json()
// }

// export async function getComputerHistory(id) {
//   const r = await apiFetch('GET', `/computers/${id}/history`)
//   if (!r.ok) throw new Error()
//   return r.json()
// }

// export async function createComputer(data) {
//   const r = await apiFetch('POST', '/computers/', data)
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка создания')
//   return d
// }

// export async function updateComputer(id, data) {
//   const r = await apiFetch('PATCH', `/computers/${id}`, data)
//   if (!r.ok) throw new Error('Ошибка обновления')
//   return r.json()
// }

// export async function deleteComputer(id) {
//   const r = await apiFetch('DELETE', `/computers/${id}`)
//   if (!r.ok) throw new Error('Ошибка удаления')
//   return r.json()
// }

// // ── НОВОЕ: получить токен существующего ПК ────────────────────
// export async function getComputerToken(id) {
//   const r = await apiFetch('GET', `/computers/${id}/token`)
//   const d = await r.json()
//   if (!r.ok) throw new Error(d.detail || 'Ошибка получения токена')
//   return d
// }



// src/api/index.js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('token') || ''
}

export async function apiFetch(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(`${BASE}${path}`, opts)
  if (r.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    window.location.href = '/login'
    throw new Error('Сессия истекла')
  }
  return r
}

// ── Auth ──────────────────────────────────────────────────────
export async function login(username, password) {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка входа')
  return d
}

export async function register(username, password) {
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка регистрации')
  return d
}

export async function getMe() {
  const r = await apiFetch('GET', '/auth/me')
  if (!r.ok) throw new Error()
  return r.json()
}

export async function bindTelegram(telegram_id) {
  const r = await apiFetch('POST', '/auth/telegram/bind', { telegram_id })
  return r.json()
}

export async function unbindTelegram() {
  const r = await apiFetch('DELETE', '/auth/telegram/unbind')
  return r.json()
}

// ── Настройки пользователя ────────────────────────────────────
export async function updateMySettings(alert_threshold) {
  const r = await apiFetch('PATCH', '/auth/settings', { alert_threshold })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка обновления настроек')
  return d
}

export async function updateUserSettings(userId, alert_threshold) {
  const r = await apiFetch('PATCH', `/auth/settings/${userId}`, { alert_threshold })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка обновления настроек')
  return d
}

// ── Computers ─────────────────────────────────────────────────
export async function getComputers() {
  const r = await apiFetch('GET', '/computers/')
  if (!r.ok) throw new Error('Ошибка загрузки компьютеров')
  return r.json()
}

export async function getComputer(id) {
  const r = await apiFetch('GET', `/computers/${id}`)
  if (!r.ok) throw new Error('Компьютер не найден')
  return r.json()
}

export async function getComputerHistory(id) {
  const r = await apiFetch('GET', `/computers/${id}/history`)
  if (!r.ok) throw new Error()
  return r.json()
}

export async function createComputer(data) {
  const r = await apiFetch('POST', '/computers/', data)
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка создания')
  return d
}

export async function updateComputer(id, data) {
  const r = await apiFetch('PATCH', `/computers/${id}`, data)
  if (!r.ok) throw new Error('Ошибка обновления')
  return r.json()
}

export async function deleteComputer(id) {
  const r = await apiFetch('DELETE', `/computers/${id}`)
  if (!r.ok) throw new Error('Ошибка удаления')
  return r.json()
}

export async function getComputerToken(id) {
  const r = await apiFetch('GET', `/computers/${id}/token`)
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка получения токена')
  return d
}

// ── НОВОЕ: Симуляция ──────────────────────────────────────────
export async function simulateComputers(count = 30) {
  const r = await apiFetch('POST', `/computers/simulate?count=${count}`)
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка симуляции')
  return d
}

export async function cleanupSimulated() {
  const r = await apiFetch('DELETE', '/computers/simulate/cleanup')
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || 'Ошибка очистки')
  return d
}
