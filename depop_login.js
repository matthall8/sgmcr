// playwright-extra is a drop-in replacement for playwright,
// it augments the installed playwright with plugin functionality
const { chromium } = require('playwright-extra')

// Load the stealth plugin and use defaults (all tricks to hide playwright usage)
// Note: playwright-extra is compatible with most puppeteer-extra plugins
const stealth = require('puppeteer-extra-plugin-stealth')()

// Add the plugin to playwright (any number of plugins can be added)
chromium.use(stealth)
const env = require('dotenv').config();

// That's it, the rest is playwright usage as normal 😊
chromium.launch({ headless: false }).then(async browser => {
  const page = await browser.newPage()
  console.log('Testing the stealth plugin..')
  await page.goto('https://www.depop.com', { waitUntil: 'networkidle' })
  page.once('load', () => console.log('Page loaded!'));
  await page.locator('.sc-gicCDI').click();
  await page.goto('https://www.depop.com/');
  await page.title().then(console.log(page.title()));
  await page.locator('.sc-gicCDI').click();
  await page.locator('.sc-gicCDI').dblclick();
  await page.getByTestId('cookieBanner__acceptAllButton').click();
  await page.getByTestId('navigation__login').click();
  await page.goto('https://www.depop.com/login/', { waitUntil: 'networkidle' });
  await page.fill('input#username', process.env.DEPOP_USERNAME);
  await page.fill('input#password', proces.env.DEPOP_PASSWORD);
  await page.click("button[type=submit]", {delay: 2000});
  await page.waitForURL('https://www.depop.com/');
   // Teardown
  await browser.close();
})




