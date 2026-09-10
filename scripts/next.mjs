import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const env = {...process.env};
// Next 16.3's automatic WASM lookup resolves a package name as a file URL on
// Windows. Give its fallback loader the installed package directory explicitly.
// Keep next and @next/swc-wasm-nodejs versions in sync when upgrading.
if (process.platform === 'win32') env.NEXT_TEST_WASM_DIR = path.dirname(require.resolve('@next/swc-wasm-nodejs'));
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...process.argv.slice(2)], {stdio: 'inherit', env, windowsHide: true});
child.on('error', error => {console.error(error.message); process.exitCode = 1;});
child.on('exit', code => {process.exitCode = code ?? 1;});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
