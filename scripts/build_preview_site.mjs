// Publish the current main build at / and the review build at /final-preview/.
// This keeps the existing public game intact while sharing the new design.
import { cp, mkdir, mkdtemp, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const root = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'getya-main-'));
const baseline = join(temporary, 'source');
await mkdir(baseline);
const archive = join(temporary, 'main.tar');
execFileSync('git', ['archive', '--format=tar', 'origin/main', '-o', archive], { stdio: 'inherit' });
execFileSync('tar', ['-xf', archive, '-C', baseline], { stdio: 'inherit' });
await symlink(resolve(root, 'node_modules'), join(baseline, 'node_modules'), 'dir');
const target = resolve(root, 'pages-review');
execFileSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', target, '--emptyOutDir'], { cwd: baseline, stdio: 'inherit' });
await cp(resolve(root, 'dist'), join(target, 'final-preview'), { recursive: true });
console.log('Prepared existing main site + /final-preview/ review site.');
