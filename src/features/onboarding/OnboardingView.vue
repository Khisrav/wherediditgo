<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const router = useRouter()

const currencies = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'MXN', label: 'Mexican Peso' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'PLN', label: 'Polish Zloty' },
  { code: 'TRY', label: 'Turkish Lira' },
  { code: 'UAH', label: 'Ukrainian Hryvnia' },
  { code: 'KZT', label: 'Kazakhstani Tenge' },
  { code: 'RUB', label: 'Russian Ruble' },
]

const selected = ref(settings.currency || 'USD')
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
      <p class="brand">WhereDidItGo</p>
      <h1>Know where every dollar went</h1>
      <p class="lede">
        Track spending, set simple budgets, and see clear stats — all stored only on this device.
      </p>
    </div>

    <label class="field">
      <span>Your currency</span>
      <select v-model="selected">
        <option v-for="c in currencies" :key="c.code" :value="c.code">
          {{ c.code }} — {{ c.label }}
        </option>
      </select>
    </label>

    <ul class="perks">
      <li>Log expenses in a few taps</li>
      <li>Monthly budgets with progress</li>
      <li>Export a backup when you switch phones</li>
    </ul>

    <AppButton block size="lg" :disabled="busy" @click="start">
      {{ busy ? 'Setting up…' : 'Get started' }}
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

.field select {
  min-height: 52px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
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
