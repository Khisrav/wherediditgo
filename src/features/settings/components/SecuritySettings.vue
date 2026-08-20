<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Fingerprint, Lock } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import PinLockModal from '@/components/PinLockModal.vue'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{ (e: 'notify', msg: string): void }>()
const { t } = useI18n()
const settings = useSettingsStore()

const pinSetupOpen = ref(false)

async function onPinSetupSuccess(newPin?: string) {
  if (newPin) {
    await settings.setPin(newPin)
    emit('notify', t('security.title') + ': ' + t('security.pinLock'))
  }
  pinSetupOpen.value = false
}

async function disablePinLock() {
  if (confirm(t('security.removePin') + '?')) {
    await settings.removePin()
  }
}

async function toggleBiometrics() {
  await settings.setBiometricEnabled(!settings.biometricEnabled)
}
</script>

<template>
  <section class="card" aria-labelledby="security-title">
    <div class="header">
      <div class="title-row">
        <Lock :size="20" class="icon" />
        <h2 id="security-title" class="section-title">{{ t('security.title') }}</h2>
      </div>
      <p class="section-desc">{{ t('security.pinLock') }}</p>
    </div>

    <div class="pin-actions">
      <template v-if="!settings.pinEnabled">
        <AppButton block variant="tonal" @click="pinSetupOpen = true">
          {{ t('security.enablePin') }}
        </AppButton>
      </template>

      <template v-else>
        <div class="btn-group">
          <AppButton variant="outline" @click="pinSetupOpen = true">
            {{ t('security.changePin') }}
          </AppButton>
          <AppButton variant="ghost" @click="disablePinLock">
            {{ t('security.removePin') }}
          </AppButton>
        </div>

        <div class="biometric-row">
          <div class="bio-info">
            <Fingerprint :size="20" class="bio-icon" />
            <div class="bio-text">
              <span class="bio-title">{{ t('security.biometrics') }}</span>
              <span class="bio-hint">{{ t('security.biometricsHint') }}</span>
            </div>
          </div>
          <button
            type="button"
            class="switch"
            :class="{ 'switch--on': settings.biometricEnabled }"
            role="switch"
            :aria-checked="settings.biometricEnabled"
            :aria-label="t('security.biometrics')"
            @click="toggleBiometrics"
          />
        </div>
      </template>
    </div>

    <PinLockModal
      v-if="pinSetupOpen"
      mode="setup"
      @close="pinSetupOpen = false"
      @success="onPinSetupSuccess"
    />
  </section>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.icon {
  color: var(--color-primary);
}

.section-title {
  font-size: var(--text-title);
  color: var(--color-on-surface);
}

.section-desc {
  font-size: var(--text-label);
  color: var(--color-muted);
}

.pin-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.btn-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.biometric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
}

.bio-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bio-icon {
  color: var(--color-primary);
}

.bio-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bio-title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-on-surface);
}

.bio-hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.switch {
  width: 48px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-highest);
  position: relative;
  transition: background var(--duration-fast) var(--ease-standard);
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-standard);
}

.switch--on {
  background: var(--color-primary);
}

.switch--on::after {
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch::after {
    transition: none;
  }
}
</style>
