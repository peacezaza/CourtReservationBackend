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

async function getData(column, data) {
    try {
        const query = "SELECT * FROM facility WHERE ?? = ?";
        const [result] = await connection.query(query, [column, data]);
        return (result.length > 0) ? result : null;
    } catch (error) {
        console.log(error);
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

async function addCourt(stadiumId, courtTypeId, availability) {
    try {
        const query = "INSERT INTO court (stadium_id, court_type_id, availability) values(?, ?, ?)";
        const [result] = await connection.query(query, [stadiumId, courtTypeId, availability]);
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

async function getReservationsByUserId(userId) {
    const query = `
      SELECT reservation.*, stadium.name AS stadium_name
      FROM reservation
      JOIN stadium ON reservation.stadium_id = stadium.id
      WHERE reservation.user_id = ?
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
        console.error('Error while get:', error);
    }
}
    
  



module.exports = {
    connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, getExchange_point, sentVoucherAmount,
    insertNotification, addStadium, getStadiumInfo, addStadiumPhoto, addFacilityList, addStadiumFacility, getData,
    addCourtType, getCourtType, addCourt, addStadiumCourtType, getStadiumWithTwoColumns, getReservationsByUserId, addReview,getStadiumPhoto,updateExchangePoint ,getStadiumSortedByDistance,getStadiumByLocation,deposit,updateUserPoint, getpoint,deleteExchangePoint
};

