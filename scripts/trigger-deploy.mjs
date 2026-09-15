import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const webhook = process.env.EDGEONE_DEPLOY_WEBHOOK

if (!webhook) {
  console.error('EDGEONE_DEPLOY_WEBHOOK is missing')
  process.exit(1)
}

const response = await fetch(webhook, { method: 'POST' })

if (!response.ok) {
  console.error(`EdgeOne deploy failed with HTTP ${response.status}`)
  process.exit(1)
}

console.log(`EdgeOne deploy triggered: HTTP ${response.status}`)
