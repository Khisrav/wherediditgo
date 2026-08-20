<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChartPie, Home, List, PiggyBank, Plus, HandCoins } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { tickFeedback } from '@/services/native/haptics'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const settings = useSettingsStore()

const homeTab = { to: '/', name: 'home', labelKey: 'nav.home', icon: Home }

const allOptionalTabs = [
  { to: '/activity', name: 'activity', labelKey: 'nav.activity', icon: List, key: 'showActivityTab' as const },
  { to: '/debts', name: 'debts', labelKey: 'nav.debts', icon: HandCoins, key: 'showDebtsTab' as const },
  { to: '/budgets', name: 'budgets', labelKey: 'nav.budgets', icon: PiggyBank, key: 'showBudgetsTab' as const },
  { to: '/insights', name: 'insights', labelKey: 'nav.insights', icon: ChartPie, key: 'showInsightsTab' as const },
] as const

const enabledOptionalTabs = computed(() => {
  return allOptionalTabs.filter((tab) => settings[tab.key])
})

const hasAnySecondaryTab = computed(() => {
  return enabledOptionalTabs.value.length > 0
})

const tabsLeft = computed(() => {
  const optional = enabledOptionalTabs.value
  if (optional.length === 0) return []
  if (optional.length === 1) return [homeTab]
  return [homeTab, optional[0]]
})

const tabsRight = computed(() => {
  const optional = enabledOptionalTabs.value
  if (optional.length === 0) return []
  if (optional.length === 1) return [optional[0]]
  if (optional.length === 2) return [optional[1]]
  if (optional.length === 3) return [optional[1], optional[2]]
  return [optional[1], optional[2], optional[3]]
})

const gridTemplateColumns = computed(() => {
  const leftCount = tabsLeft.value.length
  const rightCount = tabsRight.value.length
  if (leftCount === 0 && rightCount === 0) return 'auto'
  return `repeat(${Math.max(1, leftCount)}, 1fr) auto repeat(${Math.max(1, rightCount)}, 1fr)`
})

function isActive(name: string) {
  return route.name === name
}

function openAdd() {
  ui.openAdd()
}
</script>

<template>
  <nav v-if="hasAnySecondaryTab" class="nav surface-glass" :aria-label="t('nav.main')">
    <div class="nav-inner" :style="{ gridTemplateColumns }">
      <RouterLink
        v-for="tab in tabsLeft"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': isActive(tab.name) }"
        @click="tickFeedback()"
      >
        <component :is="tab.icon" :size="20" />
        <span>{{ t(tab.labelKey) }}</span>
      </RouterLink>

      <button type="button" class="fab" :aria-label="t('nav.addTransaction')" @click="openAdd">
        <Plus :size="24" :stroke-width="2.5" />
      </button>

      <RouterLink
        v-for="tab in tabsRight"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': isActive(tab.name) }"
        @click="tickFeedback()"
      >
        <component :is="tab.icon" :size="20" />
        <span>{{ t(tab.labelKey) }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 50%;
  bottom: calc(var(--space-3) + var(--safe-bottom));
  z-index: 40;
  width: min(
    calc(100% - (var(--space-4) * 2) - var(--safe-left) - var(--safe-right)),
    var(--content-max)
  );
  transform: translateX(-50%);
  border-radius: var(--radius-xl);
  border: 1px solid color-mix(in srgb, var(--color-outline) 18%, transparent);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1) var(--space-2);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.nav-inner {
  display: grid;
  align-items: center;
  min-height: calc(var(--nav-height) - 4px);
  transition: all 0.2s ease;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 48px;
  color: var(--color-muted);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: color var(--duration-fast) var(--ease-standard);
}

.tab--active {
  color: var(--color-primary);
}

.fab {
  width: 48px;
  height: 48px;
  margin: 0 var(--space-1);
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: var(--color-on-primary);
  box-shadow: var(--shadow-md);
  display: grid;
  place-items: center;
  transition: transform var(--duration-fast) var(--ease-standard);
}

.fab:active {
  transform: scale(0.94);
}
</style>
