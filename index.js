const express = require('express')
const app = express()

const cors = require('cors');
const bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());

const jwt = require('jsonwebtoken');
const SECRET = "your_secret_key";

const port = 3000

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'Access Denied' });

    jwt.verify(token, SECRET, { expiresIn: '24h' },(err, user) => {
        if (err) {
            console.log("Invaild Token")
            return res.status(403).json({message: 'Invalid Token'});
        }
        console.log("JWT PASSED")
        req.user = user;
        next();
    });
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/login', (req, res) => {
    username = req.body.username;
    password = req.body.password;
    console.log(username, password);
})





app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})