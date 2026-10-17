const pad = (n: number) => String(n).padStart(2, '0')

function parts(iso: string) {
  const d = new Date(iso)
  const h = d.getHours()
  return { d, h12: h % 12 || 12, ampm: h < 12 ? 'am' : 'pm', min: pad(d.getMinutes()) }
}

/** 10/12/2026 12:21 pm */
export function formatListDate(iso: string) {
  const { d, h12, ampm, min } = parts(iso)
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(h12)}:${min} ${ampm}`
}

/** 10/12/2026 2:12PM */
export function formatDetailDate(iso: string) {
  const { d, h12, ampm, min } = parts(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${h12}:${min}${ampm.toUpperCase()}`
}

/** 10/12/26 2:15PM */
export function formatNoteDate(iso: string) {
  const { d, h12, ampm, min } = parts(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${h12}:${min}${ampm.toUpperCase()}`
}

/** (608) 718-4604 */
export function formatPhone(digits: string) {
  const s = digits.replace(/\D/g, '')
  return s.length === 10 ? `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}` : digits
}

/** Progressive input mask: xxx xxx-xxxx */
export function maskPhoneInput(raw: string) {
  const s = raw.replace(/\D/g, '').slice(0, 10)
  if (s.length <= 3) return s
  if (s.length <= 6) return `${s.slice(0, 3)} ${s.slice(3)}`
  return `${s.slice(0, 3)} ${s.slice(3, 6)}-${s.slice(6)}`
}

export const formatMoney = (n: number) => `$${n.toFixed(2)}`
