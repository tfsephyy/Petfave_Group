import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function signIn(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

async function setPassword(page, temporary, password) {
  await page.getByLabel('Temporary password', { exact: true }).fill(temporary)
  await page.getByLabel('New password', { exact: true }).fill(password)
  await page.getByLabel('Confirm new password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Save password and continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Employee workspace', exact: true })).toBeVisible()
}

test('admin manages employee credentials and employees have limited access', async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180000)
  const admin = JSON.parse(readFileSync('test-results/browser-staff.json', 'utf8'))
  const email = `employee-${Date.now()}@example.test`
  const name = `Browser Employee ${Date.now()}`
  const password = 'EmployeeBrowserPassword123!'
  const newPassword = 'EmployeeReplacementPassword123!'
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await signIn(page, admin.email, admin.password)
  await expect(page).toHaveURL(/\/app$/)
  await page.getByRole('link', { name: 'Employees', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Employees', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add employee', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Full name', { exact: true }).fill(name)
  await dialog.getByLabel('Email address', { exact: true }).fill(email)
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/employees') && response.request().method() === 'POST',
  )
  await dialog.getByRole('button', { name: 'Create employee account', exact: true }).click()
  expect((await created).status()).toBe(201)
  await expect(
    dialog.getByRole('heading', { name: 'Employee sign-in details', exact: true }),
  ).toBeVisible()
  const temporary = await dialog.getByLabel('Temporary password', { exact: true }).inputValue()
  expect(temporary.length).toBeGreaterThanOrEqual(20)
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue(email)
  await dialog.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('textbox', { name: /Search employees/ }).fill(email)
  const row = page.getByRole('row').filter({ hasText: email })
  await expect(row).toContainText('Password change required')
  await page.screenshot({ path: 'test-results/employees-admin-desktop.png', fullPage: true })

  const employeeContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  })
  const employeePage = await employeeContext.newPage()
  employeePage.on('pageerror', (error) => errors.push(error.message))
  try {
    await signIn(employeePage, email, temporary)
    await expect(employeePage).toHaveURL(/\/app\/change-password$/)
    await expect(
      employeePage.getByRole('heading', { name: 'Set your password', exact: true }),
    ).toBeVisible()
    expect((await employeeContext.request.get('/api/animals')).status()).toBe(423)
    await employeePage.goto('/app/settings')
    await expect(employeePage).toHaveURL(/\/app\/change-password$/)
    expect(
      await employeePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true)
    await employeePage.screenshot({
      path: 'test-results/employee-password-mobile.png',
      fullPage: true,
    })
    await setPassword(employeePage, temporary, password)
    await expect(employeePage).toHaveURL(/\/app$/)
    expect((await employeeContext.request.get('/api/employees')).status()).toBe(403)
    expect((await employeeContext.request.get('/api/animals')).status()).toBe(403)
    await employeePage.goto('/app/employees')
    await expect(employeePage).toHaveURL(/\/app$/)
    await employeePage.getByRole('button', { name: 'Open navigation', exact: true }).click()
    const sidebar = employeePage.getByRole('complementary', {
      name: 'Workspace sidebar',
      exact: true,
    })
    await expect(sidebar.getByRole('link', { name: 'Patients', exact: true })).toHaveCount(0)
    await expect(sidebar.getByRole('link', { name: 'Employees', exact: true })).toHaveCount(0)
    await expect(sidebar.getByRole('link', { name: 'Appointments', exact: true })).toHaveCount(0)
    await sidebar.getByRole('link', { name: 'Account settings', exact: true }).click()
    await expect(employeePage.locator('.sidebar')).not.toHaveClass(/open/)
    await expect(
      employeePage.getByRole('heading', { name: 'Account settings', exact: true }),
    ).toBeVisible()
    await employeePage.getByLabel('Full name', { exact: true }).fill(`${name} Updated`)
    await employeePage.getByRole('button', { name: 'Save profile', exact: true }).click()
    await expect(employeePage.getByRole('status')).toContainText('Your details are up to date.')
    await employeePage.goto('/app')
    await expect(
      employeePage.getByRole('heading', { name: 'Employee workspace', exact: true }),
    ).toBeVisible()
    await employeePage.screenshot({ path: 'test-results/employee-home-mobile.png', fullPage: true })
    expect(
      await employeePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true)

    await page.reload()
    await page.getByRole('textbox', { name: /Search employees/ }).fill(email)
    await expect(row).toContainText('Ready')
    const updatedName = `${name} Updated`
    await row.getByRole('button', { name: `Edit ${updatedName}`, exact: true }).click()
    await dialog.getByLabel('Full name', { exact: true }).fill(name)
    await dialog.getByRole('button', { name: 'Save employee', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await row.getByRole('button', { name: `Reset password for ${name}`, exact: true }).click()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await row.getByRole('button', { name: `Reset password for ${name}`, exact: true }).click()
    await dialog.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(
      dialog.getByRole('heading', { name: 'Employee sign-in details', exact: true }),
    ).toBeVisible()
    const replacement = await dialog.getByLabel('Temporary password', { exact: true }).inputValue()
    expect(replacement).not.toBe(temporary)
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await employeePage.reload()
    await expect(employeePage).toHaveURL(/\/login$/)
    await signIn(employeePage, email, password)
    await expect(employeePage.getByRole('alert')).toBeVisible()
    await employeePage.getByLabel('Password', { exact: true }).fill(replacement)
    await employeePage.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(employeePage).toHaveURL(/\/app\/change-password$/)
    await setPassword(employeePage, replacement, newPassword)

    await row.getByRole('button', { name: `Deactivate ${name}`, exact: true }).click()
    await dialog.getByRole('button', { name: 'Deactivate employee', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(row).toContainText('Disabled')
    await employeePage.reload()
    await expect(employeePage).toHaveURL(/\/login$/)
    await signIn(employeePage, email, newPassword)
    await expect(employeePage.getByRole('alert')).toBeVisible()
    await page
      .getByRole('group', { name: 'Employee status', exact: true })
      .getByRole('button', { name: 'Disabled', exact: true })
      .click()
    await expect(row).toContainText('Disabled')
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/employees-admin-mobile.png', fullPage: true })
    await row.getByRole('button', { name: `Reactivate ${name}`, exact: true }).click()
    await dialog.getByRole('button', { name: 'Reactivate employee', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await signIn(employeePage, email, newPassword)
    await expect(
      employeePage.getByRole('heading', { name: 'Employee workspace', exact: true }),
    ).toBeVisible()
    await expect(employeePage).toHaveURL(/\/app$/)
    expect(errors).toEqual([])
  } finally {
    await employeeContext.close()
  }
})
