import express from 'express';

const PORT = process.env.PORT || 8080;
const app = express();

app.get('/', (request, response) => {

  // 1. Get values from the web using Playwright
  // Imagine the code here

  // 2. Add the values to Google Sheets using the Sheets API
  // Imagine the code here

  // Send a response to acknowledge that you're done with the request
  response.send('OK');

});

app.listen(PORT, () => console.log(`App running on port ${PORT}`));