import { test, expect } from '@playwright/test'

test.describe('Login flow', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Expenses/i)
  })

  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /Expenses/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})
