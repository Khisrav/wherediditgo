<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import AppShell from '@/app/layouts/AppShell.vue'
import { hideSplash } from '@/services/native/chrome'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import { isNative } from '@/lib/platform'

const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const transactions = useTransactionsStore()
const ui = useUiStore()
const router = useRouter()

let backHandle: PluginListenerHandle | undefined
let mq: MediaQueryList | undefined

function onSchemeChange() {
  if (settings.theme === 'system') settings.applyTheme('system')
}

onMounted(async () => {
  await settings.load()
  accounts.start()
  categories.start()
  budgets.start()
  transactions.start()

  if (!settings.onboardingDone && router.currentRoute.value.name !== 'onboarding') {
    await router.replace('/onboarding')
  }

  await hideSplash()

  if (isNative()) {
    backHandle = await App.addListener('backButton', ({ canGoBack }) => {
      if (ui.addSheetOpen) {
        ui.closeAdd()
        return
      }
      if (router.currentRoute.value.meta.hideNav) {
        router.back()
        return
      }
      if (canGoBack && router.currentRoute.value.name !== 'home') {
        router.back()
        return
      }
      if (router.currentRoute.value.name !== 'home' && router.currentRoute.value.name !== 'onboarding') {
        void router.replace('/')
        return
      }
      void App.exitApp()
    })
  }

  mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', onSchemeChange)
})

onUnmounted(() => {
  void backHandle?.remove()
  mq?.removeEventListener('change', onSchemeChange)
  accounts.stop()
  categories.stop()
  budgets.stop()
  transactions.stop()
})

watch(
  () => settings.onboardingDone,
  (done) => {
    if (!done && router.currentRoute.value.name !== 'onboarding') {
      void router.replace('/onboarding')
    }
  },
)
</script>

<template>
  <div v-if="!settings.ready" class="boot" aria-busy="true" aria-label="Loading…">
    <p class="brand">WhereDidItGo</p>
  </div>
  <AppShell v-else />
</template>

<style scoped>
.boot {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: var(--space-8);
}

.brand {
  font-family: var(--font-display);
  font-size: var(--text-headline);
  font-weight: 700;
  color: var(--color-primary);
}
</style>
