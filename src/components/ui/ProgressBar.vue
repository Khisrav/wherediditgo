<script setup lang="ts">
defineProps<{
  value: number
  max?: number
  color?: string
}>()
</script>

<template>
  <div
    class="progress"
    role="progressbar"
    :aria-valuenow="Math.round(value)"
    aria-valuemin="0"
    :aria-valuemax="max ?? 100"
  >
    <div
      class="progress-fill"
      :style="{
        width: `${Math.min(100, Math.max(0, value))}%`,
        background: color || 'var(--color-primary)',
      }"
    />
  </div>
</template>

<style scoped>
.progress {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  transition: width var(--duration-slow) var(--ease-emphasized);
}
</style>
