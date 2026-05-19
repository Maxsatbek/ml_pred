// Исправляем UTC время с сервера (Python возвращает naive datetime без Z)
export function parseDate(iso) {
  if (!iso) return null
  // Если нет суффикса Z или +, значит это UTC от Python — добавляем Z
  if (!/[Z+]/.test(iso)) return new Date(iso + 'Z')
  return new Date(iso)
}

export function timeAgo(iso) {
  if (!iso) return '—'
  const d = parseDate(iso)
  if (!d || isNaN(d)) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 5)    return 'только что'
  if (diff < 60)   return `${diff} сек назад`
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400)return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} д назад`
}

export function pct(v) {
  if (v === null || v === undefined) return '—'
  return (v * 100).toFixed(1) + '%'
}

export function statusLabel(s) {
  return { green: 'Норма', yellow: 'Внимание', red: 'Критично', unknown: 'Нет данных' }[s] || s
}

export function probColor(s) {
  return { red: 'var(--red)', yellow: 'var(--yellow)', green: 'var(--green)' }[s] || 'var(--text2)'
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}
