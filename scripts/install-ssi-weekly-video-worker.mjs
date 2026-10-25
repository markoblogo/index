import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const configPath = args[args.indexOf('--config') + 1];
if (!args.includes('--config') || !configPath) throw new Error('private_config_required');
process.umask(0o077);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (config.apiUrl !== 'https://spike.1d3x.com/api/admin/media-hub/weekly-video-worker' || config.startDate < '2026-11-01') throw new Error('worker_scope_invalid');
execFileSync(config.python, ['services/ssi-weekly-video-worker/render.py', '--config', configPath, '--preflight'], { stdio: 'inherit' });
const root = path.join(homedir(), 'Library/Application Support/SSIWeeklyVideoWorker');
mkdirSync(root, { recursive: true, mode: 0o700 });
const require = createRequire(import.meta.url);
await require('esbuild').build({ entryPoints: ['scripts/ssi-weekly-video-worker.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile: path.join(root, 'worker.mjs') });
for (const file of ['render.py', 'launch.py']) copyFileSync(path.join('services/ssi-weekly-video-worker', file), path.join(root, file));
Object.assign(config, { rendererPath: path.join(root, 'render.py'), workerPath: path.join(root, 'worker.mjs') });
writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const launchDir = path.join(homedir(), 'Library/LaunchAgents');
mkdirSync(launchDir, { recursive: true });
const label = 'com.spike.ssi-weekly-video-worker';
const plistPath = path.join(launchDir, label + '.plist');
const command = [config.python, path.join(root, 'launch.py'), path.resolve(configPath)].map(v => `<string>${esc(v)}</string>`).join('');
writeFileSync(plistPath, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${command}</array><key>RunAtLoad</key><true/><key>StartInterval</key><integer>300</integer><key>ProcessType</key><string>Background</string><key>StandardOutPath</key><string>${esc(root + '/worker.log')}</string><key>StandardErrorPath</key><string>${esc(root + '/worker-error.log')}</string><key>EnvironmentVariables</key><dict><key>PYTHONUNBUFFERED</key><string>1</string></dict></dict></plist>`, { mode: 0o600 });
execFileSync('/usr/bin/plutil', ['-lint', plistPath], { stdio: 'inherit' });
// Installation does not enable delivery. Explicit --enable is the owner-approved
// activation step; date, hold, private target and server authorization still gate it.
if (args.includes('--enable')) {
  try { execFileSync('/bin/launchctl', ['bootout', `gui/${userInfo().uid}/${label}`], { stdio: 'ignore' }); } catch { /* First install. */ }
  execFileSync('/bin/launchctl', ['bootstrap', `gui/${userInfo().uid}`, plistPath], { stdio: 'inherit' });
}
console.log(JSON.stringify({ status: 'installed', enabled: args.includes('--enable'), startsOn: config.startDate, reportsGenerated: false, messagesSent: false }));
