<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Plus } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { parseMoneyToMinor } from '@/lib/money'
import { useAccountsStore } from '@/stores/accounts'
import { useSettingsStore } from '@/stores/settings'
import type { Account, AccountType } from '@/types/finance'

const { t } = useI18n()
const router = useRouter()
const accounts = useAccountsStore()
const settings = useSettingsStore()

const sheetOpen = ref(false)
const editing = ref<Account | null>(null)
const name = ref('')
const type = ref('checking')
const balanceStr = ref('')
const color = ref('#0b6e6a')

const types: AccountType[] = ['cash', 'checking', 'savings', 'credit', 'other']

const typeOptions = computed(() =>
  types.map((value) => ({
    value,
    label: t(`accountTypes.${value}`),
  })),
)

const typeIcons: Record<AccountType, string> = {
  cash: 'banknote',
  checking: 'wallet',
  savings: 'piggy-bank',
  credit: 'credit-card',
  other: 'circle',
}

function openNew() {
  editing.value = null
  name.value = ''
  type.value = 'checking'
  balanceStr.value = '0'
  color.value = '#0b6e6a'
  sheetOpen.value = true
}

function openEdit(acc: Account) {
  editing.value = acc
  name.value = acc.name
  type.value = acc.type
  balanceStr.value = (acc.balance / 100).toFixed(2)
  color.value = acc.color
  sheetOpen.value = true
}

async function save() {
  const balance = parseMoneyToMinor(balanceStr.value)
  if (!name.value.trim()) return
  if (editing.value) {
    await accounts.updateAccount(editing.value.id, {
      name: name.value.trim(),
      type: type.value as AccountType,
      balance,
      color: color.value,
    })
  } else {
    await accounts.addAccount({
      name: name.value,
      type: type.value as AccountType,
      balance,
      color: color.value,
      currency: settings.currency,
    })
  }
  sheetOpen.value = false
}

async function archive() {
  if (!editing.value) return
  if (!window.confirm(t('accounts.archiveConfirm', { name: editing.value.name }))) return
  await accounts.archiveAccount(editing.value.id)
  sheetOpen.value = false
}
</script>

<template>
  <div class="accounts">
    <header>
      <button type="button" class="back" :aria-label="t('common.back')" @click="router.back()">
        <ArrowLeft :size="22" />
      </button>
      <h1>{{ t('accounts.title') }}</h1>
      <button type="button" class="add" :aria-label="t('accounts.addAccount')" @click="openNew">
        <Plus :size="22" />
      </button>
    </header>

    <p class="total">
      {{ t('common.net') }}
      <strong><MoneyText :amount="accounts.totalBalance" /></strong>
    </p>

    <div class="list">
      <button
        v-for="acc in accounts.active"
        :key="acc.id"
        type="button"
        class="card"
        @click="openEdit(acc)"
      >
        <span class="icon" :style="{ background: `color-mix(in srgb, ${acc.color} 22%, transparent)` }">
          <IconByName :name="typeIcons[acc.type]" :size="20" />
        </span>
        <span class="meta">
          <strong>{{ acc.name }}</strong>
          <span>
            {{ t(`accountTypes.${acc.type}`) }}
            <template v-if="acc.type === 'credit'"> · {{ t('accounts.owed') }}</template>
          </span>
        </span>
        <span class="bal"><MoneyText :amount="acc.balance" /></span>
      </button>
    </div>

    <BottomSheet
      :open="sheetOpen"
      :title="editing ? t('accounts.editAccount') : t('accounts.newAccount')"
      @close="sheetOpen = false"
    >
      <div class="sheet">
        <label class="field">
          <span>{{ t('accounts.name') }}</span>
          <input v-model="name" type="text" maxlength="40" />
        </label>
        <label class="field">
          <span>{{ t('accounts.type') }}</span>
          <AppSelect v-model="type" :options="typeOptions" :aria-label="t('accounts.type')" />
        </label>
        <label class="field">
          <span>{{ type === 'credit' ? t('accounts.owed') : t('accounts.balance') }}</span>
          <input
            v-model="balanceStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
        <p v-if="type === 'credit'" class="hint">{{ t('accounts.creditOwedHint') }}</p>
        <label class="field">
          <span>{{ t('accounts.color') }}</span>
          <input v-model="color" type="color" />
        </label>
        <AppButton block size="lg" @click="save">{{ t('common.save') }}</AppButton>
        <AppButton v-if="editing" variant="danger" block @click="archive">
          {{ t('accounts.archive') }}
        </AppButton>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.accounts {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-2);
}

.back,
.add {
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--color-surface);
}

h1 {
  font-size: var(--text-headline);
  text-align: center;
}

.total {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 600;
}

.total strong {
  font-family: var(--font-display);
  font-size: var(--text-title);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: left;
}

.icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta span {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.bal {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
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

.field input[type='color'] {
  padding: var(--space-2);
  height: 48px;
}

.hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}
</style>
