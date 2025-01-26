const {hashPassword, comparePassword} = require('./encryption')

const mysql = require('mysql2/promise');


let connection;

async function connectDatabase() {

    try{
        connection =await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'court_reservation',
        })
    }
    catch (error){
        console.log("Error while connecting database ", error);
    }


}

async function insertNewUser(username, email, password, user_type){
    try{
        const hashedPassword = await hashPassword(password)
        console.log("Hash in insert: ", hashedPassword);
        const query = "INSERT INTO user (username, email, password, user_type) values(?, ?, ?, ?)"
        const [result] = await connection.query(query, [username, email, hashedPassword, user_type]);
        console.log('Insert successful, ID:', result.insertId);
    }
    catch (err){
        console.log(err);
    }
}

async function checkDuplicate(data, column, table) {
    try {
        const query = 'SELECT * FROM ?? WHERE ?? = ?';
        // Pass parameters in order: column, table, column (for WHERE), value
        const [rows] = await connection.query(query, [table, column, data]);

        // console.log(rows);
        return !(rows.length === 0);
    } catch (error) {
        console.error('Error while querying checkDuplication:', error);
    }

    connection.close()
}

async function login(data, column, password){

    try{
        const query = "SELECT PASSWORD FROM USER WHERE ?? = ?"
        const [rows] = await connection.query(query, [column, data])
        // console.log(rows[0]["PASSWORD"])
        return comparePassword(password, rows[0]["PASSWORD"])
    }
    catch (error){
        console.log(error);

    }
}




module.exports = {connectDatabase, checkDuplicate, insertNewUser, login}