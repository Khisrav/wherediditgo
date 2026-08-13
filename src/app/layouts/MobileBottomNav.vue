<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChartPie, Home, List, PiggyBank, Plus } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'
import { tapFeedback } from '@/services/native/haptics'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()

const tabs = [
  { to: '/', name: 'home', labelKey: 'nav.home', icon: Home },
  { to: '/activity', name: 'activity', labelKey: 'nav.activity', icon: List },
  { to: '/budgets', name: 'budgets', labelKey: 'nav.budgets', icon: PiggyBank },
  { to: '/insights', name: 'insights', labelKey: 'nav.insights', icon: ChartPie },
] as const

function isActive(name: string) {
  return route.name === name
}

function openAdd() {
  void tapFeedback()
  ui.openAdd()
}
</script>

<template>
  <nav class="nav surface-glass" :aria-label="t('nav.main')">
    <div class="nav-inner">
      <RouterLink
        v-for="tab in tabs.slice(0, 2)"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': isActive(tab.name) }"
      >
        <component :is="tab.icon" :size="22" />
        <span>{{ t(tab.labelKey) }}</span>
      </RouterLink>

      <button type="button" class="fab" :aria-label="t('nav.addTransaction')" @click="openAdd">
        <Plus :size="26" :stroke-width="2.5" />
      </button>

      <RouterLink
        v-for="tab in tabs.slice(2)"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': isActive(tab.name) }"
      >
        <component :is="tab.icon" :size="22" />
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
}

.nav-inner {
  display: grid;
  grid-template-columns: 1fr 1fr auto 1fr 1fr;
  align-items: center;
  min-height: calc(var(--nav-height) - 4px);
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
