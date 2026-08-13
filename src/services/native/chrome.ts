import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from '@/lib/platform'

export async function applyStatusBar(theme: 'light' | 'dark'): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? '#121413' : '#f3f0ea',
    })
  } catch {
    // ignore
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative()) return
  try {
    await SplashScreen.hide()
  } catch {
    // ignore
  }
}
