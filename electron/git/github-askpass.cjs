#!/usr/bin/env node
const token = process.env.gitfreddo_GITHUB_TOKEN || ''
const prompt = (process.argv[2] || '').toLowerCase()

if (prompt.includes('username')) {
  process.stdout.write('x-access-token')
} else {
  process.stdout.write(token)
}
