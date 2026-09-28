// Remembers the channel of the last sale on this device, so the next sale
// starts with it selected. A convenience only: nothing depends on it.
const KEY = 'gestao3d.lastChannel'

export function readLastChannel(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function storeLastChannel(channelId: string) {
  try {
    localStorage.setItem(KEY, channelId)
  } catch {
    // ignore: storage unavailable
  }
}
