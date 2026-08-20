<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Crown, RefreshCw, Sparkles, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { usePremiumStore } from '@/stores/premium'

const { t } = useI18n()
const premium = usePremiumStore()

const open = computed({
  get: () => premium.paywallOpen,
  set: (val) => {
    if (!val) premium.closePaywall()
  },
})

const features = computed(() => [
  { title: t('premium.unlimitedAccounts'), free: '2 Accounts', pro: 'Unlimited' },
  { title: t('premium.unlimitedTransactions'), free: '100 / month', pro: 'Unlimited' },
  { title: t('premium.dataExport'), free: 'Disabled', pro: 'CSV & JSON' },
  { title: t('premium.cloudBackup'), free: 'Local only', pro: 'Included' },
  { title: t('premium.customThemes'), free: 'Standard', pro: 'All Themes' },
])

async function onBuy() {
  await premium.buyPro()
}

async function onRestore() {
  await premium.restore()
}
</script>

<template>
  <BottomSheet :open="open" title="" @close="open = false">
    <div class="paywall-container">
      <button type="button" class="close-btn" :aria-label="t('common.close')" @click="open = false">
        <X :size="20" />
      </button>

      <div class="hero">
        <div class="crown-badge">
          <Crown :size="32" class="crown-icon" />
        </div>
        <h2 class="hero-title">{{ t('premium.title', 'Unlock WhereDidItGo Pro') }}</h2>
        <p class="hero-desc">
          {{ premium.paywallReason || t('premium.subtitle', 'Get unlimited financial tracking and data exports with a one-time purchase.') }}
        </p>
      </div>

      <div class="comparison-card">
        <div v-for="(feat, idx) in features" :key="idx" class="feature-row">
          <div class="feat-info">
            <Check :size="18" class="feat-check" />
            <span class="feat-name">{{ feat.title }}</span>
          </div>
          <div class="feat-badges">
            <span class="badge badge--pro">{{ feat.pro }}</span>
          </div>
        </div>
      </div>

      <div class="pricing-box">
        <div class="price-row">
          <span class="price-tag">{{ premium.productDetails.price }}</span>
          <span class="price-period">/ {{ t('premium.lifetime', 'lifetime purchase') }}</span>
        </div>
        <p class="price-guarantee">{{ t('premium.noSubscription', 'One-time payment. No hidden subscription fees.') }}</p>
      </div>

      <div class="actions">
        <AppButton block size="lg" variant="filled" :disabled="premium.loading" @click="onBuy">
          <Sparkles :size="20" />
          {{ premium.loading ? t('common.loading') : t('premium.unlockNow', 'Unlock Pro Access') }}
        </AppButton>

        <button type="button" class="restore-btn" :disabled="premium.loading" @click="onRestore">
          <RefreshCw :size="14" />
          {{ t('premium.restorePurchases', 'Restore Previous Purchase') }}
        </button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.paywall-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-1) var(--space-4);
  position: relative;
}

.close-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface-container);
  color: var(--color-on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.crown-badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(217, 119, 6, 0.3);
}

.crown-icon {
  color: #ffffff;
}

.hero-title {
  font-size: var(--text-title-lg);
  font-weight: 700;
  color: var(--color-on-surface);
}

.hero-desc {
  font-size: var(--text-body);
  color: var(--color-muted);
  max-width: 320px;
}

.comparison-card {
  background: var(--color-surface-container);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.feature-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.feat-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.feat-check {
  color: var(--color-primary);
}

.feat-name {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-on-surface);
}

.badge--pro {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-size: var(--text-caption);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.pricing-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--color-surface-container-low);
  padding: var(--space-3);
  border-radius: var(--radius-md);
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.price-tag {
  font-size: var(--text-title-lg);
  font-weight: 800;
  color: var(--color-primary);
}

.price-period {
  font-size: var(--text-label);
  color: var(--color-muted);
}

.price-guarantee {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.restore-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-label);
  color: var(--color-muted);
  background: none;
  border: none;
  padding: var(--space-1) var(--space-2);
}

.restore-btn:hover {
  color: var(--color-on-surface);
}
</style>
