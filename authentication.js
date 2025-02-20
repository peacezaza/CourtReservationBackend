

const jwt = require('jsonwebtoken');

const SECRET = "your_secret_key";

function createToken(data){

    const payload = {
        userData : data,
    }

    const options = {
        expiresIn: "24h",
    }

    const token = jwt.sign(payload, SECRET, options)

    console.log(token);

    return token
}


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]

    console.log(token)

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

function decodeToken(token){
    const decodedToken = jwt.decode(token)

    return decodedToken;
}

module.exports = {createToken, decodeToken, authenticateToken}

