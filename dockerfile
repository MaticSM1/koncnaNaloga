FROM node:20

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip && \
    apt-get clean

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN pip3 install torch torchvision
RUN pip3 install numpy opencv-python pandas matplotlib

COPY . .

EXPOSE 3000

CMD ["node", "wisfiApp.js"]