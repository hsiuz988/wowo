const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
// 塗鴉畫風（預設）：手繪房間、塗鴉女孩、床上的貓、晚上蓋一層深藍、整套介面；設定裡可以換回像素畫風
const URL = process.env.LIFEY_URL || 'http://127.0.0.1:8770/';
const OUT = process.env.LIFEY_OUT || require('os').tmpdir();

const tab = (p, t) => p.click(`#tabbar [data-tab-btn="${t}"]`);
const assert = (c, msg) => { if (!c) { console.log('❌ FAIL', msg); process.exitCode = 1; } else console.log('✅', msg); };
const errors = [];

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  p.on('pageerror', (e) => errors.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.clock.install({ time: new Date('2026-05-10T14:00:00') });
  await p.goto(URL);
  assert(await p.evaluate(() => document.documentElement.dataset.art) === 'doodle', '預設是塗鴉畫風');
  assert(await p.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(253, 244, 227)', '紙張色的底');
  await p.fill('#setup-form [name=name]', 'Hsiu'); await p.fill('#setup-form [name=birthday]', '1995-03-02'); await p.click('#setup-form button[type=submit]');
  await p.waitForFunction(() => document.querySelector('#look-dialog').open);
  assert(await p.$eval('#look-dialog .look-full img', (e) => e.getAttribute('src').includes('doodle/girl_front')), '換裝畫面是塗鴉女孩');
  await p.click('#look-save');
  await p.waitForTimeout(800);

  assert(await p.$eval('#scene svg image.room-art', (e) => e.getAttribute('href').includes('doodle/room.webp')), '首頁是塗鴉房間');
  const hots = await p.$$eval('#scene .hot', (els) => els.map((e) => e.dataset.name));
  assert(['diary', 'letter', 'shelf', 'plant', 'bed', 'lamp', 'clock', 'window'].every((n) => hots.includes(n)), `房間的東西都能點（${hots.join('、')}）`);
  assert(await p.$eval('#cy-look img', (e) => e.getAttribute('src').includes('doodle/girl_front')), '首頁的頭像是塗鴉女孩');
  await p.screenshot({ path: OUT + '/doodle-home.png' });

  // 點貓：呼嚕呼嚕
  await p.click('#scene .room-cat');
  await p.waitForTimeout(200);
  assert(/呼嚕|翻了個身|睡得好熟/.test(await p.textContent('#scene-bubble')), '點床上的貓會說話');

  // 點地板：走路時是側面，走到了變回正面
  const box = await p.$eval('#scene svg', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.click(box.x + box.w * .62, box.y + box.h * .84);
  await p.waitForTimeout(120);
  assert(await p.$eval('#scene', (e) => e.dataset.pose) === 'side', '走路時換成側面');
  await p.waitForTimeout(2500);
  assert(await p.$eval('#scene', (e) => e.dataset.pose) === 'front', '走到了轉回正面');

  // 日記本打開記一筆
  await p.click('#scene .hot[data-name="diary"]');
  await p.waitForFunction(() => document.querySelector('#moment-dialog').open, null, { timeout: 5000 });
  assert(true, '點書桌上的日記本會打開記一筆');
  await p.screenshot({ path: OUT + '/doodle-moment.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // 晚上：蓋一層深藍，檯燈亮著；關燈更暗
  await p.clock.setFixedTime(new Date('2026-05-10T21:00:00'));
  await p.evaluate(() => { location.reload(); });
  await p.waitForSelector('#scene .hot[data-name="lamp"]');
  await p.waitForTimeout(600);
  assert(await p.$eval('#scene', (e) => e.dataset.light === 'night' && e.dataset.lamp === 'on'), '晚上房間變暗、檯燈亮著');
  await p.click('#scene .hot[data-name="lamp"]');
  await p.waitForFunction(() => document.querySelector('#scene').dataset.lamp === 'off', null, { timeout: 5000 });
  assert(true, '點檯燈關燈');

  // 換回像素畫風（重新整理）
  await tab(p, 'me');
  await p.click('[data-open="other"]');
  await p.waitForTimeout(300);
  assert(await p.$eval('#palette-field', (e) => getComputedStyle(e).display === 'none'), '塗鴉畫風不顯示配色');
  await Promise.all([p.waitForEvent('load'), p.click('#art-chips [data-art="pixel"]')]);
  await p.waitForSelector('#scene svg image.room-art');
  assert(await p.evaluate(() => document.documentElement.dataset.art) === 'pixel', '可以換回像素畫風');
  assert(await p.$eval('#scene svg image.room-art', (e) => e.getAttribute('href').includes('pixel_room/room.webp')), '像素畫風是原本的房間');

  assert(!errors.length, `沒有錯誤${errors.length ? '：' + errors.join(' | ') : ''}`);
  await b.close();
})().catch((e) => { console.log('💥', e.message); process.exitCode = 1; process.exit(1); });
