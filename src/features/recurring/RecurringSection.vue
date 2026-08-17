<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2 } from '@lucide/vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { warningFeedback } from '@/services/native/haptics'
import { useCategoriesStore } from '@/stores/categories'
import { useRecurringStore } from '@/stores/recurring'

const { t } = useI18n()
const recurring = useRecurringStore()
const categories = useCategoriesStore()

const rows = computed(() =>
  recurring.items.map((row) => ({
    row,
    categoryName: categories.byId(row.categoryId)?.name ?? t('transaction.uncategorized'),
  })),
)

async function remove(id: string) {
  if (!window.confirm(t('recurring.deleteConfirm'))) return
  void warningFeedback()
  await recurring.removeRecurring(id)
}
</script>

<template>
  <section class="panel">
    <h2>{{ t('recurring.title') }}</h2>
    <p v-if="!rows.length" class="muted">{{ t('recurring.empty') }}</p>
    <ul v-else class="list">
      <li v-for="{ row, categoryName } in rows" :key="row.id">
        <div class="meta">
          <strong>
            <MoneyText :amount="row.amount" :signed="row.type" />
          </strong>
          <span>
            {{ t(`txTypes.${row.type}`) }} · {{ categoryName }} ·
            {{ t('recurring.everyMonthOn', { day: row.dayOfMonth }) }}
          </span>
        </div>
        <button
          type="button"
          class="trash"
          :aria-label="t('recurring.deleteAria')"
          @click="remove(row.id)"
        >
          <Trash2 :size="16" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.panel h2 {
  font-size: 1.05rem;
}

.muted {
  color: var(--color-muted);
  font-size: var(--text-label);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.list li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  align-items: center;
  min-height: 40px;
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

.trash {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-muted);
}
</style>
