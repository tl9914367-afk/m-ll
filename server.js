const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Wichtig für Render: Nutzt den Port, den Render vorgibt!

app.use(bodyParser.json());
app.use(express.static(__dirname));

// WICHTIG: Explizite Weiterleitung für die Startseite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(session({
    secret: 'tbr-rem-secure-secret-key-1985',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

if (!fs.existsSync('./database.json')) {
    const initialData = {
        users: [
            { id: 1, username: "Christian", pass: "123", name: "Christian", role: "office", protected: true },
            { id: 2, username: "fahrer1", pass: "123", name: "Klaus Müller", role: "driver" },
            { id: 3, username: "fahrer2", pass: "123", name: "Stefan Weber", role: "driver" }
        ],
        bins: [
            { id: 1, code: "PB-RS-001", lat: 51.1805, lng: 7.1882, vol: 50, zustand: "Gut / Intakt", adr: "Alleestraße 54", geleertHeute: false, gesammelt: 0 }
        ],
        tours: []
    };
    fs.writeFileSync('./database.json', JSON.stringify(initialData, null, 2));
}

const getDB = () => JSON.parse(fs.readFileSync('./database.json'));
const saveDB = (data) => fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = getDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.pass === password);
    if (user) {
        req.session.user = user;
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: 'Ungültig' });
    }
});

app.get('/api/session', (req, res) => {
    if (req.session.user) res.json({ loggedIn: true, user: req.session.user });
    else res.status(401).json({ loggedIn: false });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/data', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Nicht autorisiert' });
    res.json(getDB());
});

app.post('/api/data', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Nicht autorisiert' });
    let incomingData = req.body;
    let currentDb = getDB();
    
    let protectedUser = currentDb.users.find(u => u.username.toLowerCase() === 'christian' || u.protected);
    if (protectedUser) {
        let exists = incomingData.users.some(u => u.username.toLowerCase() === 'christian' || u.protected);
        if (!exists) {
            incomingData.users.push(protectedUser);
        }
    }

    saveDB(incomingData);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});