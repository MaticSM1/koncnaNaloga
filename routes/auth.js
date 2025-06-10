const User = require('../models/user');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ message: 'Uporabniško ime in geslo sta obvezna' });

    const existing = await User.findOne({ username });
    if (existing)
        return res.status(409).json({ message: 'Uporabniško ime že obstaja' });

    const hash = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hash, login2f: false });
    await newUser.save();

    req.session.email = username;
    req.session.login2f = newUser.login2f;
    req.session.login2fPotrditev = false;

    res.status(201).json({ message: 'Uspešna registracija' });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ message: 'Napačni podatki' });

    req.session.email = username;
    req.session.login2f = user.login2f;
    req.session.login2fPotrditev = false;
    res.json({ message: 'Prijava uspešna' });
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Napaka pri odjavi');
        res.redirect('/');
    });
};

exports.enable2FA = async (req, res) => {
    if (!req.session.email) return res.status(401).json({ message: 'Niste prijavljeni' });
    const db = global.client.db('users');
    const user = await db.collection('users').findOne({ email: req.session.email });
    if (!user?.phoneId)
        return res.status(400).json({ message: 'UUID manjkajoč' });

    await db.collection('users').updateOne({ email: req.session.email }, { $set: { login2f: true } });
    req.session.login2f = true;
    res.json({ message: '2FA omogočen' });
};

exports.disable2FA = async (req, res) => {
    if (!req.session.email) return res.status(401).json({ message: 'Niste prijavljeni' });

    const db = global.client.db('users');
    await db.collection('users').updateOne({ email: req.session.email }, { $set: { login2f: false } });
    req.session.login2f = false;
    res.json({ message: '2FA izklopljen' });
};
