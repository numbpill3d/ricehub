import { access, readFile } from 'node:fs/promises';

const required = ['index.html', 'src/main.js', 'src/styles.css'];
for (const file of required) {
  await access(file);
}

const html = await readFile('index.html', 'utf8');
if (!html.includes('/src/main.js')) throw new Error('index.html does not load /src/main.js');

const js = await readFile('src/main.js', 'utf8');
for (const token of ['localStorage', 'post-form', 'comment-form', 'toggleArray', 'exportDb', 'importDb']) {
  if (!js.includes(token)) throw new Error(`missing expected app token: ${token}`);
}

console.log('ricehub check ok');
