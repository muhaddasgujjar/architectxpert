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
  maxDuration: 60,
  launcherType: 'Nodejs',
  shouldAddHelpers: true
}, null, 2));

// Inject service URLs as a .env loader prepended to the function
const envLoader = `
process.env.FLOORPLAN_SERVICE_URL = process.env.FLOORPLAN_SERVICE_URL || 'https://architectxpert-floorplan.onrender.com';
process.env.COST_SERVICE_URL = process.env.COST_SERVICE_URL || 'https://architectxpert-cost.onrender.com';
process.env.REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL || 'https://architectxpert-report.onrender.com';
`;
const original = readFileSync(join(fnDir, 'index.cjs'), 'utf8');
writeFileSync(join(fnDir, 'index.cjs'), envLoader + original);

console.log('Build Output API structure created successfully.');
