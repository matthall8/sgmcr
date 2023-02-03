const express = require('express');

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const env = require('dotenv').config();

const { chromium } = require('playwright-extra');
const { parse } = require('node-html-parser');
const { response } = require('express');

const SHEET_ID = process.env.SHEETID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const PORT = parseInt(process.env.PORT) || 8080;
const app = express();

app.get('/', (request, response) => {
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
  chromium.launch({ headless: false }).then(async browser => {
    const context = await browser.newContext();
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const page = await context.newPage();
    await page.goto('https://www.vinted.co.uk/');
    await page.getByRole('button', { name: 'Accept all' }).click();
    await page.setDefaultNavigationTimeout(0);
    await page.getByTestId('header--login-button').click();
    await page.getByTestId('auth-select-type--register-switch').click();
    await page.getByTestId('auth-select-type--login-email').click();
    await page.getByPlaceholder('Email or username').click();
    await page.getByRole('dialog', { name: 'Log in' }).locator('label').first().click();
    await page.getByPlaceholder('Email or username').fill(process.env.VINTED_USERNAME);
    await page.getByPlaceholder('Password').click();
    await page.getByPlaceholder('Password').fill(process.env.VINTED_PASSWORD);
    await sleep(1500);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForNavigation(); 
    await page.context().storageState({ path: 'storageState.json' });
    await page.goto('https://www.vinted.co.uk/member/items/favourite_list');
    await sleep(5000);
    const links = page.locator('.web_ui__ItemBox__overlay');
    const linksCount = await links.count();
    const hrefs = [];
    for (let i = 0; i < linksCount; i++) {
      hrefs.push(await links.nth(i).getAttribute('href'));
    }

    for (let i = 0; i < linksCount; i++) {
      await page.goto(hrefs[i]);
      await sleep(1000);
      const html = await page.content();
      const root = parse(html);
      const product_name = root.querySelectorAll('h2')[1].text;
      const price = root.querySelector('h1').text;
      const brand = root.querySelector('[itemprop=brand]').querySelector('[itemprop=name]').text;
      const size = root.querySelectorAll('.details-list__item-value')[1].text;
      const size_formatted = size.replace(/[\r\n]+/g, "").match(/([a-zA-Z1-9]).((?:\S|\s(?!\s))*)/)[0];
      const condition = root.querySelector('[itemprop=itemCondition]').text;
      const condition_formatted = condition.match(/([a-zA-Z]).+?(?=[\n\r\s]{2,})/)[0];
      const colour = root.querySelector('[itemprop=color]').text;
      await page.getByRole('button', { name: 'Remove from favourites' }).click();
      async function listMajors(auth) {
        const sheets = google.sheets({ version: 'v4', auth });
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          valueInputOption: 'USER_ENTERED',
          range: 'Scraped_Vinted!A1:A1',
          requestBody: {
            values: [
              [product_name, price, brand, size_formatted,condition_formatted, colour]
            ]
          }
        });
      }
      authorize().then(listMajors).catch(console.error)
    }

    await context.close();
    await browser.close();
  })
  response.send('OK');
}
catch(err) {
  console.log("Error");
}
});
  // Send a response to acknowledge that you're done with the request

app.listen(PORT, () => console.log(`App running on port ${PORT}`));