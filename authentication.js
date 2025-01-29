

const jwt = require('jsonwebtoken');


function createToken(data){
    const SECRET = "your_secret_key";

    const payload = {
        userData : data,
    }

    const options = {
        expiresIn: "3h",
    }

    const token = jwt.sign(payload, SECRET, options)

    console.log(token);

    return token
}


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

module.exports = {createToken}

