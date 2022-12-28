FROM mcr.microsoft.com/playwright:v1.29.0-focal
WORKDIR /usr/src/app
COPY package.json package*.json ./
ENV PLAYWRIGHT_BROWSERS_PATH=0
RUN npm ci
COPY . .
CMD ["node", "app.js"]