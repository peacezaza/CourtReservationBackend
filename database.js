const { hashPassword, comparePassword } = require('./encryption');
const mysql = require('mysql2/promise');
const twvoucher = require('@fortune-inc/tw-voucher');

let connection;

async function connectDatabase() {
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'court_reservation',
            port: 3307
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
    } catch (err) {
        console.log(err);
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
            SELECT user.username AS owner_name, user.first_name AS owner_first_name  ,  user.last_name AS owner_last_name,   user.phone_number AS owner_phone_number,
            exchange_point.id, exchange_point.point , exchange_point.date , exchange_point.time , exchange_point.user_id
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

async function getTransactions(searchTerm) {
    try {
        let query = `
            SELECT t.id, a.username, a.user_type, t.point, t.transaction_type, t.time
            FROM transactions t
            JOIN user a ON t.user_id = a.id
        `;
        let params = [];

        if (searchTerm) {
            query += " WHERE a.username LIKE ? OR t.user_id LIKE ? OR t.id  LIKE ?";
            params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
        }

        query += " ORDER BY t.time DESC"; // เรียงจากใหม่ไปเก่า
        const [rows] = await connection.query(query, params);
        return rows;
    } catch (error) {
        console.error("Error fetching transactions:", error);
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

async function insertNotification(user_id ,date ,time, notification) {
    try {
        const query = "INSERT INTO notification (user_id, date ,time, notification ) VALUES (?, ?,?, ?)";
        const [result] = await connection.query(query, [user_id,  date ,time,notification]);
        console.log('Notification inserted, ID:', result.insertId);
        return { id: result.insertId, user_id,  date ,time,notification };
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

async function getStadiumWithPictures(column1, data1, column2, data2) {
    try {
        const query = `
            SELECT s.*, GROUP_CONCAT(p.path) AS pictures
            FROM stadium s
            LEFT JOIN picture p ON s.id = p.stadium_id
            WHERE s.?? = ? AND s.?? = ?
            GROUP BY s.id`;
        const [result] = await connection.query(query, [column1, data1, column2, data2]);

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
async function getStadiumWithPicturesToVerify(column1, data1) {

    try {
        // console.log("DATA: ")
        // console.log(column1, data1)
        const query = `
            SELECT s.*, GROUP_CONCAT(p.path) AS pictures
            FROM stadium s
            LEFT JOIN picture p ON s.id = p.stadium_id
            WHERE s.?? = ?
            GROUP BY s.id`;
        const [result] = await connection.query(query, [column1, data1]);

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

// Mobile

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

async function getStadiumSortedByDistance(currentLatitude, currentLongitude, column, verify) {
    try {
        const query = `
            SELECT s.*, GROUP_CONCAT(p.path) AS pictures,
            GROUP_CONCAT(court_type.type) AS facility_type
            FROM stadium s
            LEFT JOIN picture p ON s.id = p.stadium_id
            LEFT JOIN stadium_courttype ON s.id = stadium_courttype.stadium_id
            LEFT JOIN court_type ON court_type.id = stadium_courttype.court_type_id
            WHERE s.?? = ?
            GROUP BY s.id`;

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

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
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

async function updateReservationStatus(court_id, date, start_time, end_time, status) {
    try {
        const query = `
        UPDATE reservation
        SET status = ?
        WHERE court_id = ?
        AND date = ?
        AND start_time = ?
        AND end_time = ?
        AND status <> ?;  -- Only update if status is different
        `;

        const [result] = await connection.query(query, [status, court_id, date, start_time, end_time, status]);

        return result.affectedRows > 0 ? result : null;
    } catch (error) {
        console.log(error);
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

async function updateUserdata(user_id, first_name, last_name, phone_number) {
    try {
        const query = `
            UPDATE user
            SET first_name = ?, last_name = ?, phone_number = ?
            WHERE id = ?;
        `;
        const [result] = await connection.query(query, [first_name, last_name, phone_number, user_id]);

        return result;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function updateStadiumdata(stadium_id, availability) {
    try {
        const query = `
            UPDATE stadium
            SET availability = ?
            WHERE id = ?;
        `;
        const [result] = await connection.query(query, [availability, stadium_id]);

        return result.affectedRows > 0 ? result : null;
    } catch (error) {
        console.log(error);
        return null;
    }
}


async function getBookingData(userId) {
    try {
        const query = `SELECT
    reservation.id AS id,
    user.first_name AS name,
    court.id AS court_id,
    reservation.user_id AS user_id,
    user.phone_number AS contact,
    stadium.name AS stadium,
    stadium.owner_id AS owner_id,
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

async function checkOwnerReservation(reservation_id){

    try{
        const query = `
        SELECT
        reservation.user_id AS reservation_user_id,
        reservation.stadium_id AS stadium_id,
        stadium.owner_id AS owner_id
        FROM reservation
        JOIN stadium ON stadium.id = reservation.stadium_id
        Where reservation.id = ? AND reservation.user_id = stadium.owner_id;
        ;`;

        const [result] = await connection.query(query, [reservation_id]);

        return result.length > 0;
    }
    catch (error){
        console.log(error);
        return null;
    }
}


async function getTransaction(user_id, columns, data){

    try{
        const query = `
        SELECT
        id,
        user_id,
        point,
        time,
        transaction_type AS status
        FROM transactions
        WHERE user_id = ?
        ;`;
        const [result] = await connection.query(query, [user_id])

        return result
    }
    catch (error){

    }
}

async function getOverview(owner_id, location_status, startDate, endDate){
    try{
        const query = `
       SELECT
            SUM(stadium_courttype.price_per_hr) AS total_amount,
            COUNT(DISTINCT reservation.id) AS total_reservations,
            COUNT(DISTINCT stadium.id) AS Active_location
        FROM stadium
        LEFT JOIN reservation ON stadium.id = reservation.stadium_id
        LEFT JOIN court ON court.id = reservation.court_id
        LEFT JOIN stadium_courttype
            ON stadium_courttype.stadium_id = reservation.stadium_id
            AND stadium_courttype.court_type_id = court.court_type_id
        WHERE stadium.owner_id = ?
          AND stadium.availability = ?
          AND reservation.date BETWEEN ? AND ?

`
        const [result] = await connection.query(query, [owner_id, location_status, startDate, endDate])

        return result
    }
    catch (error){
        console.log(error)
        return null
    }
}

async function getUtilzation(owner_id){
    try{
        const query = `
        SELECT
        stadium.id,
            stadium.open_hour,
            stadium.close_hour,
        (TIME_TO_SEC(stadium.close_hour) - TIME_TO_SEC(stadium.open_hour)) / 3600 AS hours_per_stadium
        FROM stadium
        WHERE stadium.owner_id = ?
            AND stadium.availability = ?;`
    }
    catch (error){
        return null;
    }
}

module.exports = {
    connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, getExchange_point, sentVoucherAmount,
    insertNotification, addStadium, getStadiumInfo, addStadiumPhoto, addFacilityList, addStadiumFacility, getData,
    addCourtType, getCourtType, addCourt, addStadiumCourtType, getStadiumWithPictures,updateExchangePoint , deleteExchangePoint
    , getTransactions , updateReservationStatus,updateUserdata , getCourt , updateStadiumdata , getStadiumSortedByDistance
    , getStadiumWithPicturesToVerify,updateCourtStatus,getStadiumByLocation
    ,getStadiumCourtsData,getStadiumData,getCourtReservation,checkReservationDuplicate,addReservation
    ,getBookingData, checkOwnerReservation, getTransaction, getOverview,getUtilzation

};


