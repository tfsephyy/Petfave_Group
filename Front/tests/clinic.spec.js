import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('public pages preserve the theme and work on desktop and mobile', async ({
  page,
  context,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good care starts/ })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: 'test-results/landing-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  const secondTab = await context.newPage()
  await secondTab.goto('/login')
  await expect(secondTab.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(secondTab.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({
    path: 'test-results/landing-dark.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#111a28')
  await page.screenshot({
    path: 'test-results/login-dark.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByLabel('Password', { exact: true }).fill('ExamplePassword123!')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(secondTab.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.screenshot({
    path: 'test-results/login-light.png',
    fullPage: true,
    animations: 'disabled',
  })
  await secondTab.close()
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [route, name] of [
    ['/', 'landing'],
    ['/login', 'login'],
    ['/register', 'register'],
    ['/forgot-password', 'recovery'],
  ]) {
    await page.goto(route)
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `test-results/${name}-mobile.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  await page.goto('/')
  await expect(
    page.getByRole('link', { name: 'Create your account', exact: true }).first(),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Sign in', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  expect(errors).toEqual([])
})

test('owner registers, adds a pet, requests a visit, and signs in again', async ({ page }) => {
  const email = `pet-parent-${Date.now()}@example.test`,
    password = 'BrowserPassword123!'
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Browser Pet Parent')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('link', { name: 'My pets', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pet parents', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'My pets', exact: true }).click()
  await page.getByRole('button', { name: 'Register a pet' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Pet’s name').fill('Browser Mochi')
  await dialog.getByLabel('Species', { exact: true }).selectOption({ label: 'Dog' })
  await dialog.getByLabel('Breed (optional)').selectOption({ label: 'Shih Tzu' })
  await dialog.getByLabel('Sex', { exact: true }).selectOption('female')
  await dialog.getByRole('button', { name: 'Register pet', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Browser Mochi' })).toBeVisible()
  await page.getByRole('link', { name: 'Meet Browser Mochi' }).click()
  await expect(page.getByRole('heading', { name: 'A little about Browser Mochi' })).toBeVisible()
  await page.getByRole('link', { name: 'Plan their next visit' }).last().click()
  await expect(dialog).toBeVisible()
  const future = new Date(Date.now() + 86400000 * 3)
  if (future.getUTCDay() === 0) future.setUTCDate(future.getUTCDate() + 1)
  const day = future.toISOString().slice(0, 10)
  const dateLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${day}T00:00:00+08:00`))
  if (
    day.slice(0, 7) !==
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' })
      .format(new Date())
      .slice(0, 7)
  ) {
    const target = dialog.getByRole('button', { name: dateLabel, exact: true })
    if ((await target.count()) === 0 || (await target.isDisabled())) {
      await dialog.getByRole('button', { name: 'Next month', exact: true }).click()
    }
  }
  await dialog.getByRole('button', { name: dateLabel, exact: true }).click()
  await expect(dialog.getByRole('radio').first()).toBeVisible()
  await dialog.locator('.booking-time-option').first().click()
  await dialog.getByRole('button', { name: 'Request appointment' }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByRole('cell', { name: 'pending', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Account settings', exact: true }).click()
  await expect(page.getByLabel('Full name')).toHaveValue('Browser Pet Parent')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.screenshot({ path: 'test-results/owner-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('link', { name: 'My pets', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'My pets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Browser Mochi' })).toBeVisible()
  await expect(page.locator('.sidebar')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -234, 0)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/owner-mobile.png', fullPage: true })
})

test('account settings confirms logout and keeps the session on cancel or failure', async ({
  page,
}) => {
  const credentials = JSON.parse(readFileSync('test-results/browser-staff.json', 'utf8'))
  await page.goto('/login')
  await page.getByLabel('Email address').fill(credentials.email)
  await page.getByLabel('Password', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.getByRole('link', { name: 'Account settings', exact: true }).click()

  const dialog = page.getByRole('dialog')
  const logout = page.getByRole('button', { name: 'Log out', exact: true })
  await logout.click()
  await expect(dialog.getByRole('heading', { name: 'Log out?', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page).toHaveURL(/\/app\/settings$/)

  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect((await (await page.request.get('/api/session')).json()).user.email).toBe(credentials.email)

  await page.route('**/api/logout', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unable to log out. Please try again.' } }),
  )
  await logout.click()
  await dialog.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Unable to log out. Please try again.')
  await expect(dialog.getByRole('button', { name: 'Log out', exact: true })).toBeEnabled()
  expect((await (await page.request.get('/api/session')).json()).user.email).toBe(credentials.email)

  await page.unroute('**/api/logout')
  await dialog.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect((await (await page.request.get('/api/session')).json()).user).toBeNull()
  await page.goto('/app/settings')
  await expect(page).toHaveURL(/\/login$/)
})

test('staff manage contacts, patients, clinical records, visits, and inventory', async ({
  page,
}) => {
  const credentials = JSON.parse(readFileSync('test-results/browser-staff.json', 'utf8'))
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/login')
  await page.getByLabel('Email address').fill(credentials.email)
  await page.getByLabel('Password', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.getByRole('link', { name: 'Pet parents', exact: true }).click()
  await page.getByRole('button', { name: 'Add pet parent' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Full name').fill('Clinic Test Parent')
  await dialog.getByLabel('Email address').fill(`contact-${Date.now()}@example.test`)
  await dialog.getByRole('button', { name: 'Save pet parent' }).click()
  await expect(page.getByText('Clinic Test Parent', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Patients', exact: true }).click()
  await page.getByRole('button', { name: 'Register a pet' }).first().click()
  await dialog.getByLabel('Pet’s name').fill('Clinic Test Milo')
  await dialog.getByLabel('Pet parent', { exact: true }).selectOption({
    label: await dialog
      .getByLabel('Pet parent', { exact: true })
      .locator('option')
      .filter({ hasText: 'Clinic Test Parent' })
      .textContent(),
  })
  await dialog.getByLabel('Species', { exact: true }).selectOption({ label: 'Cat' })
  await dialog.getByRole('button', { name: 'Register pet', exact: true }).click()
  await page.getByRole('link', { name: 'Meet Clinic Test Milo' }).click()
  await page.getByRole('tab', { name: /Vaccinations/ }).click()
  await page.getByRole('button', { name: 'Add record' }).click()
  await dialog.getByLabel('Title / procedure / product').fill('Browser rabies vaccine')
  await dialog.getByRole('button', { name: 'Add health record' }).click()
  await expect(page.getByRole('heading', { name: 'Browser rabies vaccine' })).toBeVisible()
  await page.getByRole('button', { name: 'Correct record' }).click()
  await dialog.getByLabel('Additional notes').fill('Corrected during browser test')
  await dialog.getByLabel('Reason for correction').fill('Additional clinical information')
  await dialog.getByRole('button', { name: 'Save correction' }).click()
  await expect(page.getByText('Corrected during browser test')).toBeVisible()
  await page.getByRole('tab', { name: 'Clinic visits' }).click()
  await page.getByRole('button', { name: 'Record visit', exact: true }).click()
  await dialog.getByLabel('Visit summary').fill('Browser wellness visit')
  await dialog.getByLabel('Diagnosis', { exact: true }).fill('Routine review')
  await dialog.getByRole('button', { name: 'Save visit' }).click()
  await expect(page.getByRole('heading', { name: 'Browser wellness visit' })).toBeVisible()
  await page.getByRole('link', { name: 'Inventory', exact: true }).click()
  await page.getByRole('button', { name: 'Add product' }).first().click()
  await dialog.getByLabel('Product name').fill('Browser supplies')
  await dialog.getByLabel('SKU / product code').fill(`BROWSER-${Date.now()}`)
  await dialog.getByLabel('Category', { exact: true }).fill('Consumables')
  await dialog.getByLabel('Opening stock').fill('10')
  await dialog.getByRole('button', { name: 'Save product' }).click()
  await page.getByLabel('Search name or SKU…').fill('Browser supplies')
  await page.getByRole('button', { name: 'Issue Browser supplies', exact: true }).click()
  await dialog.getByLabel('Quantity', { exact: true }).fill('3')
  await dialog.getByLabel('Recipient / reason for use').fill('Used during clinic browser test')
  await dialog.getByRole('button', { name: 'Issue stock', exact: true }).click()
  await expect(page.getByText('7 unit', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Movement history' }).click()
  await expect(page.getByText('Used during clinic browser test', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Audit trail', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The audit trail' })).toBeVisible()
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible()
  await page.screenshot({ path: 'test-results/staff-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: 'test-results/staff-dark.png', fullPage: true })
  expect(errors).toEqual([])
})
