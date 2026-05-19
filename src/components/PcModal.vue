<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Редактировать ПК' : 'Добавить новый ПК' }}</span>
          <button class="modal-close" @click="$emit('close')">×</button>
        </div>

        <div class="modal-body">
          <!-- FORM (создание нового или редактирование) -->
          <template v-if="!accessToken">
            <div class="mfield">
              <label>Название ПК *</label>
              <input v-model="form.pc_name" placeholder="office-pc-01" @keyup.enter="submit">
            </div>
            <div class="mfield">
              <label>Инвентарный номер</label>
              <input v-model="form.inventory_number" placeholder="ИНВ-001">
            </div>
            <div class="mfield">
              <label>Местоположение / Аудитория</label>
              <input v-model="form.location" placeholder="Аудитория 305">
            </div>
            <div v-if="isAdmin && !editing" class="mfield">
              <label>Назначить пользователю (User ID, необязательно)</label>
              <input v-model.number="form.owner_id" type="number" placeholder="ID владельца">
            </div>
          </template>

          <!-- TOKEN RESULT (после создания или запроса токена) -->
          <template v-else>
            <div class="success-msg">
              {{ tokenFromExisting ? '🔑 Токен агента для «' + form.pc_name + '»' : '✅ ПК «' + form.pc_name + '» зарегистрирован!' }}
            </div>
            <div class="token-box">
              <div class="token-label">🔑 Access Token для агента</div>
              <div class="token-val">{{ accessToken }}</div>
              <button class="btn-copy" @click="copy">{{ copied ? '✓ Скопировано' : 'Копировать' }}</button>
            </div>
            <div class="token-steps">
              <strong>Что делать дальше:</strong><br>
              1. Скопируй токен выше<br>
              2. На целевом ПК создай файл <code>.env.agent</code>:<br>
              <div class="code-block">ACCESS_TOKEN={{ accessToken }}<br>SERVER_URL=http://&lt;IP_сервера&gt;:8000<br>CHECK_INTERVAL=60</div>
              3. Запусти: <code>python monitor_loop.py</code>
            </div>
          </template>
        </div>

        <div class="modal-footer">
          <template v-if="!accessToken">
            <button class="btn btn-secondary" @click="$emit('close')">Отмена</button>
            <!-- Кнопка "Показать токен" — только при редактировании -->
            <button v-if="editing" class="btn btn-token" @click="fetchToken" :disabled="loadingToken">
              <span v-if="loadingToken" class="spin"></span>
              🔑 Показать токен
            </button>
            <button class="btn btn-primary" @click="submit" :disabled="loading">
              <span v-if="loading" class="spin"></span>
              {{ editing ? 'Сохранить' : 'Создать' }}
            </button>
          </template>
          <template v-else>
            <button class="btn btn-secondary" @click="accessToken = ''; tokenFromExisting = false">← Назад</button>
            <button class="btn btn-primary" @click="$emit('done')">Готово</button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { createComputer, updateComputer, getComputerToken } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { copyToClipboard } from '@/utils'

const props = defineProps({ editing: Object })
const emit = defineEmits(['close', 'done'])

const auth = useAuthStore()
const toast = useToastStore()
const isAdmin = ref(auth.me?.is_admin)

const form = ref({ pc_name: '', inventory_number: '', location: '', owner_id: null })
const loading = ref(false)
const loadingToken = ref(false)
const accessToken = ref('')
const copied = ref(false)
const tokenFromExisting = ref(false) // флаг: токен запрошен для существующего ПК

watch(() => props.editing, (pc) => {
  if (pc) form.value = { pc_name: pc.pc_name, inventory_number: pc.inventory_number || '', location: pc.location || '', owner_id: null }
  else form.value = { pc_name: '', inventory_number: '', location: '', owner_id: null }
  accessToken.value = ''
  tokenFromExisting.value = false
}, { immediate: true })

async function submit() {
  if (!form.value.pc_name.trim()) { toast.show('Введи название ПК', 'error'); return }
  loading.value = true
  try {
    const body = {
      pc_name: form.value.pc_name.trim(),
      inventory_number: form.value.inventory_number.trim() || null,
      location: form.value.location.trim() || null,
    }
    if (isAdmin.value && form.value.owner_id) body.owner_id = form.value.owner_id

    if (props.editing) {
      await updateComputer(props.editing.id, body)
      toast.show(`ПК «${body.pc_name}» обновлён`, 'success')
      emit('done')
    } else {
      const d = await createComputer(body)
      accessToken.value = d.access_token
      toast.show(`ПК «${body.pc_name}» создан!`, 'success')
    }
  } catch (e) { toast.show(e.message, 'error') }
  loading.value = false
}

// Запросить токен существующего ПК
async function fetchToken() {
  loadingToken.value = true
  try {
    const d = await getComputerToken(props.editing.id)
    accessToken.value = d.access_token
    tokenFromExisting.value = true
  } catch (e) {
    toast.show(e.message, 'error')
  }
  loadingToken.value = false
}

function copy() {
  copyToClipboard(accessToken.value).then(() => {
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  })
}
</script>

<style scoped>
.overlay { position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px) }
.modal { background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r);width:490px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,.6) }
.modal-header { padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:var(--bg2) }
.modal-title { font-size:16px;font-weight:600 }
.modal-close { background:none;border:none;color:var(--text2);font-size:22px;cursor:pointer;line-height:1 }
.modal-close:hover { color:var(--red) }
.modal-body { padding:20px 22px }
.modal-footer { padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px }
.mfield { margin-bottom:14px }
.mfield label { display:block;font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px }
.mfield input { width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text);font-size:14px;padding:9px 13px;border-radius:var(--r);outline:none;transition:border-color .2s }
.mfield input:focus { border-color:var(--accent) }
.success-msg { background:var(--green-d);border:1px solid rgba(34,197,94,.3);color:var(--green);border-radius:var(--r);padding:10px 14px;font-size:13px;margin-bottom:14px }
.token-box { background:var(--bg3);border:1px solid rgba(59,130,246,.4);border-radius:var(--r);padding:14px;margin-bottom:14px }
.token-label { font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px }
.token-val { font-family:var(--mono);font-size:12px;word-break:break-all;background:var(--bg4);padding:10px;border-radius:4px;color:var(--text);line-height:1.5 }
.btn-copy { margin-top:10px;background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:12px;padding:6px 14px;border-radius:4px;cursor:pointer;transition:all .2s }
.btn-copy:hover { border-color:var(--accent);color:var(--accent) }
.token-steps { font-size:12px;color:var(--text2);line-height:1.9 }
.token-steps strong { color:var(--text) }
.code-block { background:var(--bg4);border-radius:4px;padding:8px 12px;font-family:var(--mono);font-size:11px;color:var(--accent-h);margin:6px 0;line-height:1.8 }
code { background:var(--bg4);padding:1px 5px;border-radius:3px;font-family:var(--mono);font-size:11px;color:var(--accent-h) }
.btn { display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:9px 18px;border-radius:var(--r);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s }
.btn-primary { background:var(--accent);color:#fff }
.btn-primary:hover { background:var(--accent-h) }
.btn-primary:disabled { opacity:.6;cursor:not-allowed }
.btn-secondary { background:var(--bg3);color:var(--text);border:1px solid var(--border2) }
.btn-secondary:hover { border-color:var(--accent);color:var(--accent) }
.btn-token { background:var(--bg3);color:var(--accent);border:1px solid rgba(59,130,246,.4) }
.btn-token:hover { background:var(--accent-g);border-color:var(--accent) }
.btn-token:disabled { opacity:.6;cursor:not-allowed }
.spin { width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite }
@keyframes spin { to { transform:rotate(360deg) } }
</style>

