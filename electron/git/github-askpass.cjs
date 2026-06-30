#!/usr/bin/env node
const token = process.env.GITFREDO_GITHUB_TOKEN || ''
process.stdout.write(`x-access-token\n${token}`)
