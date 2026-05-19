<template>
  <router-view />
  <ToastList />
</template>

<script setup>
import ToastList from '@/components/ToastList.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'

const auth = useAuthStore()
onMounted(() => { if (auth.token) auth.fetchMe() })
</script>
