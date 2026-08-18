<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MoneyText from '@/components/ui/MoneyText.vue'
import { formatTxDate, type ActivityHeatmap, type CalendarDay } from '@/services/stats'
import { weekdayLabels } from '@/lib/dates'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  heatmap: ActivityHeatmap
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const scroller = ref<HTMLElement | null>(null)
const selectedDate = ref<string | null>(null)

const weekdays = computed(() => weekdayLabels(settings.intlLocale, 'short'))
const selected = computed<CalendarDay | null>(() => {
  if (!selectedDate.value) return null
  return props.heatmap.days.find((d) => d.date === selectedDate.value) ?? null
})

function cellLabel(day: CalendarDay): string {
  const date = formatTxDate(day.date, settings.intlLocale)
  if (day.future) return date
  if (day.count === 0) return t('insights.activityEmptyDay', { date })
  return `${date}, ${day.count}`
}

function selectDay(day: CalendarDay) {
  if (day.future) return
  selectedDate.value = selectedDate.value === day.date ? null : day.date
}

async function scrollToEnd() {
  await nextTick()
  const el = scroller.value
  if (!el) return
  el.scrollLeft = el.scrollWidth
}

onMounted(scrollToEnd)
watch(() => props.heatmap.start, scrollToEnd)
</script>

<template>
  <section class="panel" :aria-label="t('insights.activity')">
    <div class="head">
      <h2>{{ t('insights.activity') }}</h2>
      <p class="lede">
        {{
          heatmap.activeDays
            ? t('insights.activityLede', { count: heatmap.activeDays })
            : t('insights.activityNone')
        }}
      </p>
    </div>

    <div ref="scroller" class="scroller" tabindex="0">
      <div
        class="cal"
        :style="{
          '--weeks': heatmap.weeks,
        }"
      >
        <div class="months" aria-hidden="true">
          <span
            v-for="m in heatmap.monthLabels"
            :key="`${m.weekIndex}-${m.label}`"
            class="month"
            :style="{ gridColumn: m.weekIndex + 1 }"
          >
            {{ m.label }}
          </span>
        </div>
        <div class="wdays" aria-hidden="true">
          <span v-for="(name, i) in weekdays" :key="name + i" :class="{ ghost: i % 2 === 0 }">
            {{ i % 2 === 0 ? '' : name }}
          </span>
        </div>
        <div class="cells">
          <button
            v-for="day in heatmap.days"
            :key="day.date"
            type="button"
            class="cell"
            :class="[`lvl-${day.level}`, { future: day.future, selected: selectedDate === day.date }]"
            :disabled="day.future"
            :aria-label="cellLabel(day)"
            :title="cellLabel(day)"
            :aria-pressed="selectedDate === day.date"
            @click="selectDay(day)"
          />
        </div>
      </div>
    </div>

    <div class="foot">
      <p v-if="selected" class="detail">
        <span>{{ formatTxDate(selected.date, settings.intlLocale) }}</span>
        <span>{{ selected.count }} {{ t('insights.txCount') }}</span>
        <span v-if="selected.expense" class="expense">
          <MoneyText :amount="selected.expense" signed="expense" />
        </span>
        <span v-else-if="selected.income" class="income">
          <MoneyText :amount="selected.income" signed="income" />
        </span>
      </p>
      <p v-else class="detail muted">{{ t('insights.activityHint') }}</p>
      <div class="scale" aria-hidden="true">
        <span>{{ t('insights.less') }}</span>
        <i class="swatch lvl-0" />
        <i class="swatch lvl-1" />
        <i class="swatch lvl-2" />
        <i class="swatch lvl-3" />
        <i class="swatch lvl-4" />
        <span>{{ t('insights.more') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

h2 {
  font-size: var(--text-title);
}

.lede {
  font-size: var(--text-body);
  color: var(--color-muted);
}

.scroller {
  overflow-x: auto;
  overflow-y: hidden;
  margin-inline: calc(var(--space-4) * -1);
  padding-inline: var(--space-4);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  overscroll-behavior-x: contain;
}

.cal {
  --cell: 14px;
  --gap: 3px;
  display: grid;
  grid-template-columns: 28px max-content;
  grid-template-rows: 18px auto;
  column-gap: var(--space-2);
  min-width: 100%;
  width: max-content;
}

.months {
  grid-column: 2;
  display: grid;
  grid-template-columns: repeat(var(--weeks), var(--cell));
  column-gap: var(--gap);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
  line-height: 1;
  align-items: end;
}

.month {
  white-space: nowrap;
  overflow: visible;
}

.wdays {
  grid-row: 2;
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  row-gap: var(--gap);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-muted);
  line-height: var(--cell);
}

.wdays .ghost {
  visibility: hidden;
}

.cells {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  grid-auto-flow: column;
  grid-auto-columns: var(--cell);
  gap: var(--gap);
}

.cell {
  width: var(--cell);
  height: var(--cell);
  border-radius: 3px;
  padding: 0;
  min-height: 0;
}

.cell:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
  z-index: 1;
}

.cell.selected {
  box-shadow: inset 0 0 0 1.5px var(--color-on-surface);
}

.cell.future {
  opacity: 0.35;
  cursor: default;
}

.lvl-0 {
  background: var(--color-surface-container-high);
}

.lvl-1 {
  background: color-mix(in srgb, var(--color-primary) 32%, var(--color-surface-container));
}

.lvl-2 {
  background: color-mix(in srgb, var(--color-primary) 55%, var(--color-surface-container));
}

.lvl-3 {
  background: color-mix(in srgb, var(--color-primary) 78%, transparent);
}

.lvl-4 {
  background: var(--color-primary);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
}

.detail {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
  font-size: var(--text-body);
  font-weight: 550;
  min-height: 1.4em;
}

.detail.muted {
  color: var(--color-muted);
  font-weight: 450;
}

.expense {
  color: var(--color-expense);
}

.income {
  color: var(--color-income);
}

.scale {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-label);
  color: var(--color-muted);
  margin-left: auto;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: block;
}

@media (min-width: 480px) {
  .cal {
    --cell: 14px;
  }
}
</style>
