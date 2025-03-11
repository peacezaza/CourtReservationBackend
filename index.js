const { connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, addStadium, getStadiumInfo, addFacilityList,
    addStadiumFacility, getData, addCourtType, getCourtType, addCourt, addStadiumCourtType,
    getExchange_point ,sentVoucherAmount , insertNotification ,deleteExchangePoint ,getTransactions
    , getStadiumWithPictures,addReservation , checkReservationDuplicate, getCourtReservation, getStadiumData,
    updateReservationStatus, getCourt, updateUserdata, updateStadiumdata, getStadiumWithPicturesToVerify,
    getStadiumCourtsData, getStadiumSortedByDistance, getStadiumByLocation, updateCourtStatus
    ,getBookingData, checkOwnerReservation, getTransaction, getOverview,getUtilzation
} = require('./database')
const {createToken, decodeToken, authenticateToken} = require('./authentication')
const {getCountryData, getStates, getWeekPeriod} = require('./getData')
const {upload, saveStadiumPhotos} = require('./image')

const fs = require('fs');
const path = require('path');

const express = require('express')
const app = express()

const cors = require('cors');
const bodyParser = require('body-parser');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
            const verify = 'not verify'
            const rating = 0

            // console.log(location);

            if(!await checkDuplicate(location, "location", "stadium")){
                const id = await addStadium(name, phone_number, location, open_hour, close_hour, link, availability, ownerId, verify, rating)
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
                                // console.log("Inserted Court Type Success\n")
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

                            const stadiumCourtTypeInsert = await addStadiumCourtType(id.insertId, courtTypeData[0].id, totalCourt, price)
                            if(stadiumCourtTypeInsert !== null){
                                // console.log("Inserted Stadium Court Type")
                            }else{
                                console.log("Error during Inserting Stadium Court Type")
                            }
                            //Insert Court
                            for(let i = 0; i < totalCourt; i++){
                                const result = await addCourt(id.insertId, courtTypeData[0].id, "available")
                                if(result !== null){
                                    // console.log("Success added Court")
                                }
                                else{
                                    console.log("Error during adding court")
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

app.get("/getStadiumInfo", authenticateToken, async (req, res) => {
    const userData = decodeToken(req.headers.authorization.split(" ")[1]);

    let stadiumDatas = await getStadiumWithPictures("owner_id", userData.userData.id, "verify", "verified")


    // console.log(stadiumDatas.pictures)

    if(stadiumDatas !== null){
        stadiumDatas = stadiumDatas.map(stadium => ({
            ...stadium,
            pictures: (stadium.pictures.length === 0)
                ? [`${req.protocol}://${req.get('host')}/uploads/imageNotFound.jpg`]  // Default image if empty
                : stadium.pictures.map(pic => `${req.protocol}://${req.get('host')}/${pic.replace(/\\/g, '/')}`)
        }));

        console.log(stadiumDatas)
        return res.status(200).json({
            "status" : true,
            "message" : "Successfully",
            "data" : stadiumDatas
        })
    }
    else{
        return res.status(400).json({
            "status" : false,
            "message" : "Error during getStadium"
        })
    }
})

app.get("/getStadiumForVerify", authenticateToken, async (req, res) => {
    const userData = decodeToken(req.headers.authorization.split(" ")[1]);

    let stadiumDatas = await getStadiumWithPicturesToVerify("verify", "not verify")


    console.log(stadiumDatas)

    if(stadiumDatas !== null){
        stadiumDatas = stadiumDatas.map(stadium => ({
            ...stadium,
            pictures: (stadium.pictures.length === 0)
                ? [`${req.protocol}://${req.get('host')}/uploads/imageNotFound.jpg`]  // Default image if empty
                : stadium.pictures.map(pic => `${req.protocol}://${req.get('host')}/${pic.replace(/\\/g, '/')}`)
        }));

        console.log(stadiumDatas)
        return res.status(200).json({
            "status" : true,
            "message" : "Successfully",
            "data" : stadiumDatas
        })
    }
    else{
        return res.status(400).json({
            "status" : false,
            "message" : "Error during getStadium"
        })
    }
})

app.post("/addNotifications", async (req, res) => {
    const { user_id, notification } = req.body;

    if (!user_id || !notification) {
        return res.status(400).json({ error: "Missing user_id or notification" });
    }

    try {
        const date = new Date().toISOString().split('T')[0]; // วันที่ (YYYY-MM-DD)
        const time = new Date().toLocaleTimeString(); // เวลาปัจจุบัน

        const result = await insertNotification(user_id, date, time, notification);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to insert notification" });
    }
});

//ฟังก์ชันหลัก : Truemoney  ** ห้ามเเก้
app.post('/redeem_voucher', async (req, res) => {
    try {
        const { phone, voucher } = req.body;

        if (!phone || !voucher) {
            return res.status(400).json({ success: false });
        }

        const result = await sentVoucherAmount(phone, voucher);

        return res.status(200).json({
            success: true,
            message: "Voucher redeemed successfully",
            amount: result.amount, // ดึงจำนวนเงินจาก API TrueMoney
        });

    } catch (error) {
        console.error("Error redeeming voucher:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/getExchange_point', async (req, res) => {
    try {
        const searchTerm = req.query.search || "";
        const exchange_point = await getExchange_point(searchTerm);
        res.json(exchange_point);
    } catch (error) {
        console.error("Error fetching exchange_point:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// app.put("/update_exchange_point", async (req, res) => {
//     console.log("Received data:", req.body);

//     const { user_id, new_point } = req.body;

//     if (!user_id || new_point === undefined) {
//         return res.status(400).json({ error: "Missing user_id or new_point" });
//     }

//     try {
//         const result = await updateExchangePoint(user_id, new_point);
//         res.status(result.success ? 200 : 404).json(result);
//     } catch (error) {
//         console.error("🔥 Error updating exchange_point:", error);
//         res.status(500).json({ error: "Failed to update exchange point" });
//     }
// });


app.delete("/deleteExchange_point", async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            console.warn("⚠️ Missing user_id in request");
            return res.status(400).json({ error: "Missing user_id" });
        }

        console.log(`🔍 Received request to delete user_id: ${user_id}`);

        const result = await deleteExchangePoint(user_id);
        if (!result.success) {
            console.warn(`⚠️ Deletion failed: ${result.message}`);
            return res.status(404).json(result);
        }

        console.log(`✅ Successfully deleted user_id: ${user_id}`);
        res.status(200).json(result);
    } catch (error) {
        console.error("🔥 Unexpected Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.get('/getTransactions', async (req, res) => {
    try {
        const searchTerm = req.query.search || "";
        const transactions = await getTransactions(searchTerm);
        res.status(200).json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// @everyone
// ** transaction_type ใน ตาราง transaction

// 'deposit'= ฝากเงิน หรือ เติมเงิน         -> Client
// 'withdrawal' = ถอนเงิน หรือ เเลกเงิน    -> Owner
// 'purchase' = จ่ายค่าจอง               -> Client
// 'sale' = ได้รับค่าจอง                  -> Owner
// 'refund' = ลูกค้ายกเลิกการจอง          -> Client
// 'cancel' = สนามโดนยกเลิก             -> Owner

// ** ฝั่ง Owner กับ Client ต้องส่ง type ตรงตามที่พิมพ์ไว้ เนื่องจาก transaction_type เป็น enum

app.post('/addReservation',authenticateToken, async (req, res) => {
    // console.log(req.body)

    const user_id = decodeToken(req.headers.authorization.split(" ")[1]).userData.id;
    // console.log(user_id)

    const { court_id, stadium_id, date, start_time, end_time, status } = req.body;

    const court_data = await getData("court", "id", court_id)
    // console.log(court_data[0])

    if(court_data !== null){
        if(court_data[0].availability !== "maintenance"){
            if(!await checkReservationDuplicate(court_id, stadium_id, date, start_time, end_time, status)){
                const result = await addReservation(court_id, stadium_id, date, user_id,start_time, end_time, status)
                if(result !== null){
                    return res.status(200).json({
                        "status" : true,
                        "message" : "Successfully",
                    })
                }else
                {
                    return res.status(400).json({
                        "status" : false,
                        "message" : "query error Reservation"
                    })
                }
            }
            else{
                return res.status(400).json({
                    "status" : false,
                    "message" : "Duplicated"
                })
            }
        }else{
            return res.status(400).json({
                "status" : false,
                "message" : "court is maintenance"
            })
        }
    }else{
        return res.status(400).json({
            "status" : false,
            "message" : "Error during get Court"
        })
    }

})

app.get("/getCourtDetails", authenticateToken, async (req, res) => {
    const user_id = decodeToken(req.headers.authorization.split(" ")[1]).userData.id;

    const reservationData = await getCourtReservation(user_id)
    // console.log(reservationData)

    const stadiumData = await getStadiumData(user_id)
    // console.log(stadiumData)

    const stadiumCourtdata = await getStadiumCourtsData(user_id)
    // console.log(stadiumCourtdata)


    return res.status(200).json({
        "reservationData": reservationData,
        "stadiumData": stadiumData,
        "stadiumCourtData" : stadiumCourtdata
    })

})

app.put("/updateCourtStatus", authenticateToken, async (req, res) => {

    const {court_id, status} = req.body;

    // console.log(req.body)

    if(await checkDuplicate(court_id, "id", "court")){
        const updatedCourtStatus = await updateCourtStatus(court_id, status)
        if(updatedCourtStatus !== null){
            console.log(await getData("court", "id", court_id))
            return res.status(200).json({
                "status" : true,
                "message" : "Successfully",
            })
        }else{
            return res.status(400).json({
                "status": false,
                "message" : "failed during updating court status"
            })
        }
    }else{
        return res.status(400).json({
            "status" : false,
            "message" : "court doesn't exit"
        })
    }
})

app.put("/updateReservationStatus", authenticateToken, async (req, res) => {
    const { court_id, date, start_time, end_time, status } = req.body;

    // console.log(await getCourt(court_id, date, start_time, end_time, status))
    // console.log(await updateReservationStatus(court_id, date, start_time, end_time, status))
    console.log(req.body)
    const updateStatusResult = await updateReservationStatus(court_id, date, start_time, end_time, status)
    console.log(updateStatusResult)
    if(updateStatusResult !== null){
        return res.status(200).json({
            "status" : true,
            "message" : "Updated Reservation Status Successfully"
        })
    }
})

app.put("/updateUserdata", authenticateToken, async (req, res) => {
    const user_id = decodeToken(req.headers.authorization.split(" ")[1]).userData.id;
    const { firstName, lastName, phone} = req.body;
    console.log(req.body)



    const newUserData = await updateUserdata(user_id, firstName, lastName, phone)

    console.log(newUserData)

})

app.get("/getUserData", authenticateToken, async (req, res) =>{
    const user_id = decodeToken(req.headers.authorization.split(" ")[1]).userData.id;

    const userdata = await getData("user", "id", user_id)
    console.log(userdata)

    if(userdata !== null){
        const data = {
            "firstName" : userdata[0].first_name,
            "lastName" : userdata[0].last_name,
            "phone" : userdata[0].phone_number,
            "email" : userdata[0].email
        }
        console.log(data)
        return res.status(200).json({
            "status" : true,
            "data" : data
        })
    }
})

app.put("/updateStadiumStatus", authenticateToken, async (req, res) => {

    const {stadium_id, status} = req.body
    console.log(req.body)
    // console.log(stadium_id, status)

    const updatedStadiumStatus = await updateStadiumdata(stadium_id, status)
    console.log(updatedStadiumStatus)
    if(updatedStadiumStatus !== null){
        console.log("Updated Stadium Status Successfully")
        return res.status(200).json({
            "status" : true,
            "message" : "Successfully",
        })
    }else{
        return res.status(400).json({
            "status": false,
            "message" : "failed during updating Stadium"
        })
    }
})


app.get("/getReservationData", authenticateToken, async (req, res) => {
    const user_id = decodeToken(req.headers.authorization.split(" ")[1]).userData.id;

    const bookingData = await getBookingData(user_id)
    // console.log(bookingData)

    return res.status(200).json({
        "status" : true,
        "data" : bookingData
    })
})

app.get("/owner/getTransaction", authenticateToken, async (req, res) => {
    const userData = decodeToken(req.headers.authorization.split(" ")[1]).userData;
    console.log(userData)
    if(userData.user_type === "owner"){
        const transactionData = await getTransaction(userData.id)
        // console.log(transactionData)

        const formattedTransactionData = transactionData.map(transactionData => {
            const dateObj = new Date(transactionData.time)

            return {
                ...transactionData,
                date: dateObj.toLocaleDateString().split("T")[0],
                time: dateObj.toLocaleTimeString()
            }
        })
        if(transactionData){
            return res.status(200).json({
                "status" : true,
                "data" : formattedTransactionData
            })
        }else{
            return res.status(404).json({
                "status": false,
                "message" : "Not Found"
            })
        }

    }
    else{
        return res.status(401).json({
            "status" : false,
            "message" : "Unauthorized user"
        })
    }

})

app.get("/owner/getWeeklyDashboard", async (req, res) => {
    const userData = decodeToken(req.headers.authorization.split(" ")[1]).userData;
    const weekperiod = getWeekPeriod();
    console.log(weekperiod)

    const overview = await getOverview(userData.id, true, weekperiod[0].start, weekperiod[0].end)
    console.log(overview)

    return res.status(200).json({
        "status": true,
    })
})



app.post("/forgot-password", authenticateToken, async (req, res) => {

    console.log(req.body)
})

app.listen(port,ip, () => { // Specifying the IP address to bind to
    console.log(`Example app listening at http://${ip}:${port}`)
});






