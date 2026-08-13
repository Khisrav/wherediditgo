import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const OUT = '/tmp/wherediditgo-ux'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()
const notes = []

page.on('pageerror', (err) => notes.push(`PAGEERROR: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') notes.push(`CONSOLE: ${msg.text()}`)
})

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// Clear IndexedDB so we see onboarding fresh
await page.evaluate(async () => {
  const dbs = await indexedDB.databases?.()
  if (dbs) {
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name)
    }
  }
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

await page.screenshot({ path: `${OUT}/01-onboarding.png`, fullPage: true })
notes.push('Onboarding visible: ' + (await page.locator('text=WhereDidItGo').first().isVisible()))

// Complete onboarding
const select = page.locator('select')
if (await select.count()) {
  await select.selectOption('USD')
}
await page.getByRole('button', { name: /get started/i }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/02-home-empty.png`, fullPage: true })

async function openAdd() {
  await page.getByLabel('Add transaction').click()
  await page.waitForTimeout(400)
}

async function tapDigit(d) {
  await page.getByLabel(d === '.' ? 'Decimal' : d, { exact: true }).click()
}

// Add expense via FAB
await openAdd()
await page.screenshot({ path: `${OUT}/03-add-sheet.png`, fullPage: true })

// Enter 42.50
for (const d of ['4', '2', '.', '5', '0']) {
  await tapDigit(d)
}
await page.getByRole('button', { name: 'Continue' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/04-add-details.png`, fullPage: true })
await page.getByRole('button', { name: /^Save$/ }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/05-home-after-expense.png`, fullPage: true })

// Add income 1000
await openAdd()
await page.getByRole('tab', { name: 'income' }).click()
for (const d of ['1', '0', '0', '0']) {
  await tapDigit(d)
}
await page.getByRole('button', { name: 'Continue' }).click()
await page.getByRole('button', { name: /^Save$/ }).click()
await page.waitForTimeout(500)

async function goTab(name) {
  await page.getByLabel('Main').getByRole('link', { name }).click()
  await page.waitForTimeout(500)
}

// Navigate tabs
await goTab('Activity')
await page.screenshot({ path: `${OUT}/06-activity.png`, fullPage: true })

await goTab('Budgets')
await page.screenshot({ path: `${OUT}/07-budgets-empty.png`, fullPage: true })

// Add a budget
const foodChip = page.getByRole('button', { name: /Food/i }).first()
if (await foodChip.count()) {
  await foodChip.click()
} else {
  await page.getByRole('button', { name: /add a budget/i }).click()
}
await page.waitForTimeout(300)
const limit = page.locator('input[placeholder="0.00"]')
await limit.fill('300')
await page.getByRole('button', { name: /save budget/i }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/08-budgets-set.png`, fullPage: true })

await goTab('Insights')
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/09-insights.png`, fullPage: true })

await goTab('Home')
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/10-home-filled.png`, fullPage: true })

// Settings
await page.getByRole('link', { name: 'Settings' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/11-settings.png`, fullPage: true })

await page.getByRole('button', { name: /manage accounts/i }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/12-accounts.png`, fullPage: true })

// Capture home hero text for UX notes
await goTab('Home')
const hero = await page.locator('.hero-card').innerText().catch(() => '')
notes.push('HOME_HERO:\n' + hero)

console.log(JSON.stringify({ notes, shots: OUT }, null, 2))
await browser.close()
