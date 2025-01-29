



const { connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo} = require('./database')
const {createToken} = require('./authentication')

const express = require('express')
const app = express()

const cors = require('cors');
const bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());

const port = 3000
const ip = '0.0.0.0'

// Connect to Database

try{
    connectDatabase();
}
catch (err){
    console.error('error connecting: ' + err.stack);
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/login', async (req, res) => {


    email = req.body.email;
    username = req.body.username;
    password = req.body.password;


    console.log("Email ", email, "\n", "Username ", username, "\n", "Password ", password, "\n");

    if(email === undefined){
        if(await checkDuplicate(username, "username", "user")){
            if(await login(username, "username", password)){
                const data = await getUserInfo(username, "username")
                const token = createToken(data);
                return res.status(200).json({
                    "status": true,
                    "message": "Logged in Successfully",
                    "token" : token,
                })
            }else{
                return res.status(401).json({
                    "status" : false,
                    "message" : "Incorrect Password"
                })
            }
        }
        else{
            console.log("Username doesn't exists.")
            return res.status(401).json({
                "status": false,
                "message": "Username doesn't exists."
            })
        }
    }
    else if(username === undefined){
        console.log("TAP")
        if(await checkDuplicate(email, "email", "user")){
            if(await login(email, "email", password)){
                console.log("Logged in Successfully\n")
                const data = await getUserInfo(email, "email")
                const token = createToken(data);
                return res.status(200).json({
                    "status" : true,
                    "message": "Logged in Successfully",
                    "token": token,
                })
            }else{
                console.log("Incorrect Password\n")
                return res.status(401).json({
                    "status": false,
                    "message" : "Incorrect Password"
                })
            }
        }else{
            return res.status(401).json({
                "status": false,
                "message": "Email doesn't exists."
            })
        }
    }

// Signup Bug when email undefined

})

app.post('/signup',  async (req, res) => {
    username = req.body.username;
    email = req.body.email;
    password = req.body.password;
    user_type = req.body.user_type;


    console.log("Email: ", email, "\n","Username ", username, "\n", "Password: ", password, "\n", "User_type", user_type,  "\n");
    // console.log(await checkDuplicate(email, "email", "user"))

    if(username !== undefined){
        if (!(await checkDuplicate(email, "email", "user")) && !(await checkDuplicate(username, "username", "user"))) {
            console.log(await insertNewUser(username, email, password, user_type));
            const data = await getUserInfo(email, "email")
            const token = createToken(data);
            return res.status(201).json({
                "success": true,
                "message": "User successfully created",
                "token": token
            })
        }
        else if(await checkDuplicate(email, "email", "user") && await checkDuplicate(username, "username", "user")){
            console.log("Duplicated Email and User\n");
            return res.status(400).json({
                "success": false,
                "message": "Email and user already exists",
            })
        }
        else if((await checkDuplicate(email, "email", "user"))){
            console.log("Duplicated Email\n");
            return res.status(400).json({
                "success": false,
                "message": "Email already exists",
            })
        }
        else if((await checkDuplicate(username, "username", "user"))){
            console.log("Duplicated Username\n");
            return res.status(400).json({
                "success": false,
                "message": "Username already exists",
            })
        }

    }else{
        if (!(await checkDuplicate(email, "email", "user"))) {
            console.log(await insertNewUser(username, email, password, user_type));
            console.log("Inserted Success")
            const data = await getUserInfo(email, "email")
            const token = createToken(data);
            return res.status(201).json({
                "success": true,
                "message": "User successfully created",
                "token" : token
            })
        }
        else{
            console.log("Duplicated Email \n");
            return res.status(400).json({
                "success": false,
                "message": "Email already exists",
            })
        }
    }
})


app.listen(port,ip, () => { // Specifying the IP address to bind to
    console.log(`Example app listening at http://${ip}:${port}`)
});

//20.2.250.248