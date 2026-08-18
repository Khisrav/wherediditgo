import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Transaction } from '@/types/finance'

export const useUiStore = defineStore('ui', () => {
  const addSheetOpen = ref(false)
  const editingTx = ref<Transaction | null>(null)
  const budgetCopiedMonth = ref('')

  function openAdd(tx?: Transaction | null) {
    editingTx.value = tx ?? null
    addSheetOpen.value = true
  }

  function closeAdd() {
    addSheetOpen.value = false
    editingTx.value = null
  }

  function notifyBudgetCopied(month: string) {
    budgetCopiedMonth.value = month
  }

  function clearBudgetCopied() {
    budgetCopiedMonth.value = ''
  }

  return {
    addSheetOpen,
    editingTx,
    budgetCopiedMonth,
    openAdd,
    closeAdd,
    notifyBudgetCopied,
    clearBudgetCopied,
  }
})
