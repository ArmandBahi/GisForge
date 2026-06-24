#!/usr/bin/env node
/**
 * Regenerates Supabase TypeScript types from the local database.
 * Requires: supabase start && supabase db reset (or migration up)
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const outFile = resolve('src/app/core/supabase/database.types.ts');

try {
  execSync('supabase status', { stdio: 'pipe' });
} catch {
  console.error('Supabase local is not running. Start it with: supabase start');
  process.exit(1);
}

execSync(`supabase gen types typescript --local > "${outFile}"`, {
  stdio: 'inherit',
  shell: true,
});

if (!existsSync(outFile)) {
  console.error('Type generation failed — output file not created.');
  process.exit(1);
}

console.log(`Types written to ${outFile}`);
