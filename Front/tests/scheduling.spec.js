import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const dayLabel = (day) =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${day}T00:00:00+08:00`))

test('staff choose an available clinic date and 15-minute time for booking and rescheduling', async ({
  page,
}) => {
  const credentials = JSON.parse(readFileSync('test-results/browser-staff.json', 'utf8'))
  await page.goto('/login')
  await page.getByLabel('Email address').fill(credentials.email)
  await page.getByLabel('Password', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  const session = await (await page.request.get('/api/session')).json()
  const headers = { 'X-CSRF-TOKEN': session.csrf_token, Accept: 'application/json' }
  const guardianResponse = await page.request.post('/api/guardians', {
    headers,
    data: { name: 'Scheduling Parent', email: `scheduling-${Date.now()}@example.test` },
  })
  expect(guardianResponse.status()).toBe(201)
  const guardian = await guardianResponse.json()
  const options = await (await page.request.get('/api/options')).json()
  const name = `Scheduling Pet ${Date.now()}`
  const petResponse = await page.request.post('/api/animals', {
    headers,
    data: { name, guardian_id: guardian.id, species_id: options.species[0].id, sex: 'female' },
  })
  expect(petResponse.status()).toBe(201)
  const pet = await petResponse.json()
  await page.goto('/app/appointments?new=1')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Plan a little time for care' })).toBeVisible()
  await expect(dialog.getByLabel('Care team', { exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('Starts at', { exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('Ends at', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Time zone', { exact: true })).toHaveCount(0)
  await expect(
    dialog.getByRole('button', { name: 'Request appointment', exact: true }),
  ).toBeDisabled()
  for (const sunday of await dialog.getByRole('button', { name: /^Sunday,/ }).all()) {
    await expect(sunday).toBeDisabled()
  }
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const yesterday = new Date(`${today}T12:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  await expect(
    dialog.getByRole('button', {
      name: dayLabel(yesterday.toISOString().slice(0, 10)),
      exact: true,
    }),
  ).toBeDisabled()
  const target = new Date(`${today}T12:00:00Z`)
  target.setUTCDate(target.getUTCDate() + 2)
  if (target.getUTCDay() === 0) target.setUTCDate(target.getUTCDate() + 1)
  const chosenDay = target.toISOString().slice(0, 10)
  if (chosenDay.slice(0, 7) !== today.slice(0, 7))
    await dialog.getByRole('button', { name: 'Next month', exact: true }).click()
  await dialog.getByLabel('Patient', { exact: true }).selectOption(pet.id)
  await dialog.getByRole('button', { name: dayLabel(chosenDay), exact: true }).click()
  await expect(dialog.getByRole('radio').first()).toBeVisible()
  await expect(dialog.getByRole('radio', { name: '12:00 PM', exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('radio', { name: '4:30 PM', exact: true })).toHaveCount(0)
  await dialog.locator('.booking-time-option').first().click()
  await page.screenshot({ path: 'test-results/scheduling-desktop.png', fullPage: true })
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/bookings') && response.request().method() === 'POST',
  )
  await dialog.getByRole('button', { name: 'Request appointment', exact: true }).click()
  const response = await created
  expect(response.status()).toBe(201)
  const booking = await response.json()
  expect(new Date(booking.ends_at) - new Date(booking.starts_at)).toBe(15 * 60 * 1000)
  expect(response.request().postDataJSON()).not.toHaveProperty('resource_id')
  await expect(dialog).toHaveCount(0)
  if (chosenDay.slice(0, 7) !== today.slice(0, 7))
    await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await page.locator('.calendar-event').filter({ hasText: name }).click()
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Make a little change of plans' })).toBeVisible()
  await expect(dialog.getByRole('radio', { checked: true })).toHaveCount(1)
  const lateTime = dialog.getByRole('radio', { name: '4:15 PM', exact: true })
  await expect(lateTime).toHaveCount(1)
  await dialog.getByText('4:15 PM', { exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/scheduling-mobile.png', fullPage: true })
  const updated = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/bookings/${booking.id}`) &&
      response.request().method() === 'PUT',
  )
  await dialog.getByRole('button', { name: 'Save new time', exact: true }).click()
  expect((await updated).status()).toBe(200)
  await expect(dialog).toHaveCount(0)
  const saved = await (
    await page.request.get(
      `/api/bookings?from=${encodeURIComponent(`${chosenDay}T00:00:00+08:00`)}&to=${encodeURIComponent(`${chosenDay}T23:59:59+08:00`)}`,
    )
  ).json()
  const finalBooking = saved.data.find((item) => item.id === booking.id)
  expect(
    new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(finalBooking.ends_at)),
  ).toBe('4:30 PM')
  const cleanup = await page.request.patch(`/api/bookings/${booking.id}/status`, {
    headers,
    data: { status: 'cancelled', reason: 'Scheduling test completed' },
  })
  expect(cleanup.status()).toBe(200)
})
