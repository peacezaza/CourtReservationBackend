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
    email = req.body.email;
    password = req.body.password;
    console.log(email, password);
})

app.post('/signup', (req, res) => {
    email = req.body.email;
    password = req.body.password;
    confirmPassword = req.body.confirmPassword;

    console.log("Email: ", email, "\n", "Password: ", password, "\n", "Confirm Password: ", confirmPassword, "\n");

})





app.listen(port, () => { // Specifying the IP address to bind to
    console.log(`Example app listening at http://localhost:${port}`)
});

//20.2.250.248