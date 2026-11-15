// Deploys the current build to the TV and starts it with the DevTools debugger enabled.
import { execFileSync, spawn } from 'node:child_process';

const SDB = `${process.env.TIZEN_STUDIO ?? `${process.env.HOME}/tizen-studio`}/tools/sdb`;
if (!process.env.TV_HOST) throw new Error('set TV_HOST to the IP address of the TV');
const DEVICE = `${process.env.TV_HOST}:26101`;
const APP = 'ImmichTV01.immichtv';

export function launchDebug(env = {}) {
  execFileSync(new URL('./deploy.sh', import.meta.url).pathname, { stdio: 'inherit', env: { ALLOW_BAKED_KEY: '1', ...process.env, ...env } });
  return new Promise((resolve, reject) => {
    const p = spawn(SDB, ['-s', DEVICE, 'shell', '0', 'debug', APP]);
    const t = setTimeout(() => { p.kill(); reject(new Error('no debug port')); }, 30000);
    p.stdout.on('data', (d) => { const m = String(d).match(/port: (\d+)/); if (m) { clearTimeout(t); resolve({ port: Number(m[1]), stop: () => p.kill() }); } });
  });
}
