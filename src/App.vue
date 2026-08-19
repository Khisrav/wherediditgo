<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import AppShell from '@/app/layouts/AppShell.vue'
import PinLockModal from '@/components/PinLockModal.vue'
import { monthKey } from '@/lib/dates'
import { hideSplash } from '@/services/native/chrome'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useGoalsStore } from '@/stores/goals'
import { useCategoriesStore } from '@/stores/categories'
import { useRecurringStore } from '@/stores/recurring'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import { isNative } from '@/lib/platform'

const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const goals = useGoalsStore()
const recurring = useRecurringStore()
const transactions = useTransactionsStore()
const ui = useUiStore()
const router = useRouter()

let backHandle: PluginListenerHandle | undefined
let appStateHandle: PluginListenerHandle | undefined
let mq: MediaQueryList | undefined

function onSchemeChange() {
  if (settings.theme === 'system') settings.applyTheme('system')
}

async function runForegroundJobs() {
  await recurring.postDue()
  const copied = await budgets.carryForwardIfNeeded()
  if (copied === 'copied') ui.notifyBudgetCopied(monthKey())
}

function onVisibility() {
  if (document.visibilityState === 'visible') {
    void runForegroundJobs()
  } else if (document.visibilityState === 'hidden') {
    settings.lockApp()
  }
}

onMounted(async () => {
  await settings.load()
  accounts.start()
  categories.start()
  budgets.start()
  goals.start()
  transactions.start()
  recurring.start()
  await runForegroundJobs()

  if (!settings.onboardingDone && router.currentRoute.value.name !== 'onboarding') {
    await router.replace('/onboarding')
  }

  await hideSplash()

  if (isNative()) {
    appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void runForegroundJobs()
      } else {
        settings.lockApp()
      }
    })
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
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  void backHandle?.remove()
  void appStateHandle?.remove()
  mq?.removeEventListener('change', onSchemeChange)
  document.removeEventListener('visibilitychange', onVisibility)
  accounts.stop()
  categories.stop()
  budgets.stop()
  goals.stop()
  transactions.stop()
  recurring.stop()
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
  <template v-else>
    <PinLockModal
      v-if="settings.pinEnabled && !settings.isUnlocked"
      mode="unlock"
      @success="settings.unlockApp()"
    />
    <AppShell v-else />
  </template>
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
