<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Check, ChevronDown } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    ariaLabel?: string
  }>(),
  {
    placeholder: '',
    disabled: false,
    ariaLabel: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const { t } = useI18n()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const activeIndex = ref(-1)
const menuStyle = ref<Record<string, string>>({})

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

const displayLabel = computed(
  () => selected.value?.label ?? (props.placeholder || t('select.placeholder')),
)

const listboxId = `app-select-${Math.random().toString(36).slice(2, 9)}`

function enabledOptions() {
  return props.options.filter((o) => !o.disabled)
}

function indexOfValue(value: string) {
  return enabledOptions().findIndex((o) => o.value === value)
}

function placeMenu() {
  const trigger = triggerEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  const estimated = Math.min(320, Math.max(120, enabledOptions().length * 48 + 16))
  const openUp = spaceBelow < estimated && spaceAbove > spaceBelow
  const maxH = Math.min(320, openUp ? spaceAbove - 12 : spaceBelow - 12)

  menuStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.max(120, maxH)}px`,
    zIndex: '120',
    ...(openUp
      ? { bottom: `${window.innerHeight - rect.top + 6}px`, top: 'auto' }
      : { top: `${rect.bottom + 6}px`, bottom: 'auto' }),
  }
}

async function openMenu() {
  if (props.disabled) return
  placeMenu()
  open.value = true
  activeIndex.value = Math.max(0, indexOfValue(props.modelValue))
  await nextTick()
  const active = listEl.value?.querySelector<HTMLElement>('[data-active="true"]')
  active?.scrollIntoView({ block: 'nearest' })
}

function closeMenu(focusTrigger = true) {
  open.value = false
  activeIndex.value = -1
  if (focusTrigger) triggerEl.value?.focus()
}

function toggle() {
  if (open.value) closeMenu()
  else void openMenu()
}

function pick(option: SelectOption) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  closeMenu()
}

function onDocPointer(e: PointerEvent) {
  if (!open.value) return
  const target = e.target as Node
  if (root.value?.contains(target) || listEl.value?.contains(target)) return
  closeMenu(false)
}

function onScrollOrResize() {
  if (!open.value) return
  placeMenu()
}

function onKey(e: KeyboardEvent) {
  if (!open.value) {
    if (e.target !== triggerEl.value) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      void openMenu()
    }
    return
  }

  const opts = enabledOptions()
  if (!opts.length) return

  if (e.key === 'Escape') {
    e.preventDefault()
    closeMenu()
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % opts.length
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + opts.length) % opts.length
    return
  }

  if (e.key === 'Home') {
    e.preventDefault()
    activeIndex.value = 0
    return
  }

  if (e.key === 'End') {
    e.preventDefault()
    activeIndex.value = opts.length - 1
    return
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const opt = opts[activeIndex.value]
    if (opt) pick(opt)
  }
}

function isActiveOption(opt: SelectOption) {
  if (opt.disabled) return false
  return enabledOptions()[activeIndex.value]?.value === opt.value
}

watch(activeIndex, async () => {
  if (!open.value) return
  await nextTick()
  listEl.value?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
    block: 'nearest',
  })
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onScrollOrResize)
  window.addEventListener('scroll', onScrollOrResize, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onScrollOrResize)
  window.removeEventListener('scroll', onScrollOrResize, true)
})
</script>

<template>
  <div ref="root" class="select" :class="{ 'select--open': open, 'select--disabled': disabled }">
    <button
      ref="triggerEl"
      type="button"
      class="select-trigger"
      :disabled="disabled"
      :aria-label="ariaLabel || undefined"
      :aria-expanded="open"
      :aria-controls="listboxId"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="select-value" :class="{ 'select-value--placeholder': !selected }">
        {{ displayLabel }}
      </span>
      <ChevronDown class="select-chevron" :size="18" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="select-menu">
        <ul
          v-if="open"
          :id="listboxId"
          ref="listEl"
          class="select-menu"
          role="listbox"
          :style="menuStyle"
          :aria-activedescendant="
            activeIndex >= 0
              ? `${listboxId}-opt-${enabledOptions()[activeIndex]?.value}`
              : undefined
          "
        >
          <li
            v-for="opt in options"
            :id="`${listboxId}-opt-${opt.value}`"
            :key="opt.value"
            role="option"
            class="select-option"
            :class="{
              'select-option--selected': opt.value === modelValue,
              'select-option--active': isActiveOption(opt),
              'select-option--disabled': opt.disabled,
            }"
            :aria-selected="opt.value === modelValue"
            :aria-disabled="opt.disabled || undefined"
            :data-active="isActiveOption(opt) ? 'true' : undefined"
            @pointerdown.prevent
            @click="pick(opt)"
            @mouseenter="!opt.disabled && (activeIndex = enabledOptions().findIndex((o) => o.value === opt.value))"
          >
            <span class="select-option-label">{{ opt.label }}</span>
            <Check
              v-if="opt.value === modelValue"
              class="select-check"
              :size="16"
              aria-hidden="true"
            />
          </li>
        </ul>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  width: 100%;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  color: var(--color-on-surface);
  text-align: left;
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

.select--open .select-trigger {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.select-trigger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.select-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 550;
}

.select-value--placeholder {
  color: var(--color-muted);
  font-weight: 500;
}

.select-chevron {
  flex-shrink: 0;
  color: var(--color-muted);
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

.select--open .select-chevron {
  transform: rotate(180deg);
  color: var(--color-primary);
}

.select-menu {
  margin: 0;
  padding: var(--space-1);
  overflow: auto;
  list-style: none;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: calc(var(--radius-md) - 4px);
  cursor: pointer;
  font-weight: 550;
  font-size: var(--text-body);
}

.select-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-option--active {
  background: var(--color-surface-container);
}

.select-option--selected {
  color: var(--color-primary);
}

.select-option--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.select-check {
  flex-shrink: 0;
  color: var(--color-primary);
}

.select-menu-enter-active,
.select-menu-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-emphasized);
}

.select-menu-enter-from,
.select-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
