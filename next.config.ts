import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
const appVersion = pkg.version || '0.0.0'

// Get git short hash (fallback to 'dev' if not a git repo)
let gitHash = 'dev'
try {
  gitHash = execSync('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
} catch {
  // Not a git repo or git not available
}

const buildDate = new Date().toISOString()

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_BUILD_ID: gitHash,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
