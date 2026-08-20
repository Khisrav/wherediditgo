<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { ArrowLeft, Download, Upload, FileSpreadsheet, ExternalLink, Plus, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconByName from '@/components/ui/IconByName.vue'
import AppearanceSettings from './components/AppearanceSettings.vue'
import SecuritySettings from './components/SecuritySettings.vue'
import NavigationSettings from './components/NavigationSettings.vue'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import {
  exportBackupFile,
  exportTransactionsCsv,
  mergeFromBackup,
  parseBackupJson,
  replaceFromBackup,
} from '@/services/backup'
import { warningFeedback } from '@/services/native/haptics'
import { resetLocalData } from '@/db'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useGoalsStore } from '@/stores/goals'
import { usePremiumStore } from '@/stores/premium'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import type { BackupPayload, Category, CategoryKind } from '@/types/finance'
import pkg from '../../../package.json'

const APP_VERSION = pkg.version

const { t } = useI18n()
const router = useRouter()
const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const goals = useGoalsStore()
const transactions = useTransactionsStore()
const premium = usePremiumStore()

const message = ref('')
const error = ref('')
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importSheetOpen = ref(false)
const pendingBackup = shallowRef<BackupPayload | null>(null)

const catSheetOpen = ref(false)
const editingCat = ref<Category | null>(null)
const newCatName = ref('')
const newCatKind = ref<CategoryKind>('expense')
const newCatIcon = ref('circle')
const newCatColor = ref('#6c757d')

const resetSheetOpen = ref(false)
const resetA = ref(2)
const resetB = ref(3)
const resetAnswer = ref('')
const resetError = ref('')
const resetting = ref(false)

const REPO_URL = 'https://github.com/Khisrav/wherediditgo'

const expenseCats = computed(() => categories.expense)
const incomeCats = computed(() => categories.income)

const backupDue = computed(() => {
  const txs = transactions.transactions
  if (!txs.length) return false
  const oldest = txs.reduce((min, tx) => (tx.createdAt < min ? tx.createdAt : min), txs[0]!.createdAt)
  const start = settings.lastBackupAt || oldest
  try {
    return differenceInCalendarDays(new Date(), parseISO(start)) >= 30
  } catch {
    return false
  }
})

function onNotify(msg: string) {
  message.value = msg
}

async function doExport() {
  if (!premium.isPremiumUser) {
    premium.openPaywall(t('premium.limitExport'))
    return
  }
  try {
    await exportBackupFile()
    await settings.markBackupNow()
    message.value = t('settings.exportOk')
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('settings.exportFail')
  }
}

async function doCsv() {
  if (!premium.isPremiumUser) {
    premium.openPaywall(t('premium.limitExport'))
    return
  }
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
    pendingBackup.value = parseBackupJson(text)
    importSheetOpen.value = true
    error.value = ''
    message.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('settings.importFail')
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function applyImport(mode: 'replace' | 'merge') {
  const payload = pendingBackup.value
  if (!payload) return
  const confirmKey = mode === 'replace' ? 'settings.importConfirm' : 'settings.importMergeConfirm'
  const ok = window.confirm(t(confirmKey))
  if (!ok) return
  importing.value = true
  error.value = ''
  message.value = ''
  try {
    if (mode === 'replace') await replaceFromBackup(payload)
    else await mergeFromBackup(payload)
    await settings.load()
    message.value = mode === 'replace' ? t('settings.importOk') : t('settings.importMergeOk')
    importSheetOpen.value = false
    pendingBackup.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('settings.importFail')
  } finally {
    importing.value = false
  }
}

async function saveCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  if (editingCat.value) {
    await categories.updateCategory(editingCat.value.id, {
      name,
      icon: newCatIcon.value,
      color: newCatColor.value,
    })
  } else {
    await categories.addCategory({
      name,
      kind: newCatKind.value,
      icon: newCatIcon.value,
      color: newCatColor.value,
    })
  }
  newCatName.value = ''
  newCatIcon.value = 'circle'
  newCatColor.value = '#6c757d'
  editingCat.value = null
  catSheetOpen.value = false
}

function openCatSheet() {
  editingCat.value = null
  newCatName.value = ''
  newCatKind.value = 'expense'
  newCatIcon.value = 'tag'
  newCatColor.value = '#6c757d'
  catSheetOpen.value = true
}

function openEditCat(cat: Category) {
  editingCat.value = cat
  newCatName.value = cat.name
  newCatKind.value = cat.kind
  newCatIcon.value = cat.icon
  newCatColor.value = cat.color
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

function newChallenge() {
  resetA.value = 1 + Math.floor(Math.random() * 9)
  resetB.value = 1 + Math.floor(Math.random() * 9)
  resetAnswer.value = ''
  resetError.value = ''
}

function openReset() {
  newChallenge()
  resetSheetOpen.value = true
  void warningFeedback()
}

function closeReset() {
  if (resetting.value) return
  resetSheetOpen.value = false
}

async function confirmReset() {
  const expected = resetA.value + resetB.value
  const given = Number.parseInt(resetAnswer.value.trim(), 10)
  if (!Number.isFinite(given) || given !== expected) {
    resetError.value = t('settings.resetWrong')
    newChallenge()
    return
  }
  resetting.value = true
  resetError.value = ''
  try {
    await resetLocalData()
    await settings.load()
    resetSheetOpen.value = false
    await router.replace('/onboarding')
  } catch (e) {
    resetError.value = e instanceof Error ? e.message : t('settings.importFail')
  } finally {
    resetting.value = false
  }
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

    <AppearanceSettings />
    <SecuritySettings @notify="onNotify" />
    <NavigationSettings />

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
          <button type="button" class="cat-row" @click="openEditCat(c)">
            <span class="dot" :style="{ background: c.color }" />
            <IconByName :name="c.icon" :size="16" />
            <span class="name">{{ c.name }}</span>
          </button>
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
          <button type="button" class="cat-row" @click="openEditCat(c)">
            <span class="dot" :style="{ background: c.color }" />
            <IconByName :name="c.icon" :size="16" />
            <span class="name">{{ c.name }}</span>
          </button>
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

    <section class="panel">
      <h2>{{ t('settings.backup') }}</h2>
      <p class="muted">{{ t('settings.backupDesc') }}</p>
      <p v-if="backupDue" class="nudge" role="status">{{ t('settings.backupReminder') }}</p>
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

    <section class="panel">
      <h2>{{ t('settings.reset') }}</h2>
      <p class="muted">{{ t('settings.resetDesc') }}</p>
      <AppButton variant="danger" block @click="openReset">
        {{ t('settings.reset') }}
      </AppButton>
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
      <p class="about-version">{{ t('settings.version', { version: APP_VERSION }) }}</p>
      <a class="about-link" :href="REPO_URL" target="_blank" rel="noopener noreferrer">
        <ExternalLink :size="16" aria-hidden="true" />
        {{ t('settings.viewOnGithub') }}
      </a>
    </section>

    <BottomSheet
      :open="catSheetOpen"
      :title="editingCat ? t('settings.editCategory') : t('settings.newCategory')"
      @close="catSheetOpen = false"
    >
      <div class="sheet">
        <div v-if="!editingCat" class="seg">
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
        <label class="field">
          <span>{{ t('settings.color') }}</span>
          <input v-model="newCatColor" type="color" />
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
        <AppButton block size="lg" @click="saveCategory">
          {{ editingCat ? t('settings.saveCategory') : t('settings.addCategoryBtn') }}
        </AppButton>
      </div>
    </BottomSheet>

    <BottomSheet
      :open="importSheetOpen"
      :title="t('settings.importChoose')"
      @close="importSheetOpen = false"
    >
      <div class="sheet">
        <AppButton block :disabled="importing" @click="applyImport('merge')">
          {{ t('settings.importMerge') }}
        </AppButton>
        <AppButton variant="outline" block :disabled="importing" @click="applyImport('replace')">
          {{ t('settings.importReplace') }}
        </AppButton>
      </div>
    </BottomSheet>

    <BottomSheet
      :open="resetSheetOpen"
      :title="t('settings.resetTitle')"
      @close="closeReset"
    >
      <div class="sheet">
        <p class="muted">{{ t('settings.resetDesc') }}</p>
        <label class="field">
          <span>{{ t('settings.resetChallenge', { a: resetA, b: resetB }) }}</span>
          <input
            v-model="resetAnswer"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            :placeholder="t('settings.resetAnswer')"
            :disabled="resetting"
            @keydown.enter="confirmReset"
          />
        </label>
        <p v-if="resetError" class="err" role="alert">{{ resetError }}</p>
        <AppButton variant="danger" block size="lg" :disabled="resetting" @click="confirmReset">
          {{ resetting ? t('settings.resetting') : t('settings.resetConfirm') }}
        </AppButton>
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
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  align-items: center;
  min-height: 40px;
}

.cat-row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: var(--space-2);
  align-items: center;
  min-height: 40px;
  width: 100%;
  text-align: left;
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

.nudge {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-size: var(--text-label);
  font-weight: 550;
}

.field input[type='color'] {
  padding: var(--space-2);
  height: 48px;
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

.about-version {
  font-size: var(--text-caption);
  font-variant-numeric: tabular-nums;
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

.nav-toggles-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.nav-card-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-lg);
  cursor: pointer;
  user-select: none;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

.nav-card-item:hover {
  background: var(--color-surface-container-high);
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.nav-card-item:active {
  transform: scale(0.99);
}

.nav-item-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.nav-item-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--color-primary-container);
  color: var(--color-primary);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.nav-item-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item-title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-on-surface);
}

.nav-item-desc {
  font-size: var(--text-label);
  color: var(--color-muted);
}

/* Modern iOS / Material 3 Switch Toggle */
.switch-btn {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-outline) 40%, transparent);
  border: 1px solid var(--color-outline-variant);
  cursor: pointer;
  transition:
    background-color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  padding: 2px;
  display: flex;
  align-items: center;
}

.switch-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.switch-thumb {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  transform: translateX(0);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.switch-btn--active .switch-thumb {
  transform: translateX(20px);
}
</style>
