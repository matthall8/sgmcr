const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const { chromium } = require('playwright-extra');
const { parse } = require('node-html-parser');
const { response } = require('express');
const { Console } = require('console');
const e = require('express');

const SHEET_ID = '1B2LtyVkW98Fn23q0V8IlDrsLclwoXmJDXpI9X57JVVw'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));
/**
   * Reads previously authorized credentials from the save file.
   *
   * @return {Promise<OAuth2Client|null>}
   */
async function loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  /**
   * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
   *
   * @param {OAuth2Client} client
   * @return {Promise<void>}
   */
  async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  }

  async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await saveCredentials(client);
    }
    return client;
  }
  const stealth = require('puppeteer-extra-plugin-stealth')()
  chromium.use(stealth)
  try {
  chromium.launch({ headless: true }).then(async browser => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.depop.com/streetgarms/');
    await page.getByTestId('cookieBanner__acceptAllButton').click();
    for (let i = 0; i < 24; i++) {
        page.mouse.wheel(0, 15000);
        await sleep(200);
    }
    await sleep(500);
    const links = page.locator('[data-testid="product__item"]');
    const linksCount = await links.count();
    const hrefs = [];
    for (let i = 0; i < linksCount; i++) {
      let relativeLink = await links.nth(i).getAttribute('href');
      hrefs.push(`https://www.depop.com${relativeLink}`);
    }    
    for (let i = 0; i < 1; i++) {
      await page.goto(hrefs[i]);
      const html = await page.content();
      const root = parse(html);
      const sold = await page.isVisible('[data-testid="button__sold"]');
      const url = hrefs[i];
      console.log(url);
      if (!sold) {
        const price = root.querySelector('[data-testid="discountedPrice"]').text;
        const sizeExists = await page.isVisible('[data-testid="product__singleSize"]');
        let size_formatted = "N/A"
        if(sizeExists) {
            const size = root.querySelector('[data-testid="product__singleSize"]').text;
            size_formatted = size.match('(?<=Size).*$')[0];
        }
        const brandExists = await page.isVisible('[data-testid="product__brand"]');
        let brand = "N/A"
        if(brandExists) {
            brand = root.querySelector('[data-testid="product__brand"]').text;
        }
        const condition = root.querySelector('[data-testid="product__condition"]').text;
        const description = root.querySelector('[data-testid="product__description"]').text;
        const colour = root.querySelector('[data-testid="product__colour"]').text;
        const product_name = description.match('.+?(?=\n)')[0];
        async function listMajors(auth) {
            const sheets = google.sheets({ version: 'v4', auth });
            await sheets.spreadsheets.values.append({
              spreadsheetId: SHEET_ID,
              valueInputOption: 'USER_ENTERED',
              range: 'Scraped_Inventory!A1:A1',
              requestBody: {
                values: [
                  [product_name, price, size_formatted,brand,colour,condition, url, description]
                ]
              }
            });
          }
          authorize().then(listMajors).catch(console.error)
      }
      sleep(500);
      console.log(i);
    }

    await context.close();
    await browser.close();
  })
}
catch(err) {
  console.log("Error");
}