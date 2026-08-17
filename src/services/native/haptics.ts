/**
 * Rich haptic feedback for hapticophiles.
 *
 * Pixel / OnePlus “satisfying” feel comes from OEM-tuned actuators + semantic
 * Android HapticFeedbackConstants (not long ugly `vibrate(300)` buzzes).
 * On Android we prefer View.performHapticFeedback via Capawesome; on iOS we
 * use Soft/Rigid impacts, selection ticks, and Core Haptics patterns.
 *
 * @see https://developer.android.com/develop/ui/views/haptics/haptic-feedback
 * @see https://capawesome.io/docs/sdks/capacitor/haptics/
 */
import {
  AndroidHapticType,
  Haptics,
  ImpactStyle,
  NotificationType,
} from '@capawesome/capacitor-haptics'
import { isNative, platform } from '@/lib/platform'

const isAndroid = () => platform() === 'android'

let lastAt = 0
let selectionOpen = false

function throttle(ms: number): boolean {
  const now = performance.now()
  if (now - lastAt < ms) return false
  lastAt = now
  return true
}

async function run(fn: () => Promise<void>): Promise<void> {
  if (!isNative()) return
  try {
    await fn()
  } catch {
    // Unsupported hardware / denied — stay quiet
  }
}

async function android(type: AndroidHapticType): Promise<void> {
  await Haptics.performAndroidHaptic({ type })
}

/** Soft keyboard / keypad key — crisp Pixel-style tap */
export async function tapFeedback(): Promise<void> {
  if (!throttle(18)) return
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.KeyboardTap)
      return
    }
    await Haptics.impact({ style: ImpactStyle.Soft })
  })
}

/** Discrete segment / option change (hero toggle, type tabs, month step) */
export async function tickFeedback(): Promise<void> {
  if (!throttle(22)) return
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.ClockTick)
      return
    }
    if (!selectionOpen) {
      await Haptics.selectionStart()
      selectionOpen = true
    }
    await Haptics.selectionChanged()
  })
}

/** Toggle / switch flipped on */
export async function toggleOnFeedback(): Promise<void> {
  if (!throttle(30)) return
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.ToggleOn)
      return
    }
    await Haptics.impact({ style: ImpactStyle.Light })
  })
}

/** Toggle / switch flipped off */
export async function toggleOffFeedback(): Promise<void> {
  if (!throttle(30)) return
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.ToggleOff)
      return
    }
    await Haptics.impact({ style: ImpactStyle.Soft })
  })
}

/** Opening a sheet / menu */
export async function openFeedback(): Promise<void> {
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.ContextClick)
      return
    }
    await Haptics.impact({ style: ImpactStyle.Soft })
  })
}

/** Closing / dismissing */
export async function closeFeedback(): Promise<void> {
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.VirtualKey)
      return
    }
    await Haptics.impact({ style: ImpactStyle.Light })
  })
}

/**
 * “Snap / separate” — short soft cling then a sharper release.
 * Closest we can get to Pixel’s sticky-notification peel without PWLE APIs.
 */
export async function snapFeedback(): Promise<void> {
  await run(async () => {
    try {
      await Haptics.playPattern({
        events: [
          { time: 0, intensity: 0.28, sharpness: 0.2 },
          { time: 0.04, intensity: 0.9, sharpness: 0.95 },
          { time: 0.085, intensity: 0.35, sharpness: 0.45 },
        ],
      })
      return
    } catch {
      // fall through
    }
    if (isAndroid()) {
      await android(AndroidHapticType.Confirm)
      return
    }
    await Haptics.impact({ style: ImpactStyle.Rigid })
  })
}

/** Primary action committed (FAB, Continue, Save) */
export async function confirmFeedback(): Promise<void> {
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.Confirm)
      return
    }
    await Haptics.impact({ style: ImpactStyle.Medium })
  })
}

/** Saved / success — confirm + short success pattern */
export async function successFeedback(): Promise<void> {
  await run(async () => {
    try {
      await Haptics.playPattern({
        events: [
          { time: 0, intensity: 0.45, sharpness: 0.55 },
          { time: 0.07, intensity: 0.95, sharpness: 0.85 },
        ],
      })
    } catch {
      if (isAndroid()) await android(AndroidHapticType.Confirm)
      else await Haptics.notification({ type: NotificationType.Success })
    }
  })
}

/** Validation / delete failure */
export async function errorFeedback(): Promise<void> {
  await run(async () => {
    if (isAndroid()) {
      await android(AndroidHapticType.Reject)
      return
    }
    await Haptics.notification({ type: NotificationType.Error })
  })
}

/** Destructive confirm (delete, archive) */
export async function warningFeedback(): Promise<void> {
  await run(async () => {
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch {
      if (isAndroid()) await android(AndroidHapticType.LongPress)
      else await Haptics.impact({ style: ImpactStyle.Heavy })
    }
  })
}

/** End an iOS selection session if one was started */
export async function endSelectionFeedback(): Promise<void> {
  if (!selectionOpen) return
  selectionOpen = false
  await run(async () => {
    await Haptics.selectionEnd()
  })
}
