



const { connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, addStadium, getStadiumInfo, addFacilityList,
    addStadiumFacility, getData, addCourtType, getCourtType, addCourt, addStadiumCourtType, getStadiumWithTwoColumns,
    getStadiumPhoto , getExchange_point ,sentVoucherAmount , insertNotification,getpoint,getStadiumSortedByDistance,changePassword,checkReservationDuplicate,getCourtReservation,getStadiumData,getStadiumCourtsData,addReservation,getFacilitiesByStadium,getReservationsByUserId,getReviewsByStadiumId ,addReview,updateUserPoint,deposit,deleteExchangePoint} = require('./database')
const {createToken, decodeToken, authenticateToken} = require('./authentication')
const {getCountryData, getStates} = require('./getData')
const {upload, saveStadiumPhotos} = require('./image')

const fs = require('fs');
const path = require('path');

const express = require('express')
const app = express()

const cors = require('cors');
const bodyParser = require('body-parser');
const { error } = require('console');
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
    // console.log(userData);

    const stadiumDatas = await getStadiumWithTwoColumns("owner_id", userData.userData.id, "verify", "verified");
    const stadiumPhoto = await getStadiumPhoto("stadium_id", stadiumDatas.id);

    // for(const stadium of stadiumDatas) {
    //     const stadiumPhoto = await getStadiumPhoto("stadium_id", stadium.id);
    //
    //     stadium.photos = await Promise.all(stadiumPhotos.map(async (photo) => {
    //         const imagePath = path.join(__dirname, photo.path);
    //         const imageBuffer = fs.readFileSync(imagePath);
    //         return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    //     }));
    // }

    // console.log(stadiumDatas)
    if(stadiumDatas !== null){
        return res.status(200).json({
            "status" : true,
            "message" : "Successfully",
            "data" : stadiumDatas
        })
    }else{
        return res.status(400).json({
            "status" : false,
            "message" : "Error during getStadium"
        })
    }
})

app.get("/getStadiumForVerify", authenticateToken, async (req, res) => {
    const userData = decodeToken(req.headers.authorization.split(" ")[1]);

    const stadiumDatas = await getStadiumInfo("not verify", "verify", "stadium");

    if(stadiumDatas !== null){
        return res.status(200).json({
            "status" : true,
            "message" : "Verifying Stadium",
            "data" : stadiumDatas
        })
    }else{
        return res.status(400).json({
            "status" : false,
            "message" : "Error during getStadium"
        })
    }

})

app.post("/notifications", async (req, res) => {
    const { user_id, notification } = req.body;

    if (!user_id || !notification) {
        return res.status(400).json({ error: "Missing user_id or notification" });
    }

    try {
        const result = await insertNotification(user_id, notification);
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

app.get('/exchange_point', async (req, res) => {
    try {
        const searchTerm = req.query.search || "";
        const exchange_point = await getExchange_point(searchTerm);
        res.json(exchange_point);
    } catch (error) {
        console.error("Error fetching exchange_point:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.put("/update_exchange_point", async (req, res) => {
    const { user_id, new_point } = req.body;

    if (!user_id || new_point === undefined) {
        return res.status(400).json({ error: "Missing user_id or new_point" });
    }

    try {
        const result = await updateExchangePoint(user_id, new_point);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to update exchange point" });
    }
});

app.delete("/delete_exchange_point", async (req, res) => {
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





app.put('/topup', async (req, res) => {
    const { user_id, amount } = req.body;

    if (!user_id || isNaN(amount)) {
        return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const result = await updateUserPoint(user_id, amount);
    res.json(result);
});



app.get("/point", authenticateToken, async (req, res) => {
    const user = decodeToken(req.headers.authorization.split(" ")[1]);
    const id= user.userData.id;
  //  console.log("print : ",user)
   // console.log("print : ",id)
     const result = await getpoint(id);
     return res.json(result);

    console.log("test"); // แสดงใน console ของเซิร์ฟเวอร์
     // ส่งข้อความ "test" ไปยัง Postman
});


app.post('/deposit', authenticateToken, async (req, res) => {
    try {
        const { user_id, amount } = req.body;
        if (!user_id || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const transactionId = await deposit(user_id, amount, "deposit");

        return res.status(201).json({ success: true, message: 'Deposit successful', transaction_id: transactionId });
       
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});







app.get("/testdata", authenticateToken, async (req, res) => {
    const userData = decodeToken(req.headers.authorization.split(" ")[1]);
   
    console.log("test"); // แสดงใน console ของเซิร์ฟเวอร์
    res.send(userData); // ส่งข้อความ "test" ไปยัง Postman
});

app.get("/home", authenticateToken, async (req, res) => {
    // const result = await getStadiumByLocation("verify", "verified")
    const result = await getStadiumSortedByDistance(13.486005,101.0207411, "verify", "verified")

    console.log(result)

    return res.status(200).json({
        "data": result
    })
})

app.get('/reservations', authenticateToken, async (req, res) => {
    try {
      const user = decodeToken(req.headers.authorization.split(" ")[1]);
      const id = user.userData.id;
  
      // เรียกใช้ฟังก์ชัน getReservationsByUserId ด้วย async/await
      const reservations = await getReservationsByUserId(id);
  
      // ถ้าพบการจอง
      if (reservations.length > 0) {
        res.json(reservations);
      } else {
        res.status(404).send('ไม่พบการจองสำหรับผู้ใช้ที่ระบุ');
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
      res.status(500).send('เกิดข้อผิดพลาดในการเรียกใช้แบบสอบถาม');
    }
  });
  


  app.post('/add_review', authenticateToken,async (req, res) => {
    const user = decodeToken(req.headers.authorization.split(" ")[1]);
    const id = user.userData.id;
    const { stadium_id, rating, comment, date } = req.body;
  
    try {
      const result = await addReview(stadium_id, id, rating, comment, date);
      const newReview = {
        review_id: result.insertId,
        stadium_id: stadium_id,
        user_id: id,
        rating: rating,
        comment: comment,
        date: date
      };
  
      res.status(200).json({
        message: 'Review added successfully!',
        review: newReview
      });
    } catch (err) {
      res.status(500).json({
        message: 'Failed to add review',
        error: err.message,
      });
    }
  });

  



  app.get('/reviews/:stadium_id', async (req, res) => {
    const { stadium_id } = req.params;

    try {
        // เรียกใช้ฟังก์ชัน getReviewsByStadiumId เพื่อดึงข้อมูลรีวิว
        const reviews = await getReviewsByStadiumId(stadium_id);

        if (reviews.length > 0) {
            res.status(200).json({
                message: 'Reviews fetched successfully!',
                data: reviews,
            });
        } else {
            res.status(404).json({
                message: 'No reviews found for this stadium.',
            });
        }
    } catch (error) {
        res.status(500).json({
            message: 'Error occurred while fetching reviews.',
            error: error.message,
        });
    }
});

  
app.get('/stadium/:stadium_id/facilities', async (req, res) => {
    const { stadium_id } = req.params;

    try {
        // เรียกใช้ฟังก์ชัน getFacilitiesByStadium เพื่อดึงข้อมูลสิ่งอำนวยความสะดวก
        const facilities = await getFacilitiesByStadium(stadium_id);

        if (facilities.length > 0) {
            res.status(200).json({
                message: 'Facilities fetched successfully!',
                data: facilities,
            });
        } else {
            res.status(404).json({
                message: 'No facilities found for this stadium.',
            });
        }
    } catch (error) {
        res.status(500).json({
            message: 'Error occurred while fetching facilities.',
            error: error.message,
        });
    }
});




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











app.put("/change_password", authenticateToken, async (req, res) => {
    try {
        // ตรวจสอบว่า req.body ไม่เป็น undefined
        if (!req.body) {
            return res.status(400).json({ message: "Invalid request body." });
        }

        const { oldPassword, newPassword } = req.body;
        const user = decodeToken(req.headers.authorization.split(" ")[1]);

        // ตรวจสอบว่ามี userData หรือไม่
        if (!user || !user.userData || !user.userData.id) {
            return res.status(400).json({ message: "Invalid user data." });
        }

        const id = user.userData.id;

        // เรียกใช้ changePassword และรอผลลัพธ์
        const result = await changePassword(id, oldPassword, newPassword);

        // ตรวจสอบว่า result สำเร็จหรือไม่
        if (result.success) {
            return res.status(200).json({
                message: "Password changed successfully!",
            });
        } else {
            return res.status(400).json({
                message: "Failed to change password.",
                error: result.error,
            });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            message: "Error.",
            error: error.message,
        });
    }
});















app.listen(port,ip, () => { // Specifying the IP address to bind to
    console.log(`Example app listening at http://${ip}:${port}`)
});

//20.2.250.248
