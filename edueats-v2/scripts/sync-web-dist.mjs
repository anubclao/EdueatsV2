import fs from 'fs';
import path from 'path';

const root = process.cwd();
const source = path.join(root, 'apps', 'web', 'dist');
const target = path.join(root, 'apps', 'api', 'dist', 'web');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  console.error(`[sync-web-dist] No existe index.html en: ${source}`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });

console.log(`[sync-web-dist] Copiado ${source} -> ${target}`);
