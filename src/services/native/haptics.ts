import { ImpactStyle, Haptics, NotificationType } from '@capacitor/haptics'
import { isNative } from '@/lib/platform'

export async function tapFeedback(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style })
  } catch {
    // ignore on unsupported devices
  }
}

export async function successFeedback(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {
      // ignore
    }
  }
}
