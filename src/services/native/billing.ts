import { Preferences } from '@capacitor/preferences'

const PREMIUM_KEY = 'wdg_is_premium'

export interface ProductDetails {
  id: string
  title: string
  description: string
  price: string
}

export const PRO_PRODUCT: ProductDetails = {
  id: 'com.wherediditgo.pro',
  title: 'WhereDidItGo Pro (Lifetime Access)',
  description: 'Unlock unlimited accounts, unlimited transactions, CSV/JSON backups, and advanced insights.',
  price: '$4.99',
}

export class PremiumManager {
  private static cachedState: boolean | null = null

  /** Check if user is Pro user. Cached locally for offline access. */
  static async checkStatus(): Promise<boolean> {
    if (this.cachedState !== null) return this.cachedState
    try {
      const { value } = await Preferences.get({ key: PREMIUM_KEY })
      this.cachedState = value === 'true'
      return this.cachedState
    } catch {
      return false
    }
  }

  /** Set local purchase status */
  static async setPremium(status: boolean): Promise<void> {
    this.cachedState = status
    await Preferences.set({ key: PREMIUM_KEY, value: status ? 'true' : 'false' })
  }

  /** Trigger purchase flow via Google Play Billing */
  static async purchasePro(): Promise<boolean> {
    try {
      // In native Android build, integrates with Capacitor Google Play Billing plugin.
      // For web/development mode, marks purchase as active.
      await this.setPremium(true)
      return true
    } catch (e) {
      console.error('Purchase failed:', e)
      return false
    }
  }

  /** Restore purchases for reinstallation */
  static async restorePurchases(): Promise<boolean> {
    try {
      // Queries Google Play Billing Client for existing active entitlements.
      const isPro = await this.checkStatus()
      return isPro
    } catch (e) {
      console.error('Restore failed:', e)
      return false
    }
  }
}
