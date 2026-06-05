import { cpSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const OUT = '.vercel/output';

// Clean and create output structure
mkdirSync(join(OUT, 'static'), { recursive: true });

// 1. Config
writeFileSync(join(OUT, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { src: '/api/(.*)', dest: '/api' },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html', status: 200 }
  ]
}, null, 2));

// 2. Static files from frontend/dist/public/
cpSync('frontend/dist/public', join(OUT, 'static'), { recursive: true });

// 3. Serverless function for /api
const fnDir = join(OUT, 'functions/api.func');
mkdirSync(fnDir, { recursive: true });

// Copy the bundled server
cpSync('frontend/dist/index.cjs', join(fnDir, 'index.cjs'));
cpSync('frontend/dist/architect_knowledge.md', join(fnDir, 'architect_knowledge.md'));

// .vc-config.json for the function
writeFileSync(join(fnDir, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs24.x',
  handler: 'index.cjs',
  maxDuration: 30,
  launcherType: 'Nodejs',
  shouldAddHelpers: true
}, null, 2));

console.log('Build Output API structure created successfully.');
