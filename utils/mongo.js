const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
global.client = client;

module.exports = async function mongoConnect() {
    try {
        await client.connect();
        console.log("✅ MongoDB native client povezan");
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ Mongoose povezan");
    } catch (err) {
        console.error("❌ Napaka pri povezavi:", err);
    }
};