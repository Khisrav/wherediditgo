<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import MobileBottomNav from '@/app/layouts/MobileBottomNav.vue'
import QuickAddSheet from '@/features/transactions/QuickAddSheet.vue'

const route = useRoute()
const showNav = computed(() => route.meta.hideNav !== true)
</script>

<template>
  <div class="shell">
    <main class="main" :class="{ 'main--nav': showNav }">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <MobileBottomNav v-if="showNav" />
    <QuickAddSheet />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  width: min(100%, var(--content-max));
  margin: 0 auto;
  padding:
    calc(var(--space-4) + var(--safe-top))
    var(--space-4)
    var(--space-6);
}

.main--nav {
  padding-bottom: calc(var(--nav-height) + var(--fab-size) / 2 + var(--safe-bottom) + var(--space-6));
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
