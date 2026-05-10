const ONBOARDED_KEY = 'arcalist_onboarded'

export async function isOnboarded(): Promise<boolean> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(ONBOARDED_KEY)
      return result[ONBOARDED_KEY] === true
    }
    return localStorage.getItem(ONBOARDED_KEY) === 'true'
  } catch {
    return false
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [ONBOARDED_KEY]: true })
    } else {
      localStorage.setItem(ONBOARDED_KEY, 'true')
    }
  } catch {
    // ignore
  }
}