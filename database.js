const { hashPassword, comparePassword } = require('./encryption');
const mysql = require('mysql2/promise');
const twvoucher = require('@fortune-inc/tw-voucher');

let connection;

async function connectDatabase() {
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'court_reservation',
            port: 3306
        });
    } catch (error) {
        console.log("Error while connecting database ", error);
    }
}

async function showtable() {
    const query = "show tables";
    try {
        const [rows] = await connection.query(query);
        console.log("Table list is:", rows);
    } catch (err) {
        console.log(err);
    }
}

async function insertNewUser(username, email, password, user_type, point) {
    try {
        const hashedPassword = await hashPassword(password);
        console.log("Hash in insert: ", hashedPassword);
        const query = "INSERT INTO user (username, email, password, user_type, point) values(?, ?, ?, ?, ?)";
        const [result] = await connection.query(query, [username, email, hashedPassword, user_type, point]);
        console.log('Insert successful, ID:', result.insertId);

        return (result.affectedRows > 0) ? result : null
    } catch (err) {
        console.log(err);
        return null;
    }
}



async function checkDuplicate(data, column, table) {
    try {
        const query = 'SELECT * FROM ?? WHERE ?? = ?';
        const [rows] = await connection.query(query, [table, column, data]);
        return !(rows.length === 0);
    } catch (error) {
        console.error('Error while querying checkDuplication:', error);
    }
}

async function login(data, column, password) {
    try {
        const query = "SELECT PASSWORD FROM user WHERE ?? = ?";
        const [rows] = await connection.query(query, [column, data]);
        return comparePassword(password, rows[0]["PASSWORD"]);
    } catch (error) {
        console.log(error);
    }
}

async function getUserInfo(data, column) {
    const query = "SELECT id, username, email, user_type, point FROM user WHERE ?? = ?";
    try {
        const [rows] = await connection.query(query, [column, data]);
        console.log(rows);
        if (rows.length >= 0) {
            return rows[0];
        } else {
            return null;
        }
    } catch (err) {
        console.log("Error get user info", err);
    }
}


/*--------------------------------- Admin ---------------------------------*/

async function getExchange_point(searchTerm) {
    try {
        let query = `
            SELECT user.username AS owner_name, exchange_point.id, exchange_point.point , exchange_point.date , exchange_point.time , exchange_point.user_id
            FROM exchange_point
            JOIN user ON user.id = exchange_point.user_id
        `;
        let params = [];

        if (searchTerm) {
            query += " WHERE user.username LIKE ? OR exchange_point.id LIKE ? OR user.id LIKE ?";
            params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
        }

        const [rows] = await connection.query(query, params);
        return rows;
    } catch (error) {
        console.error("Error fetching exchange_point:", error);
        return [];
    }
}

async function sentVoucherAmount(phoneNum, voucherLink) {
    try {
        let match = voucherLink.match(/v=([0-9A-Za-z]+)/);
        if (!match) {
            throw new Error("INVALID_VOUCHER_LINK");
        }

        let voucherCode = match[1];
        let redeemed = await twvoucher(phoneNum, voucherCode);

        console.log(`📌 ชื่อเจ้าของ : ${redeemed.owner_full_name}`);
        console.log(`📌 จำนวนเงิน : ${redeemed.amount} บาท`);
        console.log(`📌 โค้ด : ${redeemed.code}`);

        return redeemed;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}

async function insertNotification(user_id, notification) {
    try {
        const query = "INSERT INTO notification (user_id, notification) VALUES (?, ?)";
        const [result] = await connection.query(query, [user_id, notification]);
        console.log('Notification inserted, ID:', result.insertId);
        return { id: result.insertId, user_id, notification };
    } catch (error) {
        console.error("Error inserting notification:", error);
        throw error;
    }
}


async function updateExchangePoint(user_id, new_point) {
    try {
        const query = "UPDATE exchange_point SET point = ? WHERE user_id = ?";
        const [result] = await connection.query(query, [new_point, user_id]);

        if (result.affectedRows > 0) {
            console.log(`Updated points for user_id: ${user_id} to ${new_point}`);
            return { success: true, message: "Point updated successfully" };
        } else {
            return { success: false, message: "User not found or no update needed" };
        }
    } catch (error) {
        console.error("Error updating exchange_point:", error);
        return { success: false, message: "Database error" };
    }
}

async function deleteExchangePoint(user_id) {
    try {
        if (!connection) {
            throw new Error("Database connection is not initialized");
        }

        console.log(`🛠️ Deleting exchange_point for user_id: ${user_id}`); // ตรวจสอบ user_id

        const query = "DELETE FROM exchange_point WHERE user_id = ?";
        const [result] = await connection.query(query, [user_id]);

        if (result.affectedRows) {
            console.log(`✅ Deleted exchange_point for user_id: ${user_id}`);
            return { success: true, message: "Exchange point deleted successfully" };
        } else {
            console.warn(`⚠️ No record found for user_id: ${user_id}`);
            return { success: false, message: "User not found or no record to delete" };
        }
    } catch (error) {
        console.error("🔥 Database Error:", error);
        return { success: false, message: "Database error" };
    }
}

/*--------------------------------- Admin ---------------------------------*/

async function addStadium(name, phone_number, location, open_hour, close_hour, link, availability, owner_id, verify, rating) {
    try {
        const query = "INSERT INTO stadium (name, phone_number, location, open_hour, close_hour, location_link, availability, owner_id, verify, rating) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const [result] = await connection.query(query, [name, phone_number, location, open_hour, close_hour, link, availability, owner_id, verify, rating]);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function getStadiumInfo(data, columns, table) {
    try {
        const query = "SELECT * from ?? WHERE ?? = ?";
        const [rows] = await connection.query(query, [table, columns, data]);
        return (rows.length > 0) ? rows : null;
    } catch (error) {
        console.log(error);
    }
}

async function addStadiumPhoto(stadiumID, filePath) {
    try {
        const query = "INSERT INTO picture (path, stadium_id) values(?, ?)";
        const [result] = await connection.query(query, [filePath, stadiumID]);
    } catch (err) {
        console.log(err);
    }
}

async function addFacilityList(name) {
    try {
        const query = "INSERT INTO facility (name) values(?)";
        const [result] = await connection.query(query, [name]);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function getData(table,column, data) {
    try {
        const query = "SELECT * FROM ?? WHERE ?? = ?";
        const [result] = await connection.query(query, [table, column, data]);
        return (result.length > 0) ? result : null;
    } catch (error) {
        console.log(error);
        return null
    }
}

async function addStadiumFacility(stadiumId, facilityId) {
    try {
        const query = "INSERT INTO stadium_facility (stadium_id, facility_id) values (?, ?)";
        const [result] = await connection.query(query, [stadiumId, facilityId]);
        return (result.affectedRows > 0) ? result : null;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function addCourtType(type) {
    try {
        const query = "INSERT INTO court_type (type) values (?)";
        const [result] = await connection.query(query, [type]);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function getCourtType(columns, typeName) {
    try {
        const query = "select * from court_type where ?? = ?";
        const [result] = await connection.query(query, [columns, typeName]);
        return (result.length > 0) ? result : null;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function addCourt(stadiumId, courtTypeId, courtNumber, availability) {
    try {
        const query = "INSERT INTO court (stadium_id, court_type_id,court_number, availability) values(?, ?, ?, ?)";
        const [result] = await connection.query(query, [stadiumId, courtTypeId, courtNumber,  availability]);
        return (result.affectedRows > 0) ? result : null;
    } catch (error) {
        console.log(error); 
        return null;
    }
}

async function addStadiumCourtType(stadiumId, courtTypeId, numberOfCourts, pricePerHour) {
    try {
        const query = "INSERT INTO stadium_courttype (stadium_id, court_type_id, number_of_courts, price_per_hr) values (?, ?, ?, ?)";
        const [result] = await connection.query(query, [stadiumId, courtTypeId, numberOfCourts, pricePerHour]);
        return (result.affectedRows > 0) ? result : null;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function getStadiumWithTwoColumns(column1, data1, column2, data2) {
    try {
        const query = "SELECT * FROM stadium WHERE ?? = ? AND ?? = ?";
        const [result] = await connection.query(query, [column1, data1, column2, data2]);
        return (result.length > 0) ? result : null;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function getStadiumPhoto(column, data) {
    try {
        const query = "SELECT * FROM picture where ?? = ?";
        const [result] = await connection.query(query, [column, data]);
        return result;
    } catch (error) {
        console.log(error);
        return null;
    }
}



async function updateUserPoint(user_id, amount) {
    try {
        const query = "UPDATE user SET point = point + ? WHERE id = ?";
        const [result] = await connection.query(query, [amount, user_id]);

        if (result.affectedRows > 0) {
            console.log(`Added ${amount} points to user_id: ${user_id}`);
            return { success: true, message: "Point updated successfully" };
        } else {
            return { success: false, message: "User not found or no update needed" };
        }
    } catch (error) {
        console.error("Error updating user points:", error);
        return { success: false, message: "Database error" };
    }
}



async function getpoint(id) {
    try {
        const query = 'SELECT point FROM user WHERE id = ?';
        const [result] = await connection.query(query, [id]);
        return result;
    } catch (error) {
        console.error('Error while get:', error);
    }
}


async function deposit(id, amount, type) {
    try {
        const query = 'INSERT INTO transactions (user_id, point, transaction_type, time) VALUES (?, ?, ?, NOW())';
        const [result] = await connection.query(query, [id, amount, type]);
        return result.insertId; // ส่งค่า insertId กลับไป
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}


async function getStadiumByLocation(column, verify){
    try {
        const query = `
            SELECT s.*, GROUP_CONCAT(p.path) AS pictures
            FROM stadium s
            LEFT JOIN picture p ON s.id = p.stadium_id
            WHERE  s.?? = ?
            GROUP BY s.id`;

        const [result] = await connection.query(query, [column, verify]);

        if (result.length === 0) return null;

        return result.map(stadium => ({
            ...stadium,
            pictures: stadium.pictures ? stadium.pictures.split(",") : []  // Convert to array
        }));
    } catch (error) {
        console.error("Database error:", error);
        return null;
    }
}



function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (angle) => (Math.PI * angle) / 180;

    const R = 6371; // รัศมีของโลกเป็นกิโลเมตร
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // คืนค่าระยะทางเป็นกิโลเมตร
}







async function getStadiumSortedByDistancemobile(currentLatitude, currentLongitude, column, verify) {
    try {
        const query = `
           SELECT s.*, 
       GROUP_CONCAT(DISTINCT p.path) AS pictures,
       GROUP_CONCAT(DISTINCT court_type.type) AS facility_type,
       GROUP_CONCAT(DISTINCT f.name) AS facility_names,
       u.email
FROM stadium s
LEFT JOIN picture p ON s.id = p.stadium_id
LEFT JOIN stadium_courttype ON s.id = stadium_courttype.stadium_id
LEFT JOIN court_type ON court_type.id = stadium_courttype.court_type_id
LEFT JOIN stadium_facility sf ON s.id = sf.stadium_id
LEFT JOIN facility f ON sf.facility_id = f.id
LEFT JOIN user u ON s.owner_id = u.id
WHERE s.?? = ?
GROUP BY s.id, u.email;
`;

        const [stadiums] = await connection.query(query, [column, verify]);

        if (stadiums.length === 0) return null;

        const processedStadiums = stadiums.map(stadium => {
            const [latitude, longitude] = stadium.location_link.split(",").map(Number);

            const distance = haversineDistance(currentLatitude, currentLongitude, latitude, longitude);

            return {
                ...stadium,
                pictures: stadium.pictures ? stadium.pictures.split(",") : [],
                distance: distance.toFixed(2) // Show 2 decimal places
            };
        });

        processedStadiums.sort((a, b) => a.distance - b.distance);

        return processedStadiums;
    } catch (error) {
        console.error("Database error:", error);
        return null;
    }
}

async function getReservationsByUserId(userId) {
    const query = `
  SELECT reservation.*, 
       stadium.name AS stadium_name,
       court.id AS court_id,
       court.court_number,
       court_type.type AS Type,
       stadium_courttype.price_per_hr AS price,
       GROUP_CONCAT(DISTINCT picture.path) AS pictures  -- รวม path ของรูปภาพ
FROM reservation
JOIN stadium ON reservation.stadium_id = stadium.id
JOIN court ON reservation.court_id = court.id
JOIN court_type ON court.court_type_id = court_type.id
JOIN stadium_courttype 
    ON stadium_courttype.stadium_id = reservation.stadium_id 
    AND stadium_courttype.court_type_id = court_type.id
LEFT JOIN picture ON picture.stadium_id = stadium.id  -- เชื่อมกับรูปภาพของสนาม
WHERE reservation.user_id = ?
GROUP BY reservation.id, stadium.id, court.id, court_type.id, stadium_courttype.price_per_hr;

    `;
    
    try {
      // ใช้ await กับ query เพื่อให้ได้ผลลัพธ์จากฐานข้อมูล
      const [result] = await connection.query(query, [userId]);
      
      // ถ้าไม่พบผลลัพธ์
      if (result.length === 0) {
        console.log(`ไม่พบการจองสำหรับผู้ใช้ที่มี ID: ${userId}`);
        return [];
      }
  
      return result;  // คืนค่าผลลัพธ์การจอง
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการจอง:', error);
      throw error;  // ขว้างข้อผิดพลาดออกไปเพื่อให้ฟังก์ชันที่เรียกใช้สามารถจัดการ
    }
  }
  

  async function addReview(stadium_id, user_id, rating, comment, date) {
    try {
        const query = `
        INSERT INTO review (stadium_id, user_id, rating, comment, date)
        VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [stadium_id, user_id, rating, comment, date]);
        return result;
    } catch (error) {
        console.error('Error adding review:', error);
        throw error;
    }
}


async function getCurrentRating(stadium_id) {
    try {
        const query = `
        SELECT rating
        FROM stadium
        WHERE id = ?;
        `;
        const [result] = await connection.query(query, [stadium_id]);
        return result[0];  // คืนค่า rating จาก stadium
    } catch (error) {
        console.error('Error fetching current rating:', error);
        throw error;
    }
}


// อัปเดตค่าเฉลี่ย rating ใน stadium
async function updateStadiumRating(stadium_id, avg_rating) {
    try {
        const query = `
        UPDATE stadium
        SET rating = ?
        WHERE id = ?;
        `;
        await connection.query(query, [avg_rating, stadium_id]);
    } catch (error) {
        console.error('Error updating stadium rating:', error);
        throw error;
    }
}

async function getAverageRating(stadium_id) {
    try {
        const query = `
        SELECT ROUND(AVG(rating), 1) AS avg_rating
        FROM review
        WHERE stadium_id = ? AND rating IS NOT NULL;
        `;
        const [result] = await connection.query(query, [stadium_id]);
        return { avg_rating: result[0].avg_rating };
    } catch (error) {
        console.error('Error calculating average rating:', error);
        throw error;
    }
}


    

  

  async function getReviewsByStadiumId(stadium_id) {
    try {
        const query = `
            SELECT review.id, review.stadium_id, review.user_id, review.rating,   review.comment,  review.date,  user.username 
            FROM review JOIN user ON review.user_id = user.id WHERE review.stadium_id = ? `;
        const [reviews] = await connection.execute(query, [stadium_id]);
        return reviews;
    } catch (error) {
        console.error('Error fetching reviews:', error);
        throw error;
    }
}


async function getFacilitiesByStadium(stadium_id) {
    try {
        const query = `
            SELECT f.id AS facility_id, f.name, sf.stadium_id
            FROM facility f
            JOIN stadium_facility sf ON f.id = sf.facility_id
            WHERE sf.stadium_id = ?
        `;
        const [facilities] = await connection.execute(query, [stadium_id]);
        return facilities;
    } catch (error) {
        console.error('Error fetching facilities:', error);
        throw error;
    }
}

async function changePassword(id, oldPassword, newPassword) {
    if (!id || !oldPassword || !newPassword) {
        return { success: false, error: "Missing required fields" };
    }

    try {
        // ดึงรหัสผ่านเก่าจากฐานข้อมูล
        const [rows] = await connection.query("SELECT password FROM user WHERE id = ?", [id]);

        if (rows.length === 0) {
            return { success: false, error: "User not found" };
        }

        const hashedOldPassword = rows[0].password;

        // ตรวจสอบว่ารหัสผ่านเก่าตรงกันหรือไม่
        const isMatch = await comparePassword(oldPassword, hashedOldPassword);
        if (!isMatch) {
            return { success: false, error: "Old password is incorrect" };
        }

        // แฮชรหัสผ่านใหม่
        const hashedNewPassword = await hashPassword(newPassword);

        // อัปเดตรหัสผ่านใหม่ในฐานข้อมูล
        await connection.query("UPDATE user SET password = ? WHERE id = ?", [hashedNewPassword, id]);

        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: "Internal Server Error" };
    }
}



async function updateCourtStatus(court_id, status){

    try{
        const query = `
        UPDATE court
        SET availability = ?
        Where id = ?
        ;`;

        const [ result ] = await connection.query(query, [status, court_id])

        return (result.affectedRows > 0) ? result : null
    }
    catch (error){
        console.log(error)
        return null;
    }
}



async function addReservation(court_id, stadium_id, date, user_id, start_time, end_time, status){

    try{
        const query = "INSERT INTO reservation (court_id, stadium_id, date, user_id, start_time, end_time, status) values (?,?,?,?,?,?,?)"
        const [result] = await connection.query(query, [court_id, stadium_id, date, user_id, start_time, end_time, status])

        return (result.affectedRows > 0) ? result : null;
    }
    catch (error) {
        console.error("Error saving reservation:", error);
        return null;
    }
}


async function checkReservationDuplicate(court_id, stadium_id, date, start_time, end_time, status) {

    try{
        const query = "SELECT * FROM reservation where court_id = ? AND stadium_id = ? AND date = ? AND start_time = ? AND end_time = ? AND status = ?"
        const [result] = await connection.query(query, [court_id, stadium_id, date, start_time, end_time, status])

        return (result.length > 0);
    }
    catch (error) {
        console.error("Error get reservation:", error);
        return null;
    }
}



async function getCourtReservation(user_id){
    try{
        const query = `
    SELECT
        court.id AS court_id,
        stadium.id AS stadium_id,
        stadium.name AS stadium_name,
        court_type.type AS facility_type,
        reservation.date AS reservation_date,
        reservation.start_time AS start_time,
        reservation.end_time AS end_time,
        reservation.status AS reservation_status,
        court.availability AS court_availability
    FROM stadium
    JOIN reservation ON reservation.stadium_id = stadium.id
    JOIN court ON reservation.court_id = court.id
    JOIN court_type ON court.court_type_id = court_type.id
    WHERE stadium.owner_id = ?;
`;


        const [result] = await connection.query(query, [user_id])

        return (result.length > 0) ? result : null;
    }catch (error){
        console.log(error)
        return null;
    }
}

async function getStadiumData(user_id){

    try{
        const query = `
        SELECT
            stadium.id AS id,
            stadium.name AS stadium,
            stadium.open_hour AS openHour,
            stadium.close_hour AS closeHour
            from stadium
            
        WHERE stadium.owner_id = ? AND stadium.verify = "verified"  ;
        `;

        const [result] = await connection.query(query, [user_id])

        return (result.length > 0) ? result : null;

    }catch (error) {
        console.error("Error getStadiumData");
        return null;
    }
}


async function getStadiumCourtsData(user_id){

    try{
        const query = `
        SELECT
            stadium.id AS stadium_id,
            court.id AS court_id,
            stadium.name AS stadium,
            court_type.type AS Facility_Type,
            court.availability AS Status
            from stadium
            JOIN court ON court.stadium_id = stadium.id
            JOIN court_type ON court.court_type_id = court_type.id
            WHERE stadium.owner_id = ? AND stadium.verify = "verified";
        `

        const [result] = await connection.query(query, [user_id])

        return (result.length > 0) ? result : null;
    }catch (error){
        console.log(error);
        return null;
    }
}



async function updateCourtStatus(court_id, status){

    try{
        const query = `
        UPDATE court
        SET availability = ?
        Where id = ?
        ;`;

        const [ result ] = await connection.query(query, [status, court_id])

        return (result.affectedRows > 0) ? result : null
    }
    catch (error){
        console.log(error)
        return null;
    }
}

async function getCourt(court_id, date, start_time, end_time, status){

    try{
        const query = `
        SELECT
        *
        FROM reservation
        WHERE court_id = ? AND date = ? AND start_time = ? AND end_time = ?
        ;`;
        const [ result ] = await connection.query(query, [court_id, date, start_time, end_time]);

        // return (result.affectedRows > 0) ? result : null;
        return result
    }catch (error){
        console.log(error)
        return null;
    }
}







async function getBookingData(userId) {
    try {
        const query = `SELECT
    reservation.id AS id,
    user.first_name AS name,
    user.phone_number AS contact,
    stadium.name AS stadium,
    court_type.type AS facility,
    reservation.status AS status,
    stadium_courttype.price_per_hr AS amount,
    court.court_number AS courtnumber,
    reservation.date AS date,
    reservation.start_time as start_time,
    reservation.end_time as end_time,
    CONCAT(reservation.start_time, ' - ', reservation.end_time) AS time
FROM reservation
JOIN user ON user.id = reservation.user_id
JOIN stadium ON stadium.id = reservation.stadium_id
JOIN court ON court.id = reservation.court_id
JOIN stadium_courttype 
    ON stadium_courttype.stadium_id = reservation.stadium_id
    AND stadium_courttype.court_type_id = court.court_type_id  -- 🔥 Ensure correct mapping!
JOIN court_type ON court_type.id = stadium_courttype.court_type_id
WHERE user.id = ?;
        `;

        const [result] = await connection.query(query, [userId]); // Execute query
        return result.length > 0 ? result : null; // Return data or null if empty
    } catch (error) {
        console.error("Database error:", error);
        return null;
    }
}


async function getStadiumCourtsDataBooking(user_id) {
    try {
        const query = `
        SELECT
            stadium.id AS stadium_id,
            court.id AS court_id,
            stadium.name AS stadium,
            court_type.type AS Facility_Type,
            court.availability AS Status,
            court.court_number  -- เพิ่มคอลัมน์ court_number จากตาราง court
        FROM stadium
        JOIN court ON court.stadium_id = stadium.id
        JOIN court_type ON court.court_type_id = court_type.id
        WHERE stadium.owner_id = ? AND stadium.verify = "verified";
        `;

        const [result] = await connection.query(query, [user_id]);

        return (result.length > 0) ? result : null;
    } catch (error) {
        console.log(error);
        return null;
    }
}


// ฟังก์ชันสำหรับเพิ่มสมาชิกในห้องปาร์ตี้
function addMemberToParty(partyId, username) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE party
        SET current_members = current_members + 1
        WHERE id = ? AND current_members < total_members
      `;
      connection.query(query, [partyId], (err, results) => {
        if (err) return reject(err);
        if (results.affectedRows === 0) return reject(new Error('Party is full or does not exist'));
        resolve(results);
      });
    });
  }
  
  // ฟังก์ชันสำหรับบันทึกสมาชิกในตาราง party_members
  function addPartyMember(partyId, username) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO party_members (party_id, username)
        VALUES (?, ?)
      `;
      connection.query(query, [partyId, username], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }
  
  // ฟังก์ชันสำหรับตรวจสอบว่าห้องปาร์ตี้เต็มหรือไม่
  function checkPartyFull(partyId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT current_members, total_members, price_per_person
        FROM party
        WHERE id = ?
      `;
      connection.query(query, [partyId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  }
  
  // ฟังก์ชันสำหรับหักคะแนนจากผู้ใช้
  function deductPointsFromUsers(partyId, pricePerPerson) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE user
        SET point = point - ?
        WHERE username IN (
          SELECT leader_username FROM party WHERE id = ?
          UNION
          SELECT username FROM party_members WHERE party_id = ?
        )
      `;
      connection.query(query, [pricePerPerson, partyId, partyId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }
  
  // ฟังก์ชันสำหรับอัปเดตสถานะห้องปาร์ตี้เป็น completed
  function updatePartyStatus(partyId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE party
        SET status = 'completed'
        WHERE id = ?
      `;
      connection.query(query, [partyId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }
  
  



  async function createParty(leaderUsername, courtId, totalMembers, pricePerPerson, userId) {
    try {
        // ตรวจสอบคะแนนของผู้สร้างห้องปาร์ตี้
        const [userResults] = await connection.query(`
            SELECT point
            FROM user
            WHERE id = ?
        `, [userId]);

        if (userResults.length === 0) {
            throw new Error('User not found');
        }

        const userPoints = userResults[0].point;

        // ตรวจสอบว่าผู้ใช้มีคะแนนเพียงพอหรือไม่
        if (userPoints < pricePerPerson) {
            throw new Error('Leader does not have enough points to create the party');
        }

        // สร้างห้องปาร์ตี้
        const [partyResults] = await connection.query(`
            INSERT INTO party (leader_username, court_id, total_members, current_members, price_per_person)
            VALUES (?, ?, ?, 1, ?)
        `, [leaderUsername, courtId, totalMembers, pricePerPerson]);

        const partyId = partyResults.insertId;

        // บันทึกผู้สร้างห้องปาร์ตี้เป็นสมาชิกคนแรก
        await connection.query(`
            INSERT INTO party_members (party_id, username)
            VALUES (?, ?)
        `, [partyId, leaderUsername]);

        // หักคะแนนจากผู้สร้างห้องปาร์ตี้
        await connection.query(`
            UPDATE user
            SET point = point - ?
            WHERE id = ?
        `, [pricePerPerson, userId]);

        return partyId;
    } catch (error) {
        console.error("Error in createParty:", error);
        throw error;
    }
}


  function refundPoints(username, points) {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) return reject(err);
  
        const query = `
          UPDATE user
          SET point = point + ?
          WHERE username = ?
        `;
        connection.query(query, [points, username], (err, results) => {
          connection.release();
          if (err) return reject(err);
          resolve(results);
        });
      });
    });
  }


  
  // ฟังก์ชันสำหรับเพิ่มสมาชิกในห้องปาร์ตี้
  function addMemberToParty(partyId, username) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE party
        SET current_members = current_members + 1
        WHERE id = ? AND current_members < total_members
      `;
      connection.query(query, [partyId], (err, results) => {
        if (err) return reject(err);
        if (results.affectedRows === 0) return reject(new Error('Party is full or does not exist'));
        resolve(results);
      });
    });
  }
  
  // ฟังก์ชันสำหรับบันทึกสมาชิกในตาราง party_members
  function addPartyMember(partyId, username) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO party_members (party_id, username)
        VALUES (?, ?)
      `;
      connection.query(query, [partyId, username], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }
  
  // ฟังก์ชันสำหรับตรวจสอบว่าห้องปาร์ตี้เต็มหรือไม่
  function checkPartyFull(partyId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT current_members, total_members, price_per_person
        FROM party
        WHERE id = ?
      `;
      connection.query(query, [partyId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  }
  
  // ฟังก์ชันสำหรับหักคะแนนจากผู้ใช้
  function deductPointsFromUsers(partyId, pricePerPerson) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE user
        SET point = point - ?
        WHERE username IN (
          SELECT leader_username FROM party WHERE id = ?
          UNION
          SELECT username FROM party_members WHERE party_id = ?
        )
      `;
      connection.query(query, [pricePerPerson, partyId, partyId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }
  
  // ฟังก์ชันสำหรับอัปเดตสถานะห้องปาร์ตี้เป็น completed
  function updatePartyStatus(partyId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE party
        SET status = 'completed'
        WHERE id = ?
      `;
      connection.query(query, [partyId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }
  
  // ฟังก์ชันสำหรับตรวจสอบคะแนนของผู้ใช้
  // ฟังก์ชันสำหรับตรวจสอบคะแนนของผู้ใช้
function checkUserPoints(username) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT point
        FROM user
        WHERE username = ?
      `;
      connection.query(query, [username], (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return reject(new Error('User not found'));
        resolve(results[0]);
      });
    });
  }
  
  // ฟังก์ชันสำหรับออกจากห้องปาร์ตี้
  function leaveParty(partyId, username) {
    return new Promise((resolve, reject) => {
      // ลบผู้ใช้ออกจากตาราง party_members
      const removeMemberQuery = `
        DELETE FROM party_members
        WHERE party_id = ? AND username = ?
      `;
      connection.query(removeMemberQuery, [partyId, username], (err, results) => {
        if (err) return reject(err);
        if (results.affectedRows === 0) return reject(new Error('User is not a member of this party'));
  
        // ลดจำนวน current_members ในตาราง party
        const decreaseMembersQuery = `
          UPDATE party
          SET current_members = current_members - 1
          WHERE id = ?
        `;
        connection.query(decreaseMembersQuery, [partyId], (err, results) => {
          if (err) return reject(err);
  
          // คืนคะแนนให้ผู้ใช้
          const getPriceQuery = `
            SELECT price_per_person
            FROM party
            WHERE id = ?
          `;
          connection.query(getPriceQuery, [partyId], (err, results) => {
            if (err) return reject(err);
  
            const pricePerPerson = results[0].price_per_person;
  
            // คืนคะแนนให้ผู้ใช้
            const refundPointsQuery = `
              UPDATE user
              SET point = point + ?
              WHERE username = ?
            `;
            connection.query(refundPointsQuery, [pricePerPerson, username], (err, results) => {
              if (err) return reject(err);
              resolve(results);
            });
          });
        });
      });
    });
  }

  async function joinParty(partyId, username) {
    try {
        // ตรวจสอบว่าห้องปาร์ตี้เต็มหรือไม่
        const [partyResults] = await connection.query(`
            SELECT current_members, total_members, price_per_person
            FROM party
            WHERE id = ?
        `, [partyId]);

        if (partyResults.length === 0) {
            throw new Error('Party not found');
        }

        const { current_members, total_members, price_per_person } = partyResults[0];

        if (current_members >= total_members) {
            throw new Error('Party is full');
        }

        // ตรวจสอบคะแนนของผู้ใช้
        const [userResults] = await connection.query(`
            SELECT point
            FROM user
            WHERE username = ?
        `, [username]);

        if (userResults.length === 0) {
            throw new Error('User not found');
        }

        const userPoints = userResults[0].point;

        if (userPoints < price_per_person) {
            throw new Error('User does not have enough points to join the party');
        }

        // เพิ่มสมาชิกในห้องปาร์ตี้
        await connection.query(`
            UPDATE party
            SET current_members = current_members + 1
            WHERE id = ?
        `, [partyId]);

        // บันทึกสมาชิกในตาราง party_members
        await connection.query(`
            INSERT INTO party_members (party_id, username)
            VALUES (?, ?)
        `, [partyId, username]);

        // หักคะแนนจากผู้ใช้
        await connection.query(`
            UPDATE user
            SET point = point - ?
            WHERE username = ?
        `, [price_per_person, username]);

        // ตรวจสอบว่าห้องปาร์ตี้เต็มหรือไม่
        if (current_members + 1 === total_members) {
            // ห้องปาร์ตี้เต็มแล้ว -> อัปเดตสถานะเป็น completed
            await connection.query(`
                UPDATE party
                SET status = 'completed'
                WHERE id = ?
            `, [partyId]);
        }

        return { message: 'Joined party successfully' };
    } catch (error) {
        console.error("Error in joinParty:", error);
        throw error;
    }
}



async function getPartyMembers(partyId) {
    try {
        // ดึงข้อมูลสมาชิกทั้งหมดในห้องปาร์ตี้
        const [members] = await connection.query(`
            SELECT username
            FROM party_members
            WHERE party_id = ?
            ORDER BY username = (SELECT leader_username FROM party WHERE id = ?) DESC
        `, [partyId, partyId]);

        return members;
    } catch (error) {
        console.error("Error in getPartyMembers:", error);
        throw error;
    }
}


async function addToCart(user_id, stadium_id, court_id, date, start_time, end_time) {
    try {
        const query = `
            INSERT INTO cart (user_id, stadium_id, court_id, date, start_time, end_time)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [results] = await connection.query(query, [user_id, stadium_id, court_id, date, start_time, end_time]);
        return results.insertId; // ส่งกลับ ID ของรายการที่เพิ่มเข้าไปในรถเข็น
    } catch (error) {
        console.error("Error adding item to cart:", error);
        throw error;
    }
}

async function getCartItems(user_id) {
    try {
        const query = `
           SELECT 
    c.id, 
    c.stadium_id, 
    c.court_id, 
    c.date, 
    c.start_time, 
    c.end_time, 
    c.status,
    s.name AS stadium_name, 
    ct.type AS court_type,
    sc.price_per_hr AS point
FROM cart c
JOIN stadium s ON c.stadium_id = s.id
JOIN court co ON c.court_id = co.id
JOIN court_type ct ON co.court_type_id = ct.id
JOIN stadium_courttype sc ON s.id = sc.stadium_id AND co.court_type_id = sc.court_type_id
WHERE c.user_id = ? AND c.status = 'pending';
        `;
        const [cartItems] = await connection.query(query, [user_id]);
        return cartItems; // ส่งกลับรายการทั้งหมดในรถเข็น
    } catch (error) {
        console.error("Error fetching cart items:", error);
        throw error;
    }
}

async function removeCartItem(cartId, user_id) {
    try {
        const query = `
            DELETE FROM cart
            WHERE id = ? AND user_id = ?
        `;
        const [results] = await connection.query(query, [cartId, user_id]);

        if (results.affectedRows === 0) {
            throw new Error('Cart item not found or you do not have permission to delete it');
        }

        return true; // ส่งกลับ true หากลบสำเร็จ
    } catch (error) {
        console.error("Error deleting cart item:", error);
        throw error;
    }
}



async function updateCartSelection(user_id, cartId, isSelected) {
    console.log('🔹 Running updateCartSelection:', { user_id, cartId, isSelected });

    const query = `
        UPDATE cart
        SET is_selected = ?
        WHERE id = ? AND user_id = ?
    `;

    try {
        const [results] = await connection.query(query, [isSelected, cartId, user_id]);
        console.log('🔹 Database Result:', results);
        return results;
    } catch (error) {
        console.error('❌ Database Error:', error);
        throw error;
    }
}


// ดึงรายการที่ถูกเลือกในตะกร้า
async function getSelectedCartItems(user_id) {
    const [selectedItems] = await connection.query(`
        SELECT * FROM cart
        WHERE user_id = ? AND is_selected = TRUE AND status = 'pending'
    `, [user_id]);
    return selectedItems;
}

// ดึงยอดเงินของผู้ใช้
async function getUserBalance(user_id) {
    const [userBalance] = await connection.query(`
        SELECT point FROM user WHERE id = ?
    `, [user_id]);
    return userBalance.length ? userBalance[0].point : 0;
}

// เพิ่มรายการจองสนาม
async function createReservation(user_id, item) {
    await connection.query(`
        INSERT INTO reservations (user_id, stadium_id, court_id, date, start_time, end_time, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user_id, item.stadium_id, item.court_id, item.date, item.start_time, item.end_time, item.price]);
}

// ลบรายการออกจากตะกร้า
async function removeFromCart(cartId) {
    await connection.query(`
        DELETE FROM cart WHERE id = ?
    `, [cartId]);
}

// หักเงินจากบัญชีผู้ใช้
async function deductUserBalance(user_id, amount) {
    await connection.query(`
        UPDATE user SET point = point - ? WHERE id = ?
    `, [amount, user_id]);
}


async function checkoutCart(user_id) {
    console.log('🔹 Running checkoutCart:', { user_id });
    
    try {
        if (!connection) {
            throw new Error('❌ Database connection is not available');
        }
    
        await connection.beginTransaction(); // ✅ เริ่ม Transaction
    
        // 🔹 ดึงรายการที่เลือกไว้ในตะกร้า
        const [selectedItems] = await connection.query(`
            SELECT * FROM cart
            WHERE user_id = ? AND is_selected = TRUE AND status = 'pending'
        `, [user_id]);
    
        if (selectedItems.length === 0) {
            throw new Error('No items selected for checkout');
        }
    
        // 🔹 คำนวณยอดรวมที่ต้องชำระ
        let totalAmount = 0;
    
        for (const item of selectedItems) {
            // ดึงราคาต่อชั่วโมงจากตาราง stadium_courttype
            const [courtPrice] = await connection.query(`
                SELECT price_per_hr FROM stadium_courttype
                WHERE stadium_id = ? AND court_type_id = (
                    SELECT court_type_id FROM court WHERE id = ?
                )
            `, [item.stadium_id, item.court_id]);
    
            if (courtPrice.length === 0) {
                throw new Error(`Price not found for court ${item.court_id}`);
            }
    
            const pricePerHour = courtPrice[0].price_per_hr;
    
            // คำนวณจำนวนชั่วโมงที่จอง
            const startTime = new Date(`1970-01-01T${item.start_time}`);
            const endTime = new Date(`1970-01-01T${item.end_time}`);
            const hours = (endTime - startTime) / (1000 * 60 * 60);
    
            // คำนวณราคารวมสำหรับรายการนี้
            const itemTotal = pricePerHour * hours;
            totalAmount += itemTotal;
        }
    
        console.log('🔹 Total Amount:', totalAmount);
    
        // 🔹 ดึงยอดเงินของผู้ใช้
        const [userBalance] = await connection.query(`
            SELECT point FROM user WHERE id = ?
        `, [user_id]);
    
        if (userBalance.length === 0) {
            throw new Error('User not found');
        }
    
        console.log('🔹 User Balance:', userBalance[0].point);
    
        if (userBalance[0].point < totalAmount) {
            throw new Error('Insufficient balance'); // ❌ ยอดเงินไม่พอ
        }
    
        // 🔹 ตรวจสอบว่าคอร์ทมีการจองเวลาซ้ำหรือไม่
        for (const item of selectedItems) {
            const [existingReservation] = await connection.query(`
                SELECT id FROM reservation
                WHERE court_id = ? AND date = ? AND (
                    (start_time < ? AND end_time > ?) OR
                    (start_time < ? AND end_time > ?) OR
                    (start_time >= ? AND end_time <= ?)
                )
            `, [
                item.court_id, item.date,
                item.end_time, item.start_time,
                item.start_time, item.end_time,
                item.start_time, item.end_time
            ]);
    
            if (existingReservation.length > 0) {
                throw new Error(`Court ${item.court_id} is already booked for the selected time`);
            }
        }
    
        // 🔹 ย้ายรายการจาก `cart` ไป `reservation`
        for (const item of selectedItems) {
            await connection.query(`
                INSERT INTO reservation (user_id, stadium_id, court_id, date, start_time, end_time, status)
                VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
            `, [user_id, item.stadium_id, item.court_id, item.date, item.start_time, item.end_time]);
        }
    
        console.log('✅ Reservations created');
    
        // 🔹 หักเงินจากบัญชีผู้ใช้
        await connection.query(`
            UPDATE user SET point = point - ? WHERE id = ?
        `, [totalAmount, user_id]);
    
        console.log('✅ Balance deducted');
    
        // 🔹 ลบรายการออกจากตะกร้า
        await connection.query(`
            DELETE FROM cart WHERE user_id = ? AND is_selected = TRUE
        `, [user_id]);
    
        console.log('✅ Cart items removed');
    
        // ✅ Commit Transaction
        await connection.commit();
        console.log('✅ Transaction committed');
    
        return { success: true, message: 'Checkout successful', totalAmount };
    } catch (error) {
        // ❌ Rollback Transaction หากเกิดข้อผิดพลาด
        if (connection) await connection.rollback();
        console.error('❌ Transaction rolled back due to error:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (connection) await connection.end(); // ✅ ปิด connection
    }
    }

    async function checkcourtDuplicate(stadium_id, date, start_time, end_time) {
        try {
            const query = `
                SELECT court.id AS court_id
                FROM court
                JOIN reservation ON reservation.court_id = court.id
                WHERE court.stadium_id = ?
                AND reservation.date = ?
                AND (
                    (reservation.start_time < ? AND reservation.end_time > ?) OR  -- จองทับช่วงเวลาเริ่มต้น
                    (reservation.start_time < ? AND reservation.end_time > ?) OR  -- จองทับช่วงเวลาสิ้นสุด
                    (reservation.start_time >= ? AND reservation.end_time <= ?)    -- จองภายในช่วงเวลา
                )
                AND reservation.status = 'confirmed'
            `;
            
            const [result] = await connection.query(query, [
                stadium_id, 
                date, 
                end_time, start_time,  // สำหรับเงื่อนไขแรก
                end_time, start_time,  // สำหรับเงื่อนไขที่สอง
                start_time, end_time   // สำหรับเงื่อนไขที่สาม
            ]);
    
            // คืนค่าเป็น array ของ court_id ที่ถูกจองแล้ว
            return result.map(row => row.court_id);
        } catch (error) {
            console.error("Error checking reservation:", error);
            return null;
        }
    }


    async function getStadiumDatabystid(stadium_id) {
        try {
            const query = `
                SELECT
                    stadium.id AS id,
                    stadium.name AS stadium,
                    stadium.open_hour AS openHour,
                    stadium.close_hour AS closeHour
                FROM stadium
                WHERE stadium.id = ? AND stadium.verify = "verified";
            `;
    
            const [result] = await connection.query(query, [stadium_id]);
    
            return (result.length > 0) ? result[0] : null; // คืนค่าเฉพาะสนามที่ตรงกับ stadium_id
        } catch (error) {
            console.error("Error in getStadiumData:", error);
            return null;
        }
    }

    async function getStadiumCourtsDatabystid(stadium_id, type = null) {
        try {
            let query = `
                SELECT
                    stadium.id AS stadium_id,
                    court.id AS court_id,
                    court.court_number AS court_number,
                    stadium.name AS stadium,
                    court_type.type AS Facility_Type,
                    court.availability AS Status,
                    stadium_courttype.price_per_hr AS price
                FROM stadium
                JOIN court ON court.stadium_id = stadium.id
                JOIN court_type ON court.court_type_id = court_type.id
                JOIN stadium_courttype ON stadium_courttype.stadium_id = stadium.id 
                    AND stadium_courttype.court_type_id = court_type.id
                WHERE stadium.id = ? 
                AND stadium.verify = "verified"
            `;
    
            // เพิ่มเงื่อนไขกรอง type ถ้ามีการส่งค่า type มา
            if (type) {
                query += ` AND court_type.type = ?`;
            }
    
            // เตรียมพารามิเตอร์สำหรับ query
            const params = [stadium_id];
            if (type) {
                params.push(type);
            }
    
            const [result] = await connection.query(query, params);
    
            return (result.length > 0) ? result : null;
        } catch (error) {
            console.error("Error in getStadiumCourtsData:", error);
            return null;
        }
    }




module.exports = {
    connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, getExchange_point, sentVoucherAmount,getPartyMembers,
    insertNotification, addStadium, getStadiumInfo, addStadiumPhoto, addFacilityList, addStadiumFacility, getData,
    addCourtType, getCourtType, addCourt,getCurrentRating,getAverageRating,updateStadiumRating, addStadiumCourtType,
    addPartyMember,createParty,
    addMemberToParty, checkcourtDuplicate,
    
    checkPartyFull,joinParty,
  
    updatePartyStatus,getStadiumCourtsDatabystid,
    checkUserPoints,
    leaveParty,getStadiumDatabystid,
    
    deductPointsFromUsers,refundPoints,addToCart,getCartItems,removeCartItem,updateCartSelection,checkoutCart,
    getSelectedCartItems,
    getUserBalance,
    createReservation,
    removeFromCart,
    deductUserBalance,
    
   getStadiumCourtsDataBooking,getBookingData, getStadiumWithTwoColumns,changePassword,getCourt,addReservation,checkReservationDuplicate,getCourtReservation,getStadiumData,getStadiumCourtsData,updateCourtStatus ,getReservationsByUserId,getReviewsByStadiumId,getFacilitiesByStadium ,addReview,getStadiumPhoto,updateExchangePoint ,getStadiumSortedByDistancemobile,getStadiumByLocation,deposit,updateUserPoint, getpoint,deleteExchangePoint
};

