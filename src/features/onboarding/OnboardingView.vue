<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { CURRENCIES, defaultCurrencyForLocale } from '@/lib/currencies'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()
const router = useRouter()

const currencyOptions = computed(() =>
  CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.code} — ${t(`currencies.${c.nameKey}`)}`,
  })),
)

const selected = ref(settings.currency || defaultCurrencyForLocale(settings.locale))
const busy = ref(false)

async function start() {
  busy.value = true
  try {
    await settings.completeOnboarding(selected.value)
    await router.replace('/')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="onboarding">
    <div class="hero">
      <p class="brand">{{ t('onboarding.brand') }}</p>
      <h1>{{ t('onboarding.title') }}</h1>
      <p class="lede">{{ t('onboarding.lede') }}</p>
    </div>

    <label class="field">
      <span>{{ t('onboarding.yourCurrency') }}</span>
      <AppSelect
        v-model="selected"
        :options="currencyOptions"
        :aria-label="t('onboarding.yourCurrency')"
      />
    </label>

    <ul class="perks">
      <li>{{ t('onboarding.perk1') }}</li>
      <li>{{ t('onboarding.perk2') }}</li>
      <li>{{ t('onboarding.perk3') }}</li>
    </ul>

    <AppButton block size="lg" :disabled="busy" @click="start">
      {{ busy ? t('onboarding.settingUp') : t('onboarding.getStarted') }}
    </AppButton>
  </div>
</template>

<style scoped>
.onboarding {
  min-height: calc(100vh - var(--safe-top) - var(--safe-bottom));
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-6);
  padding: var(--space-2) 0 var(--space-8);
}

.hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.brand {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.02em;
}

h1 {
  font-size: clamp(2rem, 8vw, 2.75rem);
  max-width: 12ch;
}

.lede {
  color: var(--color-on-surface-variant);
  max-width: 34ch;
  font-size: 1.0625rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field span {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.perks {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.perks li {
  position: relative;
  padding-left: var(--space-5);
  color: var(--color-on-surface-variant);
}

.perks li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
}
</style>
