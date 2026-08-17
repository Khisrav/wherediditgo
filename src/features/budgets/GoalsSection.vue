<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { parseMoneyToMinor } from '@/lib/money'
import { successFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useGoalsStore } from '@/stores/goals'
import type { Goal } from '@/types/finance'

const GOAL_COLORS = ['#0b6e6a', '#3d5a80', '#e07a5f', '#9b5de5', '#2a9d8f', '#c45c26']

const { t } = useI18n()
const goals = useGoalsStore()
const accounts = useAccountsStore()

const sheetOpen = ref(false)
const editing = ref<Goal | null>(null)
const name = ref('')
const targetStr = ref('')
const savedStr = ref('')
const deadline = ref('')
const color = ref(GOAL_COLORS[0])
const icon = ref<string>('piggy-bank')

const contributeOpen = ref(false)
const contributing = ref<Goal | null>(null)
const contributeStr = ref('')
const fromAccountId = ref('')
const contributeError = ref('')

const accountOptions = computed(() =>
  accounts.active.map((a) => ({ value: a.id, label: a.name })),
)

const rows = computed(() =>
  goals.goals.map((goal) => {
    const percent =
      goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0
    return {
      goal,
      percent,
      remaining: goal.targetAmount - goal.currentAmount,
      reached: goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0,
    }
  }),
)

function openNew() {
  editing.value = null
  name.value = ''
  targetStr.value = ''
  savedStr.value = '0'
  deadline.value = ''
  color.value = GOAL_COLORS[0]
  icon.value = 'piggy-bank'
  sheetOpen.value = true
}

function openEdit(goal: Goal) {
  editing.value = goal
  name.value = goal.name
  targetStr.value = (goal.targetAmount / 100).toFixed(2)
  savedStr.value = (goal.currentAmount / 100).toFixed(2)
  deadline.value = goal.deadline ?? ''
  color.value = goal.color
  icon.value = goal.icon
  sheetOpen.value = true
}

function openContribute(goal: Goal) {
  contributing.value = goal
  contributeStr.value = ''
  fromAccountId.value = accounts.active[0]?.id ?? ''
  contributeError.value = ''
  contributeOpen.value = true
}

async function save() {
  const targetAmount = parseMoneyToMinor(targetStr.value)
  const currentAmount = parseMoneyToMinor(savedStr.value)
  if (!name.value.trim() || targetAmount <= 0) return
  const payload = {
    name: name.value.trim(),
    targetAmount,
    currentAmount,
    deadline: deadline.value || undefined,
    color: color.value,
    icon: icon.value,
  }
  if (editing.value) {
    await goals.updateGoal(editing.value.id, payload)
  } else {
    await goals.addGoal(payload)
  }
  sheetOpen.value = false
}

async function remove() {
  if (!editing.value) return
  if (!window.confirm(t('goals.deleteConfirm'))) return
  await goals.removeGoal(editing.value.id)
  sheetOpen.value = false
}

async function confirmContribute() {
  const amount = parseMoneyToMinor(contributeStr.value)
  if (amount <= 0) {
    contributeError.value = t('goals.amountRequired')
    return
  }
  if (!fromAccountId.value || !contributing.value) {
    contributeError.value = t('goals.accountRequired')
    return
  }
  const updated = await goals.addToGoal(contributing.value.id, amount, fromAccountId.value)
  if (!updated) {
    contributeError.value = t('quickAdd.saveFail')
    return
  }
  contributeOpen.value = false
  void successFeedback()
}
</script>

<template>
  <div class="goals">
    <EmptyState
      v-if="!rows.length"
      :title="t('goals.emptyTitle')"
      :description="t('goals.emptyDesc')"
      :action-label="t('goals.addGoal')"
      @action="openNew"
    >
      <template #icon>
        <IconByName name="piggy-bank" :size="28" />
      </template>
    </EmptyState>

    <template v-else>
      <div class="list">
        <div v-for="row in rows" :key="row.goal.id" class="card">
          <button type="button" class="card-main" @click="openEdit(row.goal)">
            <div class="card-top">
              <span class="icon" :style="{ background: `color-mix(in srgb, ${row.goal.color} 22%, transparent)` }">
                <IconByName :name="row.goal.icon" :size="18" />
              </span>
              <div class="meta">
                <strong>{{ row.goal.name }}</strong>
                <span>
                  <MoneyText :amount="row.goal.currentAmount" /> {{ t('common.of') }}
                  <MoneyText :amount="row.goal.targetAmount" />
                </span>
              </div>
              <span class="remain" :class="{ reached: row.reached }">
                <template v-if="row.reached">{{ t('goals.reached') }}</template>
                <template v-else>
                  {{ t('goals.left') }}
                  <MoneyText :amount="Math.max(0, row.remaining)" />
                </template>
              </span>
            </div>
            <ProgressBar :value="row.percent" :color="row.goal.color" />
          </button>
          <button type="button" class="fund" @click="openContribute(row.goal)">
            <Plus :size="16" />
            {{ t('goals.addMoney') }}
          </button>
        </div>
      </div>
      <AppButton variant="tonal" block @click="openNew">
        <Plus :size="18" /> {{ t('goals.addGoal') }}
      </AppButton>
    </template>

    <BottomSheet
      :open="sheetOpen"
      :title="editing ? t('goals.editGoal') : t('goals.newGoal')"
      @close="sheetOpen = false"
    >
      <div class="sheet">
        <label class="field">
          <span>{{ t('goals.name') }}</span>
          <input
            v-model="name"
            type="text"
            maxlength="40"
            :placeholder="t('goals.namePlaceholder')"
          />
        </label>
        <label class="field">
          <span>{{ t('goals.target') }}</span>
          <input
            v-model="targetStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
        <label class="field">
          <span>{{ t('goals.saved') }}</span>
          <input
            v-model="savedStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
        <p class="hint">{{ t('goals.savedHint') }}</p>
        <label class="field">
          <span>{{ t('goals.deadline') }}</span>
          <input v-model="deadline" type="date" />
        </label>
        <div class="field">
          <span>{{ t('goals.color') }}</span>
          <div class="swatches" role="listbox" :aria-label="t('goals.color')">
            <button
              v-for="c in GOAL_COLORS"
              :key="c"
              type="button"
              class="swatch"
              :class="{ 'swatch--active': color === c }"
              :style="{ background: c }"
              :aria-label="c"
              :aria-selected="color === c"
              @click="color = c"
            />
          </div>
        </div>
        <div class="field">
          <span>{{ t('goals.icon') }}</span>
          <div class="icon-grid" role="listbox" :aria-label="t('goals.icon')">
            <button
              v-for="ic in CATEGORY_ICONS"
              :key="ic"
              type="button"
              role="option"
              class="icon-pick"
              :class="{ 'icon-pick--active': icon === ic }"
              :aria-selected="icon === ic"
              :aria-label="ic"
              @click="icon = ic"
            >
              <IconByName :name="ic" :size="18" />
            </button>
          </div>
        </div>
        <AppButton block size="lg" @click="save">{{ t('goals.saveGoal') }}</AppButton>
        <AppButton v-if="editing" variant="danger" block @click="remove">
          {{ t('common.delete') }}
        </AppButton>
      </div>
    </BottomSheet>

    <BottomSheet
      :open="contributeOpen"
      :title="t('goals.addMoneyTitle', { name: contributing?.name ?? '' })"
      @close="contributeOpen = false"
    >
      <div class="sheet">
        <p class="hint">{{ t('goals.addMoneyHint') }}</p>
        <label class="field">
          <span>{{ t('goals.amount') }}</span>
          <input
            v-model="contributeStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
        <label class="field">
          <span>{{ t('goals.fromAccount') }}</span>
          <AppSelect
            v-model="fromAccountId"
            :options="accountOptions"
            :aria-label="t('goals.fromAccount')"
          />
        </label>
        <p v-if="contributeError" class="error" role="alert">{{ contributeError }}</p>
        <AppButton block size="lg" @click="confirmContribute">{{ t('goals.confirmAdd') }}</AppButton>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.goals {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  overflow: hidden;
}

.card-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  text-align: left;
  width: 100%;
}

.card-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
}

.icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meta span {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.remain {
  font-size: var(--text-label);
  font-weight: 650;
  color: var(--color-muted);
  text-align: right;
  max-width: 7.5rem;
}

.remain.reached {
  color: var(--color-income);
}

.fund {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-4) var(--space-3);
  font-size: var(--text-label);
  font-weight: 650;
  color: var(--color-primary);
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

.hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.error {
  color: var(--color-error);
  font-size: var(--text-label);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
}

.swatch--active {
  box-shadow: 0 0 0 3px var(--color-surface), 0 0 0 5px var(--color-on-surface);
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
}

.icon-pick--active {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  box-shadow: inset 0 0 0 2px var(--color-primary);
}
</style>
