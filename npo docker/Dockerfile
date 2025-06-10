FROM node:20

RUN apt-get update && apt-get install -y python3 python3-pip && apt-get clean

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 1883

CMD ["node", "mqtt.js"]
