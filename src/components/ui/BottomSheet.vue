<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    tall?: boolean
  }>(),
  {
    title: '',
    tall: false,
  },
)

const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-root" role="presentation">
        <button class="sheet-scrim" aria-label="Close" type="button" @click="emit('close')" />
        <div
          class="sheet-panel"
          :class="{ 'sheet-panel--tall': tall }"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Dialog'"
        >
          <div class="sheet-handle" aria-hidden="true" />
          <header v-if="title" class="sheet-header">
            <h2 class="sheet-title">{{ title }}</h2>
            <button type="button" class="sheet-close" aria-label="Close" @click="emit('close')">
              <X :size="20" />
            </button>
          </header>
          <div class="sheet-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, #000 42%, transparent);
  border: none;
  cursor: pointer;
}

.sheet-panel {
  position: relative;
  width: min(100%, 560px);
  max-height: min(92vh, 860px);
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--space-4) + var(--safe-bottom));
}

.sheet-panel--tall {
  height: min(92vh, 860px);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-outline-variant);
  margin: var(--space-3) auto var(--space-2);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-5) var(--space-3);
}

.sheet-title {
  font-size: var(--text-title);
}

.sheet-close {
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
}

.sheet-body {
  overflow: auto;
  padding: 0 var(--space-5) var(--space-4);
  flex: 1;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--duration-normal) var(--ease-standard);
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform var(--duration-slow) var(--ease-emphasized);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
