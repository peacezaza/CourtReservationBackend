



const { connectDatabase, checkDuplicate, insertNewUser } = require('./database')

const express = require('express')
const app = express()

const cors = require('cors');
const bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());

const port = 3000

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

app.post('/login', (req, res) => {
    email = req.body.email;
    password = req.body.password;
    console.log(email, password);
})

app.post('/signup',  async (req, res) => {
    username = req.body.username;
    email = req.body.email;
    password = req.body.password;
    user_type = req.body.user_type


    console.log("Email: ", email, "\n","Username ", username, "\n", "Password: ", password, "\n", "User_type", user_type,  "\n");
    // console.log(await checkDuplicate(email, "email", "user"))

    if(username !== undefined){
        if (!(await checkDuplicate(email, "email", "user")) && !(await checkDuplicate(username, "username", "user"))) {
            console.log(await insertNewUser(username, email, password, user_type));
            return res.status(201).json({
                "success": true,
                "message": "User successfully created",
            })
        }
        else{
            console.log("Duplicated Email or username \n");
            return res.status(400).json({
                "success": false,
                "message": "Email or username already exists",
            })
        }

    }else{
        if (!(await checkDuplicate(email, "email", "user"))) {
            console.log(await insertNewUser(username, email, password, user_type));
            console.log("Inserted Success")
            return res.status(201).json({
                "success": true,
                "message": "User successfully created",
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



    // if (!(await checkDuplicate(email, "email", "user"))) {
    //     console.log(await insertNewUser(username, email, password, user_type));
    // }else{
    //     console.log("Duplicated Email")
    // }




})


app.listen(port,'0.0.0.0', () => { // Specifying the IP address to bind to
    console.log(`Example app listening at http://localhost:${port}`)
});

//20.2.250.248