<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSelect from '@/components/ui/AppSelect.vue'
import { APP_LOCALES } from '@/i18n'
import { CURRENCIES } from '@/lib/currencies'
import { toggleOffFeedback, toggleOnFeedback } from '@/services/native/haptics'
import { useSettingsStore } from '@/stores/settings'
import type { AppLocale, CurrencyPosition, ThemeMode } from '@/types/finance'

const { t } = useI18n()
const settings = useSettingsStore()

const currencyOptions = computed(() =>
  CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.code} — ${t(`currencies.${c.nameKey}`)}`,
  })),
)

const languageOptions = computed(() =>
  APP_LOCALES.map((code) => ({
    value: code,
    label: t(`languages.${code}`),
  })),
)

const currencyPositionOptions = computed(() => [
  { value: 'before', label: t('settings.currencyBefore') },
  { value: 'after', label: t('settings.currencyAfter') },
])

async function onTheme(mode: ThemeMode) {
  if (settings.theme === mode) return
  await settings.setTheme(mode)
  if (mode === 'dark') void toggleOnFeedback()
  else void toggleOffFeedback()
}

async function onCurrency(code: string) {
  await settings.setCurrency(code)
}

async function onCurrencyPosition(value: string) {
  await settings.setCurrencyPosition(value as CurrencyPosition)
}

async function onLocale(code: string) {
  await settings.setLocale(code as AppLocale)
}
</script>

<template>
  <section class="card" aria-labelledby="appearance-title">
    <h2 id="appearance-title" class="section-title">{{ t('settings.appearance') }}</h2>

    <div class="field">
      <span id="theme-label" class="label">{{ t('settings.appearance') }}</span>
      <div class="segmented" role="radiogroup" aria-labelledby="theme-label">
        <button
          type="button"
          role="radio"
          class="seg-btn"
          :class="{ 'seg-btn--on': settings.theme === 'system' }"
          :aria-checked="settings.theme === 'system'"
          @click="onTheme('system')"
        >
          {{ t('themes.system') }}
        </button>
        <button
          type="button"
          role="radio"
          class="seg-btn"
          :class="{ 'seg-btn--on': settings.theme === 'light' }"
          :aria-checked="settings.theme === 'light'"
          @click="onTheme('light')"
        >
          {{ t('themes.light') }}
        </button>
        <button
          type="button"
          role="radio"
          class="seg-btn"
          :class="{ 'seg-btn--on': settings.theme === 'dark' }"
          :aria-checked="settings.theme === 'dark'"
          @click="onTheme('dark')"
        >
          {{ t('themes.dark') }}
        </button>
      </div>
    </div>

    <label class="field">
      <span class="label">{{ t('settings.language') }}</span>
      <AppSelect
        :model-value="settings.locale"
        :options="languageOptions"
        :aria-label="t('settings.language')"
        @update:model-value="onLocale"
      />
    </label>

    <label class="field">
      <span class="label">{{ t('settings.currency') }}</span>
      <AppSelect
        :model-value="settings.currency"
        :options="currencyOptions"
        :aria-label="t('settings.currency')"
        @update:model-value="onCurrency"
      />
    </label>

    <label class="field">
      <span class="label">{{ t('settings.currencyPosition') }}</span>
      <AppSelect
        :model-value="settings.currencyPosition"
        :options="currencyPositionOptions"
        :aria-label="t('settings.currencyPosition')"
        @update:model-value="onCurrencyPosition"
      />
    </label>
  </section>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-title {
  font-size: var(--text-title);
  color: var(--color-on-surface);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg-btn {
  min-height: 36px;
  border-radius: var(--radius-full);
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.seg-btn--on {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}
</style>
