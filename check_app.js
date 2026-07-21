const puppeteer = require('./node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    const rootHTML = await page.evaluate(() => document.getElementById('root').innerHTML);
    console.log('ROOT_LENGTH:', rootHTML.length);
    console.log('ROOT_PREVIEW:', rootHTML.substring(0, 400));
  } catch(e) {
    console.log('GOTO_ERROR:', e.message);
  }
  errors.forEach(e => console.log(e));
  await browser.close();
  process.exit(0);
})();
