<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { ChartPie, Home, List, PiggyBank, Plus } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'
import { tapFeedback } from '@/services/native/haptics'

const route = useRoute()
const ui = useUiStore()

const tabs = [
  { to: '/', name: 'home', label: 'Home', icon: Home },
  { to: '/activity', name: 'activity', label: 'Activity', icon: List },
  { to: '/budgets', name: 'budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/insights', name: 'insights', label: 'Insights', icon: ChartPie },
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
  <nav class="nav surface-glass" aria-label="Main">
    <div class="nav-inner">
      <RouterLink
        v-for="tab in tabs.slice(0, 2)"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': isActive(tab.name) }"
      >
        <component :is="tab.icon" :size="22" />
        <span>{{ tab.label }}</span>
      </RouterLink>

      <button type="button" class="fab" aria-label="Add transaction" @click="openAdd">
        <Plus :size="28" :stroke-width="2.5" />
      </button>

      <RouterLink
        v-for="tab in tabs.slice(2)"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': isActive(tab.name) }"
      >
        <component :is="tab.icon" :size="22" />
        <span>{{ tab.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  border-top: 1px solid color-mix(in srgb, var(--color-outline) 14%, transparent);
  border-left: none;
  border-right: none;
  border-bottom: none;
  border-radius: 0;
  padding-bottom: var(--safe-bottom);
}

.nav-inner {
  display: grid;
  grid-template-columns: 1fr 1fr auto 1fr 1fr;
  align-items: center;
  max-width: var(--content-max);
  margin: 0 auto;
  min-height: var(--nav-height);
  padding: var(--space-1) var(--space-2) 0;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 52px;
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
  width: var(--fab-size);
  height: var(--fab-size);
  margin: 0 var(--space-2);
  margin-top: -22px;
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
