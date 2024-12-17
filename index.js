const express = require('express')
const app = express()

const cors = require('cors');
const bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());

const port = 3000

app.get('/login', (req, res) => {
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