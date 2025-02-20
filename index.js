const { connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, addStadium, getStadiumInfo, addFacilityList, addStadiumFacility, getData } = require('./database');
const { createToken, decodeToken, authenticateToken } = require('./authentication');
const { getCountryData, getStates } = require('./getData');
const { upload, saveStadiumPhotos } = require('./image');

const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

const port = 3000;
const ip = '0.0.0.0';

// Connect to Database
try {
    connectDatabase();
} catch (err) {
    console.error('Error connecting: ' + err.stack);
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/login', async (req, res) => {
    let { email, username, password } = req.body;
    console.log("Email ", email, "\n", "Username ", username, "\n", "Password ", password, "\n");

    if (!email) {
        if (await checkDuplicate(username, "username", "user")) {
            if (await login(username, "username", password)) {
                const data = await getUserInfo(username, "username");
                const token = createToken(data);
                return res.status(200).json({
                    "status": true,
                    "message": "Logged in Successfully",
                    "token": token,
                });
            } else {
                return res.status(401).json({ "status": false, "message": "Incorrect Password" });
            }
        } else {
            return res.status(401).json({ "status": false, "message": "Username doesn't exist." });
        }
    } else {
        if (await checkDuplicate(email, "email", "user")) {
            if (await login(email, "email", password)) {
                const data = await getUserInfo(email, "email");
                const token = createToken(data);
                return res.status(200).json({
                    "status": true,
                    "message": "Logged in Successfully",
                    "token": token,
                });
            } else {
                return res.status(401).json({ "status": false, "message": "Incorrect Password" });
            }
        } else {
            return res.status(401).json({ "status": false, "message": "Email doesn't exist." });
        }
    }
});

app.post('/signup', async (req, res) => {
    let { username, email, password, user_type, points } = req.body;

    if (username) {
        if (!(await checkDuplicate(email, "email", "user")) && !(await checkDuplicate(username, "username", "user"))) {
            await insertNewUser(username, email, password, user_type, points);
            const data = await getUserInfo(email, "email");
            const token = createToken(data);
            return res.status(201).json({ "success": true, "message": "User successfully created", "token": token });
        } else {
            return res.status(400).json({ "success": false, "message": "Email or Username already exists" });
        }
    } else {
        if (!(await checkDuplicate(email, "email", "user"))) {
            await insertNewUser(username, email, password, user_type, points);
            const data = await getUserInfo(email, "email");
            const token = createToken(data);
            return res.status(201).json({ "success": true, "message": "User successfully created", "token": token });
        } else {
            return res.status(400).json({ "success": false, "message": "Email already exists" });
        }
    }
});

// Get user points by user ID
app.get('/user/points/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const userInfo = await getUserInfo(userId, "id");
        if (userInfo) {
            return res.json({ points: userInfo.points });
        } else {
            return res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error fetching user points:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.listen(port, ip, () => {
    console.log(`Example app listening at http://${ip}:${port}`);
});
