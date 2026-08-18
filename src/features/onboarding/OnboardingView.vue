<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { db } from '@/db'
import { CURRENCIES, defaultCurrencyForLocale } from '@/lib/currencies'
import { parseMoneyToMinor } from '@/lib/money'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()
const categories = useCategoriesStore()
const router = useRouter()

type Step = 'currency' | 'accounts' | 'budgets'
const step = ref<Step>('currency')
const busy = ref(false)

const currencyOptions = computed(() =>
  CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.code} — ${t(`currencies.${c.nameKey}`)}`,
  })),
)

const selected = ref(settings.currency || defaultCurrencyForLocale(settings.locale))

const starters = ref<Array<{ id: string; name: string; balanceStr: string }>>([])

const expenseOptions = computed(() =>
  categories.expense.map((c) => ({ value: c.id, label: c.name })),
)

const budgetSlots = ref([
  { categoryId: '', amountStr: '' },
  { categoryId: '', amountStr: '' },
])

onMounted(async () => {
  const rows = await db.accounts.toArray()
  starters.value = rows
    .filter((a) => !a.archived)
    .slice(0, 2)
    .map((a) => ({
      id: a.id,
      name: a.name,
      balanceStr: a.balance ? (a.balance / 100).toFixed(2) : '0',
    }))
})

watch(
  () => categories.expense,
  (list) => {
    if (!budgetSlots.value[0]?.categoryId && list[0]) budgetSlots.value[0].categoryId = list[0].id
    if (!budgetSlots.value[1]?.categoryId && list[1]) budgetSlots.value[1].categoryId = list[1].id
  },
  { immediate: true },
)

const stepIndex = computed(() => (step.value === 'currency' ? 0 : step.value === 'accounts' ? 1 : 2))

function goAccounts() {
  step.value = 'accounts'
}

function goBudgets() {
  step.value = 'budgets'
}

async function finish(skipBudgets = false) {
  busy.value = true
  try {
    const seen = new Set<string>()
    const budgets = skipBudgets
      ? []
      : budgetSlots.value
          .map((slot) => ({
            categoryId: slot.categoryId,
            limitAmount: parseMoneyToMinor(slot.amountStr),
          }))
          .filter((b) => {
            if (!b.categoryId || b.limitAmount <= 0 || seen.has(b.categoryId)) return false
            seen.add(b.categoryId)
            return true
          })
          .slice(0, 2)

    await settings.completeOnboarding({
      currency: selected.value,
      accounts: starters.value.map((a) => ({
        id: a.id,
        name: a.name,
        balance: Math.max(0, parseMoneyToMinor(a.balanceStr)),
      })),
      budgets,
    })
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
      <p class="steps" aria-hidden="true">
        <span :class="{ on: stepIndex >= 0 }" />
        <span :class="{ on: stepIndex >= 1 }" />
        <span :class="{ on: stepIndex >= 2 }" />
      </p>
      <h1 v-if="step === 'currency'">{{ t('onboarding.title') }}</h1>
      <h1 v-else-if="step === 'accounts'">{{ t('onboarding.accountsTitle') }}</h1>
      <h1 v-else>{{ t('onboarding.budgetsTitle') }}</h1>
      <p class="lede">
        <template v-if="step === 'currency'">{{ t('onboarding.lede') }}</template>
        <template v-else-if="step === 'accounts'">{{ t('onboarding.accountsLede') }}</template>
        <template v-else>{{ t('onboarding.budgetsLede') }}</template>
      </p>
    </div>

    <template v-if="step === 'currency'">
      <label class="field">
        <span>{{ t('onboarding.yourCurrency') }}</span>
        <AppSelect
          v-model="selected"
          :options="currencyOptions"
          :aria-label="t('onboarding.yourCurrency')"
        />
      </label>
      <AppButton block size="lg" @click="goAccounts">{{ t('common.next') }}</AppButton>
    </template>

    <template v-else-if="step === 'accounts'">
      <div v-for="acc in starters" :key="acc.id" class="card">
        <label class="field">
          <span>{{ t('accounts.name') }}</span>
          <input v-model="acc.name" type="text" maxlength="40" />
        </label>
        <label class="field">
          <span>{{ t('onboarding.balance') }}</span>
          <input
            v-model="acc.balanceStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
      </div>
      <AppButton block size="lg" @click="goBudgets">{{ t('common.next') }}</AppButton>
    </template>

    <template v-else>
      <div v-for="(slot, i) in budgetSlots" :key="i" class="card">
        <label class="field">
          <span>{{ t('onboarding.budgetCategory') }}</span>
          <AppSelect
            v-model="slot.categoryId"
            :options="expenseOptions"
            :aria-label="t('onboarding.budgetCategory')"
          />
        </label>
        <label class="field">
          <span>{{ t('onboarding.budgetLimit') }}</span>
          <input
            v-model="slot.amountStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="t('common.optional')"
          />
        </label>
      </div>
      <AppButton block size="lg" :disabled="busy" @click="finish(false)">
        {{ busy ? t('onboarding.settingUp') : t('onboarding.finish') }}
      </AppButton>
      <AppButton variant="ghost" block :disabled="busy" @click="finish(true)">
        {{ t('common.skip') }}
      </AppButton>
    </template>
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

.steps {
  display: flex;
  gap: var(--space-2);
}

.steps span {
  width: 28px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-highest);
}

.steps span.on {
  background: var(--color-primary);
}

h1 {
  font-size: clamp(2rem, 8vw, 2.75rem);
  max-width: 14ch;
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

.field input {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}
</style>
