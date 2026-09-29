import { cp, mkdir, rm } from 'node:fs/promises';
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
for (const name of ['index.html', 'assets']) {
  await cp(new URL(name, root), new URL(`dist/${name}`, root), { recursive: true });
}
console.log('Static site built in dist/');
