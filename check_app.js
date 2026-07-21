const puppeteer = require('./node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  page.on('requestfailed', r => errors.push('REQ_FAILED: ' + r.url() + ' - ' + r.failure().errorText));

  await page.goto('https://spam-detection-1dzb.onrender.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const rootHTML = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 500) : 'ROOT_NOT_FOUND';
  });

  console.log('=== ROOT HTML ===');
  console.log('Length:', rootHTML.length, 'Preview:', rootHTML.substring(0, 200));

  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log(e));

  console.log('\n=== CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));

  await browser.close();
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
