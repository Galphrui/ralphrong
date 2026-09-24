import assert from 'node:assert/strict'
import { mergeSiteModuleSettings, normalizeModuleSettings } from '../src/utils/moduleConfig.js'

assert.equal(normalizeModuleSettings({ uiStyle: 'studio' }).uiStyle, 'studio')
assert.equal(normalizeModuleSettings({ uiStyle: 'classic' }).uiStyle, 'classic')
assert.equal(normalizeModuleSettings({ uiStyle: 'unknown' }).uiStyle, 'classic')
assert.equal(mergeSiteModuleSettings({ settings: { uiStyle: 'studio' }, modules: [] }).uiStyle, 'studio')

console.log('UI style configuration tests passed.')
