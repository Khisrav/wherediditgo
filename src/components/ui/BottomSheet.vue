<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import { closeFeedback, openFeedback } from '@/services/native/haptics'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Fill a fixed height and let the slot manage scrolling (e.g. add-transaction). */
    contain?: boolean
  }>(),
  {
    title: '',
    contain: false,
  },
)

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const CLOSE_PX = 96
const CLOSE_FLICK = 0.55

const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let startTime = 0
let pointerId: number | null = null
let previouslyFocusedElement: HTMLElement | null = null

function getFocusableElements(): HTMLElement[] {
  if (!panelRef.value) return []
  return Array.from(
    panelRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'Tab') {
    const focusables = getFocusableElements()
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragging.value = true
  startY = e.clientY
  startTime = performance.now()
  dragY.value = 0
  pointerId = e.pointerId
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return
  dragY.value = Math.max(0, e.clientY - startY)
}

function finishDrag() {
  if (!dragging.value) return
  const dy = dragY.value
  const elapsed = Math.max(performance.now() - startTime, 1)
  const velocity = dy / elapsed
  dragging.value = false
  pointerId = null
  if (dy > CLOSE_PX || (dy > 36 && velocity > CLOSE_FLICK)) {
    dragY.value = 0
    emit('close')
    return
  }
  dragY.value = 0
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  finishDrag()
}

watch(
  () => props.open,
  async (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
    dragY.value = 0
    dragging.value = false
    pointerId = null

    if (v) {
      previouslyFocusedElement = document.activeElement as HTMLElement | null
      void openFeedback()
      await nextTick()
      const focusables = getFocusableElements()
      if (focusables.length > 0) {
        focusables[0].focus()
      } else {
        panelRef.value?.focus()
      }
    } else {
      void closeFeedback()
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        previouslyFocusedElement.focus()
      }
      previouslyFocusedElement = null
    }
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
        <button
          class="sheet-scrim"
          :class="{ 'sheet-scrim--dragging': dragging }"
          :style="dragY ? { opacity: String(Math.max(0.2, 1 - dragY / 360)) } : undefined"
          :aria-label="t('common.close')"
          type="button"
          @click="emit('close')"
        />
        <div
          ref="panelRef"
          class="sheet-panel surface-glass"
          :class="{ 'sheet-panel--contain': contain, 'sheet-panel--dragging': dragging }"
          :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Dialog'"
          tabindex="-1"
        >
          <div
            class="sheet-handle-hit"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <div class="sheet-handle" aria-hidden="true" />
          </div>
          <header v-if="title" class="sheet-header">
            <h2 class="sheet-title">{{ title }}</h2>
            <button type="button" class="sheet-close" :aria-label="t('common.close')" @click="emit('close')">
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
  background: color-mix(in srgb, #000 45%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  cursor: pointer;
}

.sheet-scrim--dragging {
  transition: none;
}

.sheet-panel {
  position: relative;
  width: min(100%, 560px);
  max-height: min(85dvh, 720px);
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid color-mix(in srgb, var(--color-outline) 18%, transparent);
  border-bottom: none;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: calc(var(--space-3) + var(--safe-bottom));
  will-change: transform;
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

@supports not (backdrop-filter: blur(1px)) {
  .sheet-panel {
    background: var(--color-surface);
  }
}

.sheet-panel:focus {
  outline: none;
}

.sheet-panel--contain {
  height: min(78dvh, 640px);
  max-height: min(78dvh, 640px);
}

@media (max-height: 520px) {
  .sheet-panel--contain {
    height: min(92dvh, 100%);
    max-height: min(92dvh, 100%);
  }
}

.sheet-panel--dragging {
  transition: none;
}

.sheet-handle-hit {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: var(--space-2) var(--space-8) var(--space-1);
  touch-action: none;
  cursor: grab;
}

.sheet-handle-hit:active {
  cursor: grabbing;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-outline-variant);
  pointer-events: none;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: var(--space-1) var(--space-4) var(--space-2);
  gap: var(--space-2);
}

.sheet-title {
  font-size: 1.125rem;
}

.sheet-close {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
}

.sheet-body {
  overflow: auto;
  padding: 0 var(--space-4) var(--space-2);
  flex: 1;
  min-height: 0;
}

.sheet-panel--contain .sheet-body {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
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

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel,
  .sheet-panel {
    transition: none;
  }
}
</style>
