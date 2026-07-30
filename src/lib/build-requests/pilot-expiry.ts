export function parsePilotExpiryUtc(value: string) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('invalid_pilot_expiry')
  const instant = new Date(`${value}:00.000Z`)
  if (
    Number.isNaN(instant.valueOf()) ||
    instant.getUTCFullYear() !== Number(match[1]) ||
    instant.getUTCMonth() + 1 !== Number(match[2]) ||
    instant.getUTCDate() !== Number(match[3]) ||
    instant.getUTCHours() !== Number(match[4]) ||
    instant.getUTCMinutes() !== Number(match[5])
  ) {
    throw new Error('invalid_pilot_expiry')
  }
  return instant.toISOString()
}
