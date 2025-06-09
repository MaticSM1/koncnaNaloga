const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    login2f: {
        type: Boolean,
    },
    phoneId: {
        type: String,
        sparse: true
    },
    products: [{
        type: String,
        ref: 'Product'
    }],
    shopIteams: [{
        type: String,
        ref: 'shopIteam'
    }]
});

module.exports = mongoose.model('User', UserSchema);