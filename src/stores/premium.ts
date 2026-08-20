import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PremiumManager, PRO_PRODUCT, type ProductDetails } from '@/services/native/billing'
import { useAccountsStore } from '@/stores/accounts'
import { useTransactionsStore } from '@/stores/transactions'

export const MAX_FREE_ACCOUNTS = 2
export const MAX_FREE_MONTHLY_TXS = 100

export const usePremiumStore = defineStore('premium', () => {
  const isPremiumUser = ref(false)
  const paywallOpen = ref(false)
  const paywallReason = ref<string>('')
  const loading = ref(false)
  const productDetails = ref<ProductDetails>(PRO_PRODUCT)

  async function load() {
    isPremiumUser.value = await PremiumManager.checkStatus()
  }

  function openPaywall(reason = '') {
    paywallReason.value = reason
    paywallOpen.value = true
  }

  function closePaywall() {
    paywallOpen.value = false
    paywallReason.value = ''
  }

  async function buyPro(): Promise<boolean> {
    loading.value = true
    try {
      const success = await PremiumManager.purchasePro()
      if (success) {
        isPremiumUser.value = true
        closePaywall()
      }
      return success
    } finally {
      loading.value = false
    }
  }

  async function restore(): Promise<boolean> {
    loading.value = true
    try {
      const restored = await PremiumManager.restorePurchases()
      if (restored) {
        isPremiumUser.value = true
        closePaywall()
      }
      return restored
    } finally {
      loading.value = false
    }
  }

  function canAddAccount(): boolean {
    if (isPremiumUser.value) return true
    const accounts = useAccountsStore()
    return accounts.accounts.length < MAX_FREE_ACCOUNTS
  }

  function canAddTransaction(): boolean {
    if (isPremiumUser.value) return true
    const txStore = useTransactionsStore()
    const now = new Date()
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const countThisMonth = txStore.transactions.filter((t) => t.date.startsWith(currentMonthPrefix)).length
    return countThisMonth < MAX_FREE_MONTHLY_TXS
  }

  return {
    isPremiumUser,
    paywallOpen,
    paywallReason,
    loading,
    productDetails,
    load,
    openPaywall,
    closePaywall,
    buyPro,
    restore,
    canAddAccount,
    canAddTransaction,
  }
})
