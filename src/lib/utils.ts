// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Generates a fun invite code like "WOLF-7X2K"
 * Called when a user creates a new league
 */
export function generateInviteCode(): string {
  const words = [
    'WOLF', 'LION', 'EAGLE', 'BULL', 'HAWK',
    'FOX',  'BEAR', 'TIGER', 'LYNX', 'PUMA'
  ]
  const word = words[Math.floor(Math.random() * words.length)]
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${word}-${suffix}`
}