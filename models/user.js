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
});

module.exports = mongoose.model('User', UserSchema);