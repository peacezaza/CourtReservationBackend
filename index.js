



const { connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, addStadium, getStadiumInfo, addFacilityList,
    addStadiumFacility, getData, addCourtType, getCourtType, addCourt, addStadiumCourtType} = require('./database')
const {createToken, decodeToken, authenticateToken} = require('./authentication')
const {getCountryData, getStates} = require('./getData')
const {upload, saveStadiumPhotos} = require('./image')


const express = require('express')
const app = express()

const cors = require('cors');
const bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

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
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    let user_type = req.body.user_type;
    let points = req.body.points;


    console.log("Email: ", email, "\n","Username ", username, "\n", "Password: ", password, "\n", "User_type", user_type,  "\n");
    // console.log(await checkDuplicate(email, "email", "user"))

    if(username !== undefined){
        if (!(await checkDuplicate(email, "email", "user")) && !(await checkDuplicate(username, "username", "user"))) {
            // console.log(await insertNewUser(username, email, password, user_type,points));
            await insertNewUser(username, email, password, user_type,points)
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
            // console.log(await insertNewUser(username, email, password, user_type, points));
            await insertNewUser(username, email, password, user_type, points)
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


app.post('/addStadium', authenticateToken, async (req,res) =>{

    try{
        upload.array("files")(req, res, async (err) => {
            // console.log(req.files)

            console.log(req.body)

            const name = req.body.stadium
            const phone_number = req.body.phone;
            const location = req.body.country.concat("," ,req.body.province ,",", req.body.district ,",", req.body.subDistrict, ",", req.body.zipCode)
            const open_hour = (req.body.openHour);
            const close_hour = (req.body.closeHour);
            const link = req.body.addressLink
            const availability = true;
            const userData = decodeToken(req.headers.authorization.split(" ")[1])
            const ownerId = userData.userData.id

            // console.log(location);

            if(!await checkDuplicate(location, "location", "stadium")){
                const id = await addStadium(name, phone_number, location, open_hour, close_hour, link, availability, ownerId)
                if(id.insertId !== null){
                    const stadiumData = await getStadiumInfo(id.insertId, "id", "stadium")
                    await saveStadiumPhotos(id.insertId, req.files)

                    const facilities = req.body.selectedFacilities.split(",")

                    // For insert facility type into facility table
                    for(const facility of facilities){
                        if(!await checkDuplicate(facility, "name", "facility")){
                            const result = await addFacilityList(facility)
                            // console.log(result)
                        }else{
                            console.log("Duplicated Facility Type")
                        }
                    }

                    for(const facility of facilities){
                        const facilityDetails = await getData("name", facility)
                        if(facilityDetails !== null){
                            if(await addStadiumFacility(id.insertId, facilityDetails[0].id) !== null){
                                console.log("Inserted Stadium Facility Successfully\n")
                            }
                            else{
                                console.log("Error during inserting Stadium Facility")
                            }
                        }
                    }


                    // Inserting court_type
                    const courtTypesData = req.body.selectedTypes;
                    const courtTypes = JSON.parse(courtTypesData);
                    for(const type of courtTypes){
                        if(!await checkDuplicate(type, "type", "court_type")){
                            const result = await addCourtType(type);
                            // console.log(result)
                            if(result.affectedRows >0){
                                console.log("Inserted Court Type Success\n")
                            }else{
                                console.log("Duplicated Court Type\n")
                            }
                        }else{
                            console.log("Duplicated Court Type\n")
                        }
                    }

                //     Insert Court
                    const courtDetails = JSON.parse(req.body.typeDetails);

                    for(const type in courtDetails){
                        const courtTypeData = await getCourtType("type", type)
                        let data = []
                        if(courtTypeData !== null){
                            for(const court in courtDetails[type]){
                                data.push(courtDetails[type][court])
                            }
                            const totalCourt = parseInt(data[0]);
                            const price = parseInt(data[1])

                            console.log(typeof totalCourt)
                            console.log(typeof price)
                            console.log(courtTypeData[0].id)

                            const stadiumCourtTypeInsert = await addStadiumCourtType(id.insertId, courtTypeData[0].id, totalCourt, price)
                            if(stadiumCourtTypeInsert !== null){
                                console.log("Inserted Stadium Court Type")
                            }else{
                                console.log("Error during Inserting Stadium Court Type")
                            }
                            //Insert Court
                            for(let i = 0; i < totalCourt; i++){
                                const result = await addCourt(id.insertId, courtTypeData[0].id, "available")
                                if(result !== null){
                                    console.log("Success added Court")
                                }
                            }
                        }else{
                            console.log("Court Type doesn't exits")
                        }
                    }



                }else{
                    return res.status(400).json({
                        "status":false,
                        "message":"error during insert stadium"
                    })
                }

            }
            else{
                console.log("Duplicated Stadium")
                return res.status(400).json({
                    "status" : false,
                    "message" : "Stadium already exists"
                })
            }



        });


    }catch(error){
        console.log(error);
    }
})

app.listen(port,ip, () => { // Specifying the IP address to bind to
    console.log(`Example app listening at http://${ip}:${port}`)
});

//20.2.250.248
