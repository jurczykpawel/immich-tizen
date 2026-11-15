// End-to-end check on the real TV: launches the installed app in debug mode and drives it with remote keys.
// usage: node tools/tv-smoke.mjs   (TV on with developer mode; deploys the current build first)
import { connect } from './cdp.mjs';
import { launchDebug } from './launch.mjs';

const KEY = { left: 37, up: 38, right: 39, down: 40, enter: 13, back: 10009 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };
async function until(tv, expr, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { if (await tv.evaluate(expr)) return true; await sleep(500); }
  return false;
}
const cards = `document.querySelectorAll('[data-card]').length > 0`;
const decoded = `(function(){var i=document.querySelector('img.current');return !!i && i.complete && i.naturalWidth>0})()`;

const { port, stop } = await launchDebug();
await sleep(3000);
const tv = await connect(port);
try {
  check('albums load over LAN, grouped in year shelves', (await until(tv, cards)) && (await tv.evaluate(`document.querySelectorAll('.shelf').length`)) > 1, `${await tv.evaluate(`document.querySelectorAll('.shelf').length`)} shelves`);

  // Regression for the layout that broke on Chromium 76: tiles of different sizes, captions missing, content off screen.
  const L = JSON.parse(await tv.evaluate(`(function(){var t=[].slice.call(document.querySelectorAll('.card .thumb')).slice(0,6).map(function(e){var r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),Math.round(r.left)]});var n=document.querySelector('.card .name');var nr=n&&n.getBoundingClientRect();var m=document.querySelector('.menu').getBoundingClientRect();return JSON.stringify({sizes:t.map(function(x){return x[0]+'x'+x[1]}),minLeft:Math.min.apply(null,t.map(function(x){return x[2]})),menuRight:Math.round(m.right),captionVisible:!!nr&&nr.height>0&&nr.bottom<=innerHeight})})()`));
  const widths = L.sizes.map((s) => Number(s.split('x')[0]));
  check('shelf tiles share one size and clear the side menu', Math.max(...widths) - Math.min(...widths) <= 24 && L.minLeft >= L.menuRight && L.captionVisible, `${L.sizes.slice(0, 3).join(' / ')}, left edge ${L.minLeft}, menu ${L.menuRight}`);

  await tv.key(KEY.left);
  check('Left from the first tile opens the side menu', await until(tv, `!!document.querySelector('.menu.open')`));
  await tv.key(KEY.down);
  check('moving down the menu switches to the years', await until(tv, `!!document.querySelector('[data-section=years] [data-card]')`));
  await tv.key(KEY.right);
  await tv.key(KEY.enter);
  check('a year opens a slideshow of its photos', (await until(tv, `!!document.querySelector('.show')`)) && (await until(tv, decoded)));
  await tv.key(KEY.back);
  check('back from a year returns to the years', await until(tv, `!!document.querySelector('[data-section=years] [data-card]')`));

  await tv.key(KEY.left);
  await tv.key(KEY.down);
  await tv.key(KEY.enter);
  check('settings open from the side menu', await until(tv, `!!document.querySelector('.settings .row')`));
  await tv.key(KEY.back);
  check('back from settings returns to the library', await until(tv, cards));

  await tv.key(KEY.up);
  await tv.key(KEY.up);
  await tv.key(KEY.right);
  await tv.key(KEY.enter);
  await tv.evaluate(`1`);
  check('an album opens a slideshow with a decoded photo', (await until(tv, `!!document.querySelector('.show')`)) && (await until(tv, decoded)));

  const first = await tv.evaluate(`document.querySelector('img.current').src`);
  await tv.key(KEY.right);
  await sleep(1500);
  check('right key shows the next photo', (await tv.evaluate(`document.querySelector('img.current').src`)) !== first);

  await tv.key(KEY.enter);
  const before = await tv.evaluate(`document.querySelector('.hud-state span').innerText`);
  await sleep(10000);
  check('auto-play advances photos', (await tv.evaluate(`document.querySelector('.hud-state span').innerText`)) !== before);
  await tv.key(KEY.enter);

  await tv.key(KEY.back);
  check('back returns to the library', await until(tv, cards));

  const target = JSON.parse(await tv.evaluate(`(function(){var shelves=[].slice.call(document.querySelectorAll('.shelf'));for(var r=0;r<shelves.length;r++){var cs=[].slice.call(shelves[r].querySelectorAll('.card'));for(var c=0;c<cs.length;c++){if(cs[c].querySelector('.name').innerText==='Wideo')return JSON.stringify({r:r,c:c})}}return JSON.stringify(null)})()`));
  if (target) {
    // the library remembers the last position, so go back to the top-left first
    for (let i = 0; i < 12; i++) await tv.key(KEY.up);
    for (let i = 0; i < 12; i++) await tv.key(KEY.left);
    await tv.key(KEY.right);
    for (let i = 0; i < target.r; i++) await tv.key(KEY.down);
    for (let i = 0; i < target.c; i++) await tv.key(KEY.right);
    await tv.key(KEY.enter);
    check('video plays', await until(tv, `(function(){var v=document.querySelector('video');return !!v && !v.paused && v.currentTime>1 && !v.error})()`, 30000));
    await tv.key(KEY.enter);
    await tv.evaluate(`(function(){var v=document.querySelector('video');v.currentTime=Math.max(0,v.duration-2)})()`);
    const position = await tv.evaluate(`document.querySelector('.hud-state span').innerText`);
    check('next item starts after a video ends', await until(tv, `document.querySelector('.hud-state span').innerText !== ${JSON.stringify(position)}`, 20000));
  } else {
    console.log('SKIP video checks (no album named "Wideo")');
  }
} finally {
  tv.close();
  stop();
}
process.exit(results.every(Boolean) ? 0 : 1);
