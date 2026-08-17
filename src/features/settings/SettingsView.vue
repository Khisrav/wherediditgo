<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Download, Upload, FileSpreadsheet, ExternalLink, Plus, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { APP_LOCALES } from '@/i18n'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { CURRENCIES } from '@/lib/currencies'
import RecurringSection from '@/features/recurring/RecurringSection.vue'
import {
  exportBackupFile,
  exportTransactionsCsv,
  parseBackupJson,
  replaceFromBackup,
} from '@/services/backup'
import { toggleOffFeedback, toggleOnFeedback, warningFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useGoalsStore } from '@/stores/goals'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import type { AppLocale, CategoryKind, CurrencyPosition, ThemeMode } from '@/types/finance'

const { t } = useI18n()
const router = useRouter()
const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const goals = useGoalsStore()
const transactions = useTransactionsStore()

const message = ref('')
const error = ref('')
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const catSheetOpen = ref(false)
const newCatName = ref('')
const newCatKind = ref<CategoryKind>('expense')
const newCatIcon = ref('circle')

const REPO_URL = 'https://github.com/Khisrav/wherediditgo'

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

const expenseCats = computed(() => categories.expense)
const incomeCats = computed(() => categories.income)

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

async function doExport() {
  try {
    await exportBackupFile()
    message.value = t('settings.exportOk')
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('settings.exportFail')
  }
}

async function doCsv() {
  try {
    await exportTransactionsCsv()
    message.value = t('settings.csvOk')
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('settings.csvFail')
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
    const ok = window.confirm(t('settings.importConfirm'))
    if (!ok) return
    await replaceFromBackup(payload)
    await settings.load()
    message.value = t('settings.importOk')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('settings.importFail')
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function addCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  await categories.addCategory({
    name,
    kind: newCatKind.value,
    icon: newCatIcon.value,
  })
  newCatName.value = ''
  newCatIcon.value = 'circle'
  catSheetOpen.value = false
}

function openCatSheet() {
  newCatName.value = ''
  newCatIcon.value = newCatKind.value === 'income' ? 'briefcase' : 'tag'
  catSheetOpen.value = true
}

async function removeCategory(id: string, name: string) {
  const used = transactions.transactions.some((tx) => tx.categoryId === id)
  if (used) {
    window.alert(t('settings.categoryInUse', { name }))
    return
  }
  const ok = window.confirm(t('settings.deleteCategoryConfirm', { name }))
  if (!ok) return
  void warningFeedback()
  await categories.removeCategory(id)
  const related = budgets.budgets.filter((b) => b.categoryId === id)
  await Promise.all(related.map((b) => budgets.removeBudget(b.id)))
}
</script>

<template>
  <div class="settings">
    <header>
      <button type="button" class="back" :aria-label="t('common.back')" @click="router.back()">
        <ArrowLeft :size="22" />
      </button>
      <h1>{{ t('settings.title') }}</h1>
    </header>

    <section class="panel">
      <h2>{{ t('settings.appearance') }}</h2>
      <div class="seg">
        <button
          v-for="mode in (['system', 'light', 'dark'] as const)"
          :key="mode"
          type="button"
          :class="{ active: settings.theme === mode }"
          @click="onTheme(mode)"
        >
          {{ t(`themes.${mode}`) }}
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>{{ t('settings.language') }}</h2>
      <AppSelect
        :model-value="settings.locale"
        :options="languageOptions"
        :aria-label="t('settings.language')"
        @update:model-value="onLocale"
      />
    </section>

    <section class="panel">
      <h2>{{ t('settings.currency') }}</h2>
      <AppSelect
        :model-value="settings.currency"
        :options="currencyOptions"
        :aria-label="t('settings.currency')"
        @update:model-value="onCurrency"
      />
      <h2 class="subhead">{{ t('settings.currencyPosition') }}</h2>
      <AppSelect
        :model-value="settings.currencyPosition"
        :options="currencyPositionOptions"
        :aria-label="t('settings.currencyPosition')"
        @update:model-value="onCurrencyPosition"
      />
    </section>

    <section class="panel">
      <h2>{{ t('settings.accounts') }}</h2>
      <p class="muted">{{ t('settings.activeAccounts', { count: accounts.active.length }) }}</p>
      <AppButton variant="tonal" block @click="router.push('/accounts')">
        {{ t('settings.manageAccounts') }}
      </AppButton>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>{{ t('settings.categories') }}</h2>
        <button
          type="button"
          class="icon-add"
          :aria-label="t('settings.addCategory')"
          @click="openCatSheet"
        >
          <Plus :size="18" />
        </button>
      </div>
      <p class="muted">{{ t('settings.expense') }}</p>
      <ul class="cat-list">
        <li v-for="c in expenseCats" :key="c.id">
          <span class="dot" :style="{ background: c.color }" />
          <IconByName :name="c.icon" :size="16" />
          <span class="name">{{ c.name }}</span>
          <button
            type="button"
            class="trash"
            :aria-label="t('common.delete')"
            @click="removeCategory(c.id, c.name)"
          >
            <Trash2 :size="16" />
          </button>
        </li>
      </ul>
      <p class="muted">{{ t('settings.income') }}</p>
      <ul class="cat-list">
        <li v-for="c in incomeCats" :key="c.id">
          <span class="dot" :style="{ background: c.color }" />
          <IconByName :name="c.icon" :size="16" />
          <span class="name">{{ c.name }}</span>
          <button
            type="button"
            class="trash"
            :aria-label="t('common.delete')"
            @click="removeCategory(c.id, c.name)"
          >
            <Trash2 :size="16" />
          </button>
        </li>
      </ul>
    </section>

    <RecurringSection />

    <section class="panel">
      <h2>{{ t('settings.backup') }}</h2>
      <p class="muted">{{ t('settings.backupDesc') }}</p>
      <div class="stack">
        <AppButton variant="filled" block @click="doExport">
          <Download :size="18" /> {{ t('settings.exportBackup') }}
        </AppButton>
        <AppButton variant="tonal" block :disabled="importing" @click="pickImport">
          <Upload :size="18" /> {{ t('settings.importBackup') }}
        </AppButton>
        <AppButton variant="outline" block @click="doCsv">
          <FileSpreadsheet :size="18" /> {{ t('settings.exportCsv') }}
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
      {{
        t('settings.footer', {
          cats: categories.categories.length,
          txs: transactions.transactions.length,
          budgets: budgets.budgets.length,
          goals: goals.goals.length,
        })
      }}
    </p>

    <section class="about">
      <p class="about-credit">{{ t('settings.craftedBy') }}</p>
      <a class="about-link" :href="REPO_URL" target="_blank" rel="noopener noreferrer">
        <ExternalLink :size="16" aria-hidden="true" />
        {{ t('settings.viewOnGithub') }}
      </a>
    </section>

    <BottomSheet
      :open="catSheetOpen"
      :title="t('settings.newCategory')"
      @close="catSheetOpen = false"
    >
      <div class="sheet">
        <div class="seg">
          <button
            type="button"
            :class="{ active: newCatKind === 'expense' }"
            @click="newCatKind = 'expense'"
          >
            {{ t('settings.expense') }}
          </button>
          <button
            type="button"
            :class="{ active: newCatKind === 'income' }"
            @click="newCatKind = 'income'"
          >
            {{ t('settings.income') }}
          </button>
        </div>
        <label class="field">
          <span>{{ t('settings.name') }}</span>
          <input
            v-model="newCatName"
            type="text"
            maxlength="40"
            :placeholder="t('settings.namePlaceholder')"
          />
        </label>
        <div class="field">
          <span>{{ t('settings.icon') }}</span>
          <div class="icon-grid" role="listbox" :aria-label="t('settings.icon')">
            <button
              v-for="icon in CATEGORY_ICONS"
              :key="icon"
              type="button"
              role="option"
              class="icon-pick"
              :class="{ 'icon-pick--active': newCatIcon === icon }"
              :aria-selected="newCatIcon === icon"
              :aria-label="icon"
              @click="newCatIcon = icon"
            >
              <IconByName :name="icon" :size="20" />
            </button>
          </div>
        </div>
        <AppButton block size="lg" @click="addCategory">{{ t('settings.addCategoryBtn') }}</AppButton>
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

.panel .subhead {
  margin-top: var(--space-2);
  font-size: var(--text-label);
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--color-muted);
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
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
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

.about {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}

.about-credit {
  font-size: var(--text-label);
  color: var(--color-muted);
}

.about-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-container);
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

.icon-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-2);
  max-height: 220px;
  overflow: auto;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--color-surface-container);
}

.icon-pick {
  aspect-ratio: 1;
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--color-on-surface-variant);
  transition:
    background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.icon-pick--active {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  box-shadow: inset 0 0 0 2px var(--color-primary);
}
</style>
