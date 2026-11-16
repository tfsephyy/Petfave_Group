import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { testEnvironment } from '../playwright.config.js'

export default function setup() {
  mkdirSync('test-results', { recursive: true })
  const database = testEnvironment.DB_DATABASE
  if (!existsSync(database)) writeFileSync(database, '')
  const run = (args) =>
    execFileSync('php', ['../Group-System/artisan', ...args, '--no-interaction'], {
      env: testEnvironment,
      encoding: 'utf8',
    })
  run(['migrate', '--force'])
  run(['db:seed', '--force'])
  const email = `browser-admin-${Date.now()}@example.test`
  const output = run(['petfave:staff', email, '--name=Browser Administrator'])
  const password = output.match(/Temporary password: (\S+)/)?.[1]
  if (!password) throw new Error('Could not provision browser test staff.')
  writeFileSync('test-results/browser-staff.json', JSON.stringify({ email, password }))
}
