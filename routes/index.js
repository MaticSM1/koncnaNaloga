const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    if (req.session.email) {
        if (req.session.login2f && !req.session.login2fPotrditev) {
            return res.sendFile(__dirname + '/../sites/potrditev.html');
        }
        return res.render('portal');
    }
    res.render('main');
});

router.get('/ping', (req, res) => {
    res.send('Pong!');
});

router.get('/zemljevid', (req, res) => {
    res.render('zemljevid');
});

router.get('/seznam', (req, res) => {
    res.render('seznam');
});

module.exports = router;