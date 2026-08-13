<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Download, Upload, FileSpreadsheet, Plus, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconByName from '@/components/ui/IconByName.vue'
import {
  exportBackupFile,
  exportTransactionsCsv,
  parseBackupJson,
  replaceFromBackup,
} from '@/services/backup'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import type { CategoryKind, ThemeMode } from '@/types/finance'

const router = useRouter()
const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const transactions = useTransactionsStore()

const message = ref('')
const error = ref('')
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const catSheetOpen = ref(false)
const newCatName = ref('')
const newCatKind = ref<CategoryKind>('expense')

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'BRL', 'KZT', 'UAH', 'TRY', 'PLN']

const expenseCats = computed(() => categories.expense)
const incomeCats = computed(() => categories.income)

async function onTheme(mode: ThemeMode) {
  await settings.setTheme(mode)
}

async function onCurrency(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  await settings.setCurrency(value)
}

async function doExport() {
  try {
    await exportBackupFile()
    message.value = 'Backup ready to share or download.'
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Export failed'
  }
}

async function doCsv() {
  try {
    await exportTransactionsCsv()
    message.value = 'CSV export started.'
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'CSV export failed'
  }
}

function pickImport() {
  fileInput.value?.click()
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  error.value = ''
  message.value = ''
  try {
    const text = await file.text()
    const payload = parseBackupJson(text)
    const ok = window.confirm(
      'Replace ALL data on this device with the backup? This cannot be undone.',
    )
    if (!ok) return
    await replaceFromBackup(payload)
    await settings.load()
    message.value = 'Backup imported successfully.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Import failed'
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function addCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  await categories.addCategory({ name, kind: newCatKind.value })
  newCatName.value = ''
  catSheetOpen.value = false
}

async function removeCategory(id: string, name: string) {
  const used = transactions.transactions.some((t) => t.categoryId === id)
  if (used) {
    window.alert(`“${name}” is used by transactions. Reassign or delete those first.`)
    return
  }
  const ok = window.confirm(`Delete category “${name}”?`)
  if (!ok) return
  await categories.removeCategory(id)
  const related = budgets.budgets.filter((b) => b.categoryId === id)
  await Promise.all(related.map((b) => budgets.removeBudget(b.id)))
}
</script>

<template>
  <div class="settings">
    <header>
      <button type="button" class="back" aria-label="Back" @click="router.back()">
        <ArrowLeft :size="22" />
      </button>
      <h1>Settings</h1>
    </header>

    <section class="panel">
      <h2>Appearance</h2>
      <div class="seg">
        <button
          v-for="mode in (['system', 'light', 'dark'] as const)"
          :key="mode"
          type="button"
          :class="{ active: settings.theme === mode }"
          @click="onTheme(mode)"
        >
          {{ mode }}
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>Currency</h2>
      <select :value="settings.currency" @change="onCurrency">
        <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
      </select>
    </section>

    <section class="panel">
      <h2>Accounts</h2>
      <p class="muted">{{ accounts.active.length }} active accounts</p>
      <AppButton variant="tonal" block @click="router.push('/accounts')">Manage accounts</AppButton>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Categories</h2>
        <button type="button" class="icon-add" aria-label="Add category" @click="catSheetOpen = true">
          <Plus :size="18" />
        </button>
      </div>
      <p class="muted">Expense</p>
      <ul class="cat-list">
        <li v-for="c in expenseCats" :key="c.id">
          <span class="dot" :style="{ background: c.color }" />
          <IconByName :name="c.icon" :size="16" />
          <span class="name">{{ c.name }}</span>
          <button type="button" class="trash" aria-label="Delete" @click="removeCategory(c.id, c.name)">
            <Trash2 :size="16" />
          </button>
        </li>
      </ul>
      <p class="muted">Income</p>
      <ul class="cat-list">
        <li v-for="c in incomeCats" :key="c.id">
          <span class="dot" :style="{ background: c.color }" />
          <IconByName :name="c.icon" :size="16" />
          <span class="name">{{ c.name }}</span>
          <button type="button" class="trash" aria-label="Delete" @click="removeCategory(c.id, c.name)">
            <Trash2 :size="16" />
          </button>
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2>Backup & export</h2>
      <p class="muted">
        Everything stays on this phone. Export a JSON backup to move to a new device.
      </p>
      <div class="stack">
        <AppButton variant="filled" block @click="doExport">
          <Download :size="18" /> Export backup
        </AppButton>
        <AppButton variant="tonal" block :disabled="importing" @click="pickImport">
          <Upload :size="18" /> Import backup
        </AppButton>
        <AppButton variant="outline" block @click="doCsv">
          <FileSpreadsheet :size="18" /> Export CSV
        </AppButton>
      </div>
      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        accept="application/json,.json"
        @change="onImportFile"
      />
      <p v-if="message" class="ok" role="status">{{ message }}</p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
    </section>

    <p class="footer">
      {{ categories.categories.length }} categories · {{ transactions.transactions.length }}
      transactions · {{ budgets.budgets.length }} budgets
    </p>

    <BottomSheet :open="catSheetOpen" title="New category" @close="catSheetOpen = false">
      <div class="sheet">
        <div class="seg">
          <button
            type="button"
            :class="{ active: newCatKind === 'expense' }"
            @click="newCatKind = 'expense'"
          >
            Expense
          </button>
          <button
            type="button"
            :class="{ active: newCatKind === 'income' }"
            @click="newCatKind = 'income'"
          >
            Income
          </button>
        </div>
        <label class="field">
          <span>Name</span>
          <input v-model="newCatName" type="text" maxlength="40" placeholder="e.g. Pets" />
        </label>
        <AppButton block size="lg" @click="addCategory">Add category</AppButton>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-bottom: var(--space-8);
}

header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.back {
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--color-surface);
}

h1 {
  font-size: var(--text-headline);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel h2 {
  font-size: 1.05rem;
}

.icon-add {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}

.muted {
  color: var(--color-muted);
  font-size: var(--text-label);
}

.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg:has(button:nth-child(2):last-child) {
  grid-template-columns: 1fr 1fr;
}

.seg button {
  min-height: 40px;
  border-radius: var(--radius-full);
  text-transform: capitalize;
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

select {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-background);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.cat-list li {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: var(--space-2);
  align-items: center;
  min-height: 40px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.name {
  font-size: var(--text-label);
  font-weight: 550;
}

.trash {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-muted);
}

.ok {
  color: var(--color-success);
  font-size: var(--text-label);
}

.err {
  color: var(--color-error);
  font-size: var(--text-label);
}

.footer {
  text-align: center;
  color: var(--color-muted);
  font-size: var(--text-caption);
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
</style>
