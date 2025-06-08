const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ProductSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        default: () => uuidv4()
    },
    qrcode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        unique: true,
        sparse: true,
        default: () => new Date() 
    },
    price: {
        type: String,
        unique: true,
        sparse: true
    }
});