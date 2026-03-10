#!/usr/bin/env node

/**
 * Generates public/sw.js from public/sw.template.js
 * Replaces __CACHE_VERSION__ with the version from package.json
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const version = pkg.version || '0.0.0'

const template = fs.readFileSync(path.join(root, 'public', 'sw.template.js'), 'utf8')
const output = template.replace(/__CACHE_VERSION__/g, version)

fs.writeFileSync(path.join(root, 'public', 'sw.js'), output)
console.log(`Generated sw.js with cache version: bakeryos-v${version}`)
