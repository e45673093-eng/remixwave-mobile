import { access, readdir } from 'node:fs/promises';

const required = ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'sw.js'];
for (const file of required) {
  await access(new URL(`../www/${file}`, import.meta.url));
}
const entries = await readdir(new URL('../www/', import.meta.url));
if (!entries.includes('icons')) throw new Error('Missing www/icons directory');
console.log('RemixWave web app is ready for Capacitor sync.');
