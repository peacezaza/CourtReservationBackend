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


async function transaction(id, amount, type) {
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

            // แปลง path ของรูปภาพให้เป็น URL ที่ถูกต้อง
            const pictures = stadium.pictures
                ? stadium.pictures.split(",").map(path => ({
                      path: path,
                      photoUrl: `http://localhost:3000/${path.replace(/\\/g, '/')}`  // แปลง path ให้เป็น URL ที่ถูกต้อง
                  }))
                : [];

            return {
                ...stadium,
                pictures: pictures, // ใช้รูปภาพที่แปลงแล้ว
                distance: distance.toFixed(2) // แสดงทศนิยม 2 ตำแหน่ง
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
        SELECT 
            reservation.*, 
            stadium.name AS stadium_name,
            court.id AS court_id,
            court.court_number,
            court_type.type AS Type,
            IFNULL(p.price_per_person, stadium_courttype.price_per_hr) AS price,  -- ใช้ price_per_person สำหรับกลุ่ม, price_per_hr สำหรับเดี่ยว
            GROUP_CONCAT(DISTINCT picture.path) AS pictures,  -- รวม path ของรูปภาพ
            p.id AS party_id,  -- เพิ่มข้อมูลห้องปาร์ตี้
            p.topic,           -- หัวข้อห้องปาร์ตี้
            p.detail,           -- รายละเอียดห้องปาร์ตี้
            p.total_members,    -- จำนวนสมาชิกทั้งหมด
            p.current_members,  -- จำนวนสมาชิกปัจจุบัน
            GROUP_CONCAT(DISTINCT pm.username) AS members  -- สมาชิกในห้องปาร์ตี้
        FROM 
            reservation
        JOIN 
            stadium ON reservation.stadium_id = stadium.id
        JOIN 
            court ON reservation.court_id = court.id
        JOIN 
            court_type ON court.court_type_id = court_type.id
        JOIN 
            stadium_courttype 
            ON stadium_courttype.stadium_id = reservation.stadium_id 
            AND stadium_courttype.court_type_id = court_type.id
        LEFT JOIN 
            picture ON picture.stadium_id = stadium.id  -- เชื่อมกับรูปภาพของสนาม
        LEFT JOIN 
            party p ON reservation.id = p.reservation_id  -- เชื่อมกับห้องปาร์ตี้
        LEFT JOIN 
            party_members pm ON p.id = pm.party_id  -- เชื่อมกับสมาชิกในห้องปาร์ตี้
        WHERE 
            reservation.user_id = ?  -- การจองแบบเดี่ยว
            OR pm.username = (  -- การจองแบบกลุ่ม
                SELECT username
                FROM user
                WHERE id = ?
            )
        GROUP BY 
            reservation.id, stadium.id, court.id, court_type.id, stadium_courttype.price_per_hr, p.id;
    `;

    try {
        const [result] = await connection.query(query, [userId, userId]);

        if (result.length === 0) {
            console.log(`ไม่พบการจองสำหรับผู้ใช้ที่มี ID: ${userId}`);
            return [];
        }

        // แปลงข้อมูลรูปภาพจาก string ที่รวมกันด้วย comma เป็น array
        const formattedResult = result.map(reservation => ({
            ...reservation,
            pictures: reservation.pictures ? reservation.pictures.split(',').map(path => ({
                path: path,
                photoUrl: `http://localhost:3000/${path.replace(/\\/g, '/')}`  // แปลง path ให้เป็น URL ที่ถูกต้อง
            })) : [],  // แปลงรูปภาพเป็น array ของ object
            members: reservation.members ? reservation.members.split(',') : []     // แปลงสมาชิกเป็น array
        }));

        return formattedResult;  // คืนค่าผลลัพธ์การจอง
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



  
  
  

  


  async function createParty(leaderUsername, courtId, totalMembers, userId, date, startTime, endTime, topic, detail) {
    try {
        // ตรวจสอบว่ามีการจองที่ชนกันหรือไม่
        const [reservationResults] = await connection.query(`
            SELECT id
            FROM reservation
            WHERE court_id = ?
              AND date = ?
              AND (
                (start_time < ? AND end_time > ?) OR
                (start_time < ? AND end_time > ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `, [courtId, date, endTime, startTime, startTime, endTime, startTime, endTime]);

        if (reservationResults.length > 0) {
            throw new Error('มีห้องปาร์ตี้หรือการจองที่ชนกันในวันที่และเวลาที่ระบุ');
        }

        // ดึงข้อมูลราคาต่อชั่วโมงของสนามจากตาราง stadium_courttype
        const [courtPriceResults] = await connection.query(`
            SELECT price_per_hr
            FROM stadium_courttype
            WHERE court_type_id = (
                SELECT court_type_id
                FROM court
                WHERE id = ?
            )
        `, [courtId]);

        if (courtPriceResults.length === 0) {
            throw new Error('Court price not found');
        }

        const pricePerHour = courtPriceResults[0].price_per_hr;

        // คำนวณ price_per_person โดยหาร price_per_hr ด้วยจำนวนคน
        const pricePerPerson = pricePerHour / totalMembers;

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
            INSERT INTO party (leader_username, court_id, total_members, current_members, price_per_person, date, start_time, end_time, topic, detail)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        `, [leaderUsername, courtId, totalMembers, pricePerPerson, date, startTime, endTime, topic, detail]);

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


 


  
  
  
  
  

  
  
  
 
  

  
  async function leaveParty(partyId, username) {
    
    try {
       

        // ตรวจสอบข้อมูลปาร์ตี้
        const [party] = await connection.query(`
            SELECT leader_username, current_members, total_members, status, price_per_person
            FROM party
            WHERE id = ?
        `, [partyId]);

        if (party.length === 0) {
            throw new Error('Party not found');
        }

        const { leader_username, current_members, total_members, status, price_per_person } = party[0];
        
        if (status === 'cancel') {
            throw new Error('Party is already canceled');
        }

        // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของปาร์ตี้หรือไม่
        const [member] = await connection.query(`
            SELECT username
            FROM party_members
            WHERE party_id = ? AND username = ?
        `, [partyId, username]);

        if (member.length === 0) {
            throw new Error('User is not a member of this party');
        }

        // ลบผู้ใช้ออกจากตาราง party_members
        await connection.query(`
            DELETE FROM party_members
            WHERE party_id = ? AND username = ?
        `, [partyId, username]);

        // ลดจำนวน current_members ในตาราง party
        await connection.query(`
            UPDATE party
            SET current_members = current_members - 1
            WHERE id = ?
        `, [partyId]);

        // คืนคะแนนให้ผู้ใช้
        await connection.query(`
            UPDATE user
            SET point = point + ?
            WHERE username = ?
        `, [price_per_person, username]);

        // ถ้าผู้ใช้เป็นหัวหน้า
        if (leader_username === username) {
            // คืนคะแนนให้ทุกคนในปาร์ตี้
            await connection.query(`
                UPDATE user
                SET point = point + ?
                WHERE username IN (
                    SELECT username
                    FROM party_members
                    WHERE party_id = ?
                )
            `, [price_per_person, partyId]);

            // เปลี่ยนสถานะปาร์ตี้เป็น cancel
            await connection.query(`
                UPDATE party
                SET status = 'cancel'
                WHERE id = ?
            `, [partyId]);

            // ลบสมาชิกทั้งหมดออกจากตาราง party_members
            await connection.query(`
                DELETE FROM party_members
                WHERE party_id = ?
            `, [partyId]);

            // แจ้งเตือนสมาชิกทุกคน
            const [members] = await connection.query(`
                SELECT username
                FROM party_members
                WHERE party_id = ?
            `, [partyId]);

            for (const member of members) {
                const [user] = await connection.query(`
                    SELECT id
                    FROM user
                    WHERE username = ?
                `, [member.username]);

                if (user.length > 0) {
                    const userId = user[0].id;
                    await addNewNotification(userId, 'party cancel');
                }
            }
        }

        await connection.commit();
        return { success: true, message: 'Left party successfully' };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
      
    }
}

async function joinParty(partyId, username) {
    
    try {
       

        // ตรวจสอบข้อมูลห้องปาร์ตี้
        const [partyResults] = await connection.query(`
            SELECT current_members, total_members, price_per_person, court_id, date, start_time, end_time, status
            FROM party
            WHERE id = ?
        `, [partyId]);

        if (partyResults.length === 0) {
            throw new Error('Party not found');
        }

        let{ current_members, total_members, price_per_person, court_id, date, start_time, end_time, status } = partyResults[0];

       
    
       


        if (status === 'cancel') {
            throw new Error('Party is already canceled');
        }

        if (current_members >= total_members) {
            throw new Error('Party is full');
        }

        // ตรวจสอบว่าผู้ใช้อยู่ในห้องปาร์ตี้แล้วหรือไม่
        const [memberCheckResults] = await connection.query(`
            SELECT id
            FROM party_members
            WHERE party_id = ? AND username = ?
        `, [partyId, username]);

        if (memberCheckResults.length > 0) {
            throw new Error('User is already in the party');
        }


        

        // ตรวจสอบว่ามีการจองที่ชนกันหรือไม่
        const [reservationResults] = await connection.query(`
            SELECT id
            FROM reservation
            WHERE court_id = ?
              AND date = ?
              AND (
                (start_time < ? AND end_time > ?) OR
                (start_time < ? AND end_time > ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `, [court_id, date, end_time, start_time, start_time, end_time, start_time, end_time]);

        if (reservationResults.length > 0) {
            // มีการจองที่ชนกัน -> เปลี่ยนสถานะปาร์ตี้เป็น cancel
            await connection.query(`
                UPDATE party
                SET status = 'cancel'
                WHERE id = ?
            `, [partyId]);

            // ลบสมาชิกทั้งหมดออกจากตาราง party_members
            await connection.query(`
                DELETE FROM party_members
                WHERE party_id = ?
            `, [partyId]);

            // คืนคะแนนให้ทุกคนในห้องปาร์ตี้
            const [membersResults] = await connection.query(`
                SELECT username
                FROM party_members
                WHERE party_id = ?
            `, [partyId]);

            for (const member of membersResults) {
                await connection.query(`
                    UPDATE user
                    SET point = point + ?
                    WHERE username = ?
                `, [price_per_person, member.username]);

                // แจ้งเตือนสมาชิกทุกคนในห้องปาร์ตี้
                const [user] = await connection.query(`
                    SELECT id
                    FROM user
                    WHERE username = ?
                `, [member.username]);

                if (user.length > 0) {
                    await addNewNotification(user[0].id, 'NoCourtAvailabile');
                }
            }

            throw new Error('Reservation conflict: Party has been canceled and points refunded');
        }

        // ตรวจสอบคะแนนของผู้ใช้
        const [userResults] = await connection.query(`
            SELECT point, id
            FROM user
            WHERE username = ?
        `, [username]);

        if (userResults.length === 0) {
            throw new Error('User not found');
        }

        const userPoints = userResults[0].point;
        const userId = userResults[0].id;

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

            // เพิ่มข้อมูลการจอง (reservation) เมื่อห้องปาร์ตี้เต็ม
            const [reservationInsertResults] = await connection.query(`
                INSERT INTO reservation (court_id, stadium_id, date, user_id, start_time, end_time, status)
                SELECT ?, stadium_id, ?, ?, ?, ?, 'confirmed'
                FROM court
                WHERE id = ?
            `, [court_id, date, userId, start_time, end_time, court_id]);

            const reservationId = reservationInsertResults.insertId;

            // อัปเดต reservation_id ในตาราง party
            await connection.query(`
                UPDATE party
                SET reservation_id = ?
                WHERE id = ?
            `, [reservationId, partyId]);

            // แจ้งเตือนสมาชิกทุกคนในห้องปาร์ตี้
            const [membersResults] = await connection.query(`
                SELECT username
                FROM party_members
                WHERE party_id = ?
            `, [partyId]);

            for (const member of membersResults) {
                const [user] = await connection.query(`
                    SELECT id
                    FROM user
                    WHERE username = ?
                `, [member.username]);

                if (user.length > 0) {
                    await addNewNotification(user[0].id, 'addedNewpartyReservation');
                }
                await transaction(user[0].id, price_per_person, 'purchase');
            }
        }

        await connection.commit();
        return { message: 'Joined party successfully' };
    } catch (error) {
        await connection.rollback();
        console.error("Error in joinParty:", error);
        throw error;
    } finally {
       
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
        // ตรวจสอบว่ามีรายการในรถเข็นที่ซ้ำกันหรือไม่
        const checkQuery = `
            SELECT id
            FROM cart
            WHERE user_id = ?
            AND court_id =?
              AND date = ?
              AND start_time = ?
              AND end_time = ?
        `;
        const [existingItems] = await connection.query(checkQuery, [user_id, court_id,date, start_time, end_time]);

        // ถ้ามีรายการที่ซ้ำกัน
        if (existingItems.length > 0) {
            throw new Error('This item is already in the cart');
        }

        // เพิ่มรายการใหม่ลงในรถเข็น
        const insertQuery = `
            INSERT INTO cart (user_id, stadium_id, court_id, date, start_time, end_time)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [results] = await connection.query(insertQuery, [user_id, stadium_id, court_id, date, start_time, end_time]);

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
                co.court_number AS court_number,  -- เพิ่ม court_number
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

    async function checkoutCart(user_id, cart_ids) {
        try {
            // ดึงข้อมูล point ของ user
            const userQuery = `
                SELECT point FROM user WHERE id = ?
            `;
            const [userData] = await connection.query(userQuery, [user_id]);
    
            if (userData.length === 0) {
                return { success: false, message: "User not found." };
            }
    
            let userPoint = userData[0].point; // เปลี่ยน const เป็น let
    
            // ตรวจสอบและประมวลผลแต่ละ cart
            for (const cart_id of cart_ids) {
                // ดึงข้อมูลจาก cart
                const cartQuery = `
                    SELECT * FROM cart 
                    WHERE id = ? AND user_id = ? AND status = 'pending'
                `;
                const [cartData] = await connection.query(cartQuery, [cart_id, user_id]);
    
                if (cartData.length === 0) {
                    return { success: false, message: `Cart ${cart_id} not found or already processed.` };
                }
    
                 let { stadium_id, court_id, date, start_time, end_time } = cartData[0];
    
          // แปลงเป็น string เพื่อความปลอดภัย
          date = date.toISOString().split("T")[0]; // YYYY-MM-DD
          start_time = start_time.toString().padStart(8, "0"); // HH:MM:SS
          end_time = end_time.toString().padStart(8, "0"); // HH:MM:SS
  
          const now = new Date();
          const startDateTime = new Date(`${date}T${start_time}Z`); // ใช้ Z เพื่อบังคับเป็น UTC
          const endDateTime = new Date(`${date}T${end_time}Z`);
          console.log("Start Time:", startDateTime);
          console.log("End Time:", endDateTime);
  
                // ตรวจสอบว่าเวลาจองผ่านไปแล้วหรือไม่
                if (now > endDateTime) {
                    await deleteCart(cart_id);
                    return { success: false, message: `Cannot reserve cart ${cart_id} because the reservation time has passed.` };
                    
                }
    
                // ตรวจสอบการจองซ้ำ
                const isDuplicate = await checkReserv(court_id, date, start_time, end_time);
                if (isDuplicate) {
                    // ลบข้อมูลใน cart เนื่องจากมีการจองซ้ำ
                    await deleteCart(cart_id);
                    return { success: false, message: `The court in cart ${cart_id} is already reserved for the selected time.` };
                }
    
                // ดึงข้อมูลราคาจองสนามจากตาราง stadium_courttype
                const priceQuery = `
                    SELECT price_per_hr FROM stadium_courttype
                    WHERE stadium_id = ? AND court_type_id = (
                        SELECT court_type_id FROM court WHERE id = ?
                    )
                `;
                const [priceData] = await connection.query(priceQuery, [stadium_id, court_id]);
    
                if (priceData.length === 0) {
                    return { success: false, message: `Price information not found for cart ${cart_id}.` };
                }
    
                const pricePerHour = priceData[0].price_per_hr;
    
                // คำนวณราคารวม
                const start = new Date(`1970-01-01T${start_time}`);
                const end = new Date(`1970-01-01T${end_time}`);
                const durationInHours = (end - start) / (1000 * 60 * 60); // คำนวณระยะเวลาเป็นชั่วโมง
                const totalPrice = pricePerHour * durationInHours;
    
                // ตรวจสอบว่า point เพียงพอหรือไม่
                if (userPoint < totalPrice) {
                    return { success: false, message: `Insufficient points for cart ${cart_id}.` };
                }
    
                // ลด point ของ user
                userPoint -= totalPrice; // ตอนนี้สามารถกำหนดค่าใหม่ได้
                const updateUserPointQuery = `
                    UPDATE user 
                    SET point = ? 
                    WHERE id = ?
                `;
                await connection.query(updateUserPointQuery, [userPoint, user_id]);
    
                // เพิ่มข้อมูลการจองลงในตาราง reservation
                const insertReservationQuery = `
                    INSERT INTO reservation (court_id, stadium_id, date, user_id, start_time, end_time, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
                `;
                await connection.query(insertReservationQuery, [
                    court_id, stadium_id, date, user_id, start_time, end_time
                ]);
    
                // ลบข้อมูลใน cart เนื่องจากจองสำเร็จ
                await deleteCart(cart_id);
                const res3 = await transaction(user_id, totalPrice, 'purchase');
            }
    
            return { success: true, message: "Payment and reservation completed successfully for all selected carts." };
        } catch (error) {
            console.error("Error during checkout:", error);
            return { success: false, message: "An error occurred during checkout." };
        }
    }
    
    // ฟังก์ชันสำหรับลบข้อมูลใน cart
    async function deleteCart(cart_id) {
        try {
            const deleteQuery = `
                DELETE FROM cart 
                WHERE id = ?
            `;
            await connection.query(deleteQuery, [cart_id]);
        } catch (error) {
            console.error("Error deleting cart:", error);
        }
    }


    async function checkReserv(court_id, date, start_time, end_time) {
        try {
            const query = `
                SELECT * FROM reservation 
                WHERE court_id = ? 
                AND date = ? 
                AND (
                    (start_time < ? AND end_time > ?) OR  -- จองทับช่วงเวลาเริ่มต้น
                    (start_time < ? AND end_time > ?) OR  -- จองทับช่วงเวลาสิ้นสุด
                    (start_time >= ? AND end_time <= ?)   -- จองภายในช่วงเวลา
                )
                AND status = 'confirmed'
            `;
            
            const [result] = await connection.query(query, [
                court_id, 
                date, 
                end_time, start_time,  // สำหรับเงื่อนไขแรก
                end_time, start_time,  // สำหรับเงื่อนไขที่สอง
                start_time, end_time   // สำหรับเงื่อนไขที่สาม
            ]);
    
            return result.length > 0; // ถ้ามีผลลัพธ์ แสดงว่ามีการจองทับ
        } catch (error) {
            console.error("Error checking reservation:", error);
            return null;
        }
    }


    async function getPictures(stadiumId = null) {
        let query = "SELECT * FROM picture";
        let params = [];
    
        if (stadiumId) {
            query += " WHERE stadium_id = ?";
            params.push(stadiumId);
        }
    
        return new Promise((resolve, reject) => {
            connection.query(query, params, (error, results) => {
                if (error) {
                    return reject(error);
                }
                resolve(results);
            });
        });
    }


    async function getPendingParties() {
        const query = `
            SELECT  
                p.id AS party_id,
                p.leader_username, 
                p.court_id, 
                p.total_members,  
                p.current_members,  
                p.price_per_person,  
                p.date,  
                p.start_time, 
                p.end_time, 
                p.topic, 
                p.detail,
                c.court_number,  -- หมายเลขสนาม
                ct.type AS court_type,
                s.name AS stadium_name,
                s.location AS stadium_location,  -- ที่ตั้งของสนาม
                GROUP_CONCAT(DISTINCT pm.username) AS members,  -- สมาชิกในห้องปาร์ตี้
                GROUP_CONCAT(DISTINCT pic.path) AS pictures  -- รูปภาพของสนาม
            FROM 
                party p
            JOIN 
                court c ON p.court_id = c.id
            JOIN 
                court_type ct ON c.court_type_id = ct.id
            JOIN 
                stadium s ON c.stadium_id = s.id
            LEFT JOIN 
                party_members pm ON p.id = pm.party_id
            LEFT JOIN 
                picture pic ON s.id = pic.stadium_id  -- JOIN ตาราง picture เพื่อดึงรูปภาพ
            WHERE 
                p.status = 'pending'  -- ดึงเฉพาะห้องปาร์ตี้ที่มีสถานะเป็น pending
            GROUP BY 
                p.id;
        `;
    
        try {
            // ใช้ await กับ query เพื่อให้ได้ผลลัพธ์จากฐานข้อมูล
            const [result] = await connection.query(query);
    
            // ถ้าไม่พบผลลัพธ์
            if (result.length === 0) {
                console.log('ไม่พบห้องปาร์ตี้ที่มีสถานะเป็น pending');
                return [];
            }
    
            // แปลงข้อมูลรูปภาพจาก string ที่รวมกันด้วย comma เป็น array ของ object
            const formattedResult = result.map(party => ({
                ...party,
                pictures: party.pictures
                    ? party.pictures.split(',').map(path => ({
                          path: path,
                          photoUrl: `http://localhost:3000/${path.replace(/\\/g, '/')}`  // แปลง path ให้เป็น URL ที่ถูกต้อง
                      }))
                    : [],  // แปลงรูปภาพเป็น array ของ object
                members: party.members ? party.members.split(',') : []  // แปลงสมาชิกเป็น array
            }));
    
            return formattedResult;  // คืนค่าผลลัพธ์ห้องปาร์ตี้
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการดึงข้อมูลห้องปาร์ตี้:', error);
            throw error;  // ขว้างข้อผิดพลาดออกไปเพื่อให้ฟังก์ชันที่เรียกใช้สามารถจัดการ
        }
    }



    async function addNewNotification(user_id, text) {
        try {
            const query = `
                INSERT INTO notification (user_id, date, time, notification)
                VALUES (?, CURRENT_DATE(), CURRENT_TIME(), ?)
            `;
    
            const [result] = await connection.query(query, [user_id, text]);
    
            // ตรวจสอบว่ามีการเพิ่มข้อมูลสำเร็จหรือไม่
            if (result.affectedRows > 0) {
                console.log('Notification added successfully');
                return true;
            } else {
                console.log('Failed to add notification');
                return false;
            }
        } catch (error) {
            console.error('Error adding new notification:', error);
            return false;  // คืนค่า false หากเกิดข้อผิดพลาด
        }
    }

    async function getNotificationsByUserId(userId) {
        const query = `
            SELECT id, notification, date,time
            FROM notification
            WHERE user_id = ?
            ORDER BY date DESC
        `;
    
        try {
            const [notifications] = await connection.query(query, [userId]);
    
            if (notifications.length === 0) {
                console.log(`ไม่พบการแจ้งเตือนสำหรับผู้ใช้ที่มี ID: ${userId}`);
                return [];
            }
    
            return notifications;  // คืนค่าผลลัพธ์การแจ้งเตือน
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน:', error);
            throw error;  // ขว้างข้อผิดพลาดออกไปเพื่อให้ฟังก์ชันที่เรียกใช้สามารถจัดการ
        }
    }


    async function insertReport(topic, detail, userId) {
        const query = `
            INSERT INTO report (topic, detail, user_id)
            VALUES (?, ?, ?)
        `;
    
        try {
            const [result] = await connection.query(query, [topic, detail, userId]);
            return { success: true, reportId: result.insertId };
        } catch (error) {
            console.error('Error inserting report:', error);
            throw error;
        }
    }


    async function cancelReservation(reservationId, userId) {
        try {
            await connection.beginTransaction();
    
            // ตรวจสอบว่าการจองเป็นของผู้ใช้หรือไม่
            const [reservation] = await connection.query(
                `SELECT id, date, start_time, end_time, status, court_id, stadium_id
                 FROM reservation
                 WHERE id = ? AND user_id = ?`,
                [reservationId, userId]
            );
    
            if (reservation.length === 0) {
                throw new Error('Reservation not found or does not belong to the user');
            }
    
            let { date, start_time, end_time, status, court_id, stadium_id } = reservation[0];
    
            // ตรวจสอบสถานะการจอง
            if (status === 'cancelled') {
                throw new Error('Reservation is already canceled');
            }
    
            // ตรวจสอบว่าการจองนี้เป็นการจองแบบกลุ่มหรือไม่
            const [party] = await connection.query(
                `SELECT id FROM party WHERE reservation_id = ?`,
                [reservationId]
            );
    
            if (party.length > 0) {
                throw new Error('Cannot cancel a group reservation');
            }
    
            
           // แปลงเป็น string เพื่อความปลอดภัย
           date = date.toISOString().split("T")[0]; // YYYY-MM-DD
           start_time = start_time.toString().padStart(8, "0"); // HH:MM:SS
           end_time = end_time.toString().padStart(8, "0"); // HH:MM:SS
   
           const now = new Date();
           const startDateTime = new Date(`${date}T${start_time}Z`); // ใช้ Z เพื่อบังคับเป็น UTC
           const endDateTime = new Date(`${date}T${end_time}Z`);
   
           // Debug: เช็คค่าที่แปลงแล้ว
           console.log("Start Time:", startDateTime);
           console.log("End Time:", endDateTime);
   
           if (isNaN(startDateTime) || isNaN(endDateTime)) {
               throw new Error("Invalid date format after conversion");
           }
   
           // ตรวจสอบว่าเวลาจองผ่านไปแล้วหรือไม่
           if (now > endDateTime) {
               throw new Error('Cannot cancel reservation after the end time');
           }
   
           // ตรวจสอบว่าเหลือเวลาอย่างน้อย 1 ชั่วโมงก่อนเริ่มจอง
           const timeDifference = (startDateTime - now) / (1000 * 60 * 60);
           if (timeDifference < 1) {
               throw new Error('Cannot cancel reservation less than 1 hour before the start time');
           }
    
            // ดึงราคาต่อชั่วโมงของสนาม
            const [priceResult] = await connection.query(
                `SELECT price_per_hr
                 FROM stadium_courttype
                 WHERE stadium_id = ? AND court_type_id = (
                     SELECT court_type_id
                     FROM court
                     WHERE id = ?
                 )`,
                [stadium_id, court_id]
            );
    
            if (priceResult.length === 0) {
                throw new Error('Failed to retrieve price information');
            }
    
            const pricePerHour = priceResult[0].price_per_hr;
    
            // คืนคะแนนให้ผู้ใช้
            await connection.query(
                `UPDATE user
                 SET point = point + ?
                 WHERE id = ?`,
                [pricePerHour, userId]
            );
    
            // เปลี่ยนสถานะการจองเป็น cancel
            await connection.query(
                `UPDATE reservation
                 SET status = 'cancelled'
                 WHERE id = ?`,
                [reservationId]
            );
    
            // เพิ่มข้อมูลการยกเลิกในตาราง transactions
            await connection.query(
                `INSERT INTO transactions (user_id, point, transaction_type, time)
                 VALUES (?, ?, 'cancel', NOW())`,
                [userId, pricePerHour]
            );
    
            await connection.commit();
            return { success: true, message: 'Reservation canceled successfully', refundedPoints: pricePerHour };
        } catch (error) {
            await connection.rollback();
            console.error('Error canceling reservation:', error);
            throw error;
        }
    }
    

    async function checkAndCancelExpiredParties(partyId) {
        try {
            const now = new Date();
            const formattedDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
            const formattedTime = now.toTimeString().split(" ")[0]; // HH:MM:SS
            console.log(formattedDate);
            console.log(formattedTime);
            // ดึงข้อมูลปาร์ตี้ที่กำลังตรวจสอบ
            const [partyResults] = await connection.query(`
                SELECT id, end_time, price_per_person, status
                FROM party
                WHERE id = ? AND date <= ? AND end_time <= ? AND status NOT IN ('cancel', 'completed')
            `, [partyId, formattedDate, formattedTime]);
    
            if (partyResults.length > 0) {
                const { price_per_person } = partyResults[0];
    
                // ดึงสมาชิกทั้งหมดในปาร์ตี้
                const [membersResults] = await connection.query(`
                    SELECT username FROM party_members WHERE party_id = ?
                `, [partyId]);
    
                for (const member of membersResults) {
                    const { username } = member;
    
                    // คืนคะแนนให้สมาชิก
                    await connection.query(`
                        UPDATE user SET point = point + ? WHERE username = ?
                    `, [price_per_person, username]);
    
                    // ดึง user_id เพื่อนำไปใช้แจ้งเตือน
                    const [user] = await connection.query(`
                        SELECT id FROM user WHERE username = ?
                    `, [username]);
    
                    if (user.length > 0) {
                        await addNewNotification(user[0].id, 'PartyExpired');
                    }
                }
    
                // ลบสมาชิกทั้งหมดออกจากตาราง party_members
                await connection.query(`
                    DELETE FROM party_members WHERE party_id = ?
                `, [partyId]);
    
                // อัปเดตสถานะปาร์ตี้เป็น "cancel"
                await connection.query(`
                    UPDATE party SET status = 'cancel' WHERE id = ?
                `, [partyId]);
    
                throw new Error('partycancel'); // ❗ ปาร์ตี้หมดเวลา -> โยน Error ออกไป
            }
        } catch (error) {
            console.error("Error in checkAndCancelExpiredParties:", error);
            throw error;
        }
    }
    
    
    





module.exports = {
    connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, getExchange_point, sentVoucherAmount,getPartyMembers,
    insertNotification, addStadium, getStadiumInfo, addStadiumPhoto, addFacilityList, addStadiumFacility, getData,getPendingParties,
    addCourtType, getCourtType, addCourt,getCurrentRating,getAverageRating,updateStadiumRating, addStadiumCourtType,checkAndCancelExpiredParties,
createParty,
     checkcourtDuplicate,insertReport,
    
    joinParty,checkReserv,
  
    getStadiumCourtsDatabystid,getPictures,cancelReservation,
    
    leaveParty,getStadiumDatabystid,
    
  addToCart,getCartItems,removeCartItem,checkoutCart,getNotificationsByUserId,
    
   
    createReservation,
    removeFromCart,
    addNewNotification,
    
   getStadiumCourtsDataBooking,getBookingData, getStadiumWithTwoColumns,changePassword,getCourt,addReservation,checkReservationDuplicate,getCourtReservation,getStadiumData,getStadiumCourtsData,updateCourtStatus ,getReservationsByUserId,getReviewsByStadiumId,getFacilitiesByStadium ,addReview,getStadiumPhoto,updateExchangePoint ,getStadiumSortedByDistancemobile,getStadiumByLocation,transaction,updateUserPoint, getpoint,deleteExchangePoint
};

