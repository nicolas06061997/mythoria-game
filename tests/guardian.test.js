// MYTHORIA GUARDIAN : vérifications du code (version, mode hors ligne, syntaxe, three.js, manifeste).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { staticChecks } from '../guardian/static.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const checks = await staticChecks(ROOT);
for (const c of checks) test('Guardian · ' + c.name, () => assert.ok(c.ok, c.detail));
