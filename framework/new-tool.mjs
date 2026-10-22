// Create a new tool from the starter.  Usage: npm run new -- <id> "<Display Name>"
//   id: lowercase letters, numbers and dashes (it becomes the folder name), e.g. "namegen"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const noNetwork = process.argv.includes('--no-network'); // build agents: never edit network.json (it would conflict between branches)
const [id, name] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!id || !/^[a-z0-9-]+$/.test(id) || !name) { console.error('Usage: npm run new -- <id> "<Display Name>" [--no-network]'); process.exit(1); }
const dest = path.join(ROOT, 'tools', id);
if (fs.existsSync(dest)) { console.error(`tools/${id} already exists`); process.exit(1); }

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.writeFileSync(b, fs.readFileSync(a, 'utf8').replaceAll('__ID__', id).replaceAll('__NAME__', name));
  }
};
copyDir(path.join(ROOT, 'tools/_starter'), dest);

if (!noNetwork) {
  const netFile = path.join(ROOT, 'network.json');
  const net = JSON.parse(fs.readFileSync(netFile, 'utf8'));
  net.push({ id, name, url: 'https://example.com', blurb: 'TODO', live: false });
  fs.writeFileSync(netFile, JSON.stringify(net, null, 2) + '\n');
}
console.log(`Created tools/${id}. Next: fill in the TODOs in tools/${id}/site.mjs, then run: npm run preview -- ${id}`);
