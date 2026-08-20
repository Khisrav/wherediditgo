<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { WifiOff } from '@lucide/vue'
import MobileBottomNav from '@/app/layouts/MobileBottomNav.vue'
import QuickAddSheet from '@/features/transactions/QuickAddSheet.vue'
import PaywallModal from '@/components/PaywallModal.vue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { usePremiumStore } from '@/stores/premium'

const route = useRoute()
const showNav = computed(() => route.meta.hideNav !== true)
const { isOnline } = useNetworkStatus()
const premium = usePremiumStore()

onMounted(() => {
  void premium.load()
})
</script>

<template>
  <div class="shell">
    <Transition name="offline-banner">
      <div v-if="!isOnline" class="offline-bar" role="status" aria-live="polite">
        <WifiOff :size="14" />
        <span>Offline — changes saved locally</span>
      </div>
    </Transition>
    <main class="main" :class="{ 'main--nav': showNav }">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <MobileBottomNav v-if="showNav" />
    <QuickAddSheet />
    <PaywallModal />
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
  padding-bottom: calc(
    var(--nav-height) + var(--space-3) + var(--safe-bottom) + var(--space-8)
  );
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

.offline-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: color-mix(in srgb, var(--color-warning) 18%, var(--color-surface));
  border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
  color: var(--color-warning);
  font-size: var(--text-caption);
  font-weight: 600;
  text-align: center;
}

.offline-banner-enter-active,
.offline-banner-leave-active {
  transition: all var(--duration-normal) var(--ease-standard);
}

.offline-banner-enter-from,
.offline-banner-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
