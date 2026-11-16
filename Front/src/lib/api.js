let csrfToken = ''

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export async function api(path, { method = 'GET', body, ...options } = {}) {
  const multipart = body instanceof FormData
  const response = await fetch(`/api${path}`, {
    ...options,
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(!multipart && body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
    },
    body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
  })
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (data.csrf_token) csrfToken = data.csrf_token
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('petfave:expired'))
    throw new ApiError(
      data.message || 'The request could not be completed. Please try again.',
      response.status,
      data.errors,
    )
  }
  return data
}

export const date = (value, options = {}) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
      }).format(new Date(value))
    : '—'
export const time = (value) =>
  date(value, {
    month: undefined,
    day: undefined,
    year: undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
export const money = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0))
export const localInput = (value) => {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
  return parts.replace(' ', 'T')
}
export const utcInput = (value) => (value ? new Date(`${value}:00+08:00`).toISOString() : null)
