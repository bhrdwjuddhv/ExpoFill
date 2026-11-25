// Windows: a terminal that reports the drive as `c:` makes Vitest load its runner twice
// ("failed to find the runner"). Start Vitest with upper-case drive letters instead.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const upperDrive = (p) => p.replace(/^[a-z]:/, (d) => d.toUpperCase());
const bin = upperDrive(fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)));
const { status } = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], {
  cwd: upperDrive(process.cwd()),
  stdio: 'inherit',
});
process.exit(status ?? 1);
