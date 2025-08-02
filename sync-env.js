import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const isProd = process.argv.includes('--prod')
const envFlag = isProd ? '--prod' : ''

const envFile = isProd ? '.env.prod' : '.env.local'
const envPath = path.join(process.cwd(), envFile)

if (!fs.existsSync(envPath)) {
  console.error(`${envFile} not found`)
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
const lines = content.split('\n')

lines.forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [left, ...rightParts] = trimmed.split('=')
    if (left && rightParts.length > 0) {
      const key = left.trim()
      const value = rightParts.join('=').trim()
      const command = `pnpm convex env ${envFlag} set ${key} ${value}`.trim()
      console.log(`Running: ${command}`)
      try {
        execSync(command, { stdio: 'inherit' })
      } catch (error) {
        console.error(`Failed to set ${key}:`, error.message)
      }
    }
  }
})