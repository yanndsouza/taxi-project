FROM node:18-alpine

COPY taxi-backend/package*.json ./

RUN npm install

COPY taxi-backend/ .

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
