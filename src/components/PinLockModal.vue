<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Lock, Fingerprint, Delete, ShieldAlert } from '@lucide/vue'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  mode?: 'unlock' | 'setup'
}>()

const emit = defineEmits<{
  (e: 'success', pin?: string): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const pin = ref('')
const confirmPin = ref('')
const isConfirming = ref(false)
const errorMessage = ref('')
const isShaking = ref(false)

watch(pin, (newVal) => {
  if (newVal.length === 4) {
    handleComplete()
  }
})

async function handleComplete() {
  if (props.mode === 'setup') {
    if (!isConfirming.value) {
      confirmPin.value = pin.value
      pin.value = ''
      isConfirming.value = true
      errorMessage.value = ''
    } else {
      if (pin.value === confirmPin.value) {
        emit('success', pin.value)
      } else {
        triggerError(t('security.pinMismatch'))
        pin.value = ''
        confirmPin.value = ''
        isConfirming.value = false
      }
    }
  } else {
    const valid = await settings.verifyPin(pin.value)
    if (valid) {
      emit('success')
    } else {
      triggerError(t('security.incorrectPin'))
      pin.value = ''
    }
  }
}

function triggerError(msg: string) {
  errorMessage.value = msg
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, 500)
}

function pressKey(num: string) {
  if (pin.value.length < 4) {
    pin.value += num
  }
}

function backspace() {
  pin.value = pin.value.slice(0, -1)
}

function clear() {
  pin.value = ''
}

async function handleBiometrics() {
  if (props.mode !== 'setup' && settings.biometricEnabled) {
    // Biometric unlock simulated or native API
    settings.unlockApp()
    emit('success')
  }
}

async function handleResetLock() {
  if (confirm(t('security.resetSecurity') + '?')) {
    await settings.removePin()
    emit('cancel')
  }
}
</script>

<template>
  <div class="pin-modal-overlay">
    <div class="pin-card" :class="{ shake: isShaking }">
      <div class="pin-header">
        <div class="pin-icon">
          <Lock class="w-8 h-8 text-amber-500" />
        </div>
        <h2 class="pin-title">
          <template v-if="mode === 'setup'">
            {{ isConfirming ? t('security.confirmPin') : t('security.createPin') }}
          </template>
          <template v-else>
            {{ t('security.enterPin') }}
          </template>
        </h2>
        <p v-if="errorMessage" class="pin-error">{{ errorMessage }}</p>
      </div>

      <!-- PIN Dots -->
      <div class="pin-dots">
        <span
          v-for="i in 4"
          :key="i"
          class="pin-dot"
          :class="{ active: pin.length >= i }"
        ></span>
      </div>

      <!-- Keypad -->
      <div class="keypad-grid">
        <button
          v-for="num in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
          :key="num"
          type="button"
          class="key-btn"
          @click="pressKey(num)"
        >
          {{ num }}
        </button>

        <button
          v-if="mode !== 'setup' && settings.biometricEnabled"
          type="button"
          class="key-btn action-key"
          @click="handleBiometrics"
        >
          <Fingerprint class="w-6 h-6 text-primary" />
        </button>
        <button v-else type="button" class="key-btn action-key" @click="clear">
          C
        </button>

        <button type="button" class="key-btn" @click="pressKey('0')">0</button>

        <button type="button" class="key-btn action-key" @click="backspace">
          <Delete class="w-6 h-6" />
        </button>
      </div>

      <div v-if="mode !== 'setup'" class="pin-footer">
        <button type="button" class="reset-link" @click="handleResetLock">
          <ShieldAlert class="w-4 h-4 mr-1" />
          {{ t('security.forgotPin') }}
        </button>
      </div>
      <div v-else-if="mode === 'setup'" class="pin-footer">
        <button type="button" class="cancel-btn" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pin-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: var(--bg-surface, #121824);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.pin-card {
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pin-header {
  text-align: center;
  margin-bottom: 2rem;
}

.pin-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.pin-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
}

.pin-error {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.pin-dots {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border-color, #374151);
  transition: all 0.15s ease;
}

.pin-dot.active {
  background-color: var(--primary, #3b82f6);
  border-color: var(--primary, #3b82f6);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;
}

.key-btn {
  height: 64px;
  border-radius: 50%;
  border: none;
  background-color: var(--bg-card, #1e293b);
  color: var(--text-primary, #ffffff);
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s, transform 0.1s;
  touch-action: manipulation;
}

.key-btn:active {
  transform: scale(0.94);
  background-color: var(--bg-card-hover, #334155);
}

.action-key {
  background-color: transparent;
  color: var(--text-secondary, #94a3b8);
  font-size: 1.125rem;
}

.pin-footer {
  margin-top: 2rem;
}

.reset-link {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.cancel-btn {
  background: none;
  border: 1px solid var(--border-color, #374151);
  color: var(--text-primary, #ffffff);
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  cursor: pointer;
}

.shake {
  animation: shakeKeypad 0.4s ease-in-out;
}

@keyframes shakeKeypad {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-10px); }
  40%, 80% { transform: translateX(10px); }
}
</style>
