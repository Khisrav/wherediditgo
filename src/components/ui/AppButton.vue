<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'filled' | 'tonal' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'filled',
    size: 'md',
    block: false,
    disabled: false,
    type: 'button',
  },
)

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--touch-min);
  border-radius: var(--radius-full);
  font-weight: 600;
  letter-spacing: 0.01em;
  transition:
    transform var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard),
    opacity var(--duration-fast) var(--ease-standard);
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn--block {
  width: 100%;
}

.btn--sm {
  min-height: 36px;
  padding: 0 var(--space-3);
  font-size: var(--text-label);
}

.btn--md {
  padding: 0 var(--space-5);
  font-size: var(--text-body);
}

.btn--lg {
  min-height: 52px;
  padding: 0 var(--space-6);
  font-size: 1.0625rem;
}

.btn--filled {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.btn--tonal {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}

.btn--outline {
  background: transparent;
  color: var(--color-primary);
  box-shadow: inset 0 0 0 1.5px var(--color-outline-variant);
}

.btn--ghost {
  background: transparent;
  color: var(--color-on-surface);
}

.btn--danger {
  background: var(--color-error);
  color: var(--color-on-error);
}
</style>
