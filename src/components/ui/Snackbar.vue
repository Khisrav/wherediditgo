<script setup lang="ts">
import { onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    message: string
    actionLabel?: string
    duration?: number
    nonce?: string
  }>(),
  {
    actionLabel: '',
    duration: 5000,
    nonce: '',
  },
)

const emit = defineEmits<{
  action: []
  'update:open': [boolean]
}>()

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function startTimer() {
  clearTimer()
  if (!props.open || props.duration <= 0) return
  timer = setTimeout(() => emit('update:open', false), props.duration)
}

watch(
  () => [props.open, props.nonce] as const,
  ([open]) => {
    if (open) startTimer()
    else clearTimer()
  },
)

function onAction() {
  clearTimer()
  emit('action')
}

onUnmounted(clearTimer)
</script>

<template>
  <Teleport to="body">
    <Transition name="snack">
      <div
        v-if="open"
        class="snack"
        role="status"
        aria-live="polite"
      >
        <p class="snack-msg">{{ message }}</p>
        <button
          v-if="actionLabel"
          type="button"
          class="snack-action"
          @click="onAction"
        >
          {{ actionLabel }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.snack {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--nav-height) + var(--space-3) + var(--safe-bottom) + var(--space-3));
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: min(
    calc(100% - (var(--space-4) * 2) - var(--safe-left) - var(--safe-right)),
    var(--content-max)
  );
  margin-inline: auto;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-on-surface);
  color: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.snack-msg {
  flex: 1;
  min-width: 0;
  font-size: var(--text-label);
  font-weight: 550;
}

.snack-action {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-label);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-primary-container);
}

.snack-enter-active,
.snack-leave-active {
  transition:
    opacity var(--duration-normal) var(--ease-standard),
    transform var(--duration-normal) var(--ease-emphasized);
}

.snack-enter-from,
.snack-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .snack-enter-active,
  .snack-leave-active {
    transition: none;
  }

  .snack-enter-from,
  .snack-leave-to {
    transform: none;
  }
}
</style>
