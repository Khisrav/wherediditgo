<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2 } from '@lucide/vue'
import { tickFeedback } from '@/services/native/haptics'

const ACTION = 76

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  delete: []
}>()

const { t } = useI18n()
const offset = ref(0)
const dragging = ref(false)
let startX = 0
let startY = 0
let startOffset = 0
let axis: 'h' | 'v' | null = null
let pointerId: number | null = null

watch(
  () => props.open,
  (v) => {
    if (!dragging.value) offset.value = v ? -ACTION : 0
  },
)

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragging.value = true
  startX = e.clientX
  startY = e.clientY
  startOffset = offset.value
  axis = null
  pointerId = e.pointerId
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!axis) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    if (axis === 'h') void tickFeedback()
  }
  if (axis !== 'h') return
  offset.value = Math.min(0, Math.max(-ACTION * 1.35, startOffset + dx))
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  dragging.value = false
  pointerId = null
  if (axis !== 'h') {
    axis = null
    return
  }
  axis = null
  if (offset.value <= -ACTION * 0.45) {
    offset.value = -ACTION
    emit('update:open', true)
  } else {
    offset.value = 0
    emit('update:open', false)
  }
}

function onFrontClick(e: MouseEvent) {
  if (props.open || offset.value < -4) {
    e.preventDefault()
    e.stopPropagation()
    offset.value = 0
    emit('update:open', false)
  }
}
</script>

<template>
  <div class="swipe">
    <button type="button" class="action" :aria-label="t('activity.deleteAria')" @click="emit('delete')">
      <Trash2 :size="18" />
    </button>
    <div
      class="front"
      :class="{ 'front--dragging': dragging }"
      :style="{ transform: `translate3d(${offset}px, 0, 0)` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onFrontClick"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  overflow: hidden;
}

.action {
  position: absolute;
  inset: 0 0 0 auto;
  width: 76px;
  display: grid;
  place-items: center;
  background: var(--color-tertiary-container);
  color: var(--color-error);
  border-radius: var(--radius-lg);
}

.front {
  position: relative;
  z-index: 1;
  background: var(--color-surface);
  touch-action: pan-y;
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

.front--dragging {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .front {
    transition: none;
  }
}
</style>
