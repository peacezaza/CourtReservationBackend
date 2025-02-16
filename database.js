const {hashPassword, comparePassword} = require('./encryption')

const mysql = require('mysql2/promise');


let connection;

async function connectDatabase() {

    try{
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'court_reservation',
            port: 3307
        })
    }
    catch (error){
        console.log("Error while connecting database ", error);
    }


}

async function showtable(){

    const query = "show tables";

    try{
        const [rows] = await connection.query(query);
        console.log("Table list is :", rows);
    }
    catch (err){
        console.log(err);
    }
}

async function insertNewUser(username, email, password, user_type, point){
    try{
        const hashedPassword = await hashPassword(password)
        // console.log("Hash in insert: ", hashedPassword);
        const query = "INSERT INTO user (username, email, password, user_type, point) values(?, ?, ?, ?, ?)"
        const [result] = await connection.query(query, [username, email, hashedPassword, user_type, point]);
        // console.log('Insert successful, ID:', result.insertId);
        // console.log("TEST TEST TEST\n")
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

}

async function login(data, column, password){

    try{
        const query = "SELECT PASSWORD FROM user WHERE ?? = ?"
        const [rows] = await connection.query(query, [column, data])
        return comparePassword(password, rows[0]["PASSWORD"])
    }
    catch (error){
        console.log(error);

    }
}

async function getUserInfo(data, column){
    const query = "SELECT id, username, email, user_type, point FROM user WHERE ?? = ?"

    try{
        const [rows] = await connection.query(query, [column, data]);

        console.log(rows);
        if(rows.length >= 0){
            return rows[0];
        }else{
            return null;
        }
    }
    catch (err){
        console.log("Error get user info", err);
    }


}

async function addStadium(name, phone_number, location, open_hour, close_hour, link, availability, owner_id){

    try{
        const query = "INSERT INTO stadium (name, phone_number, location, open_hour, close_hour, location_link, availability, owner_id) values (?, ?, ?, ?, ?, ?, ?, ?)"

        const [result] = await connection.query(query, [name, phone_number, location, open_hour, close_hour, link, availability, owner_id])

        // console.log(result)

        return result
    }
    catch (error){
        console.log(error);
    }

}

async function getStadiumInfo(data, columns, table){

    try{
        const query = "SELECT * from ?? WHERE ?? = ?";
        const [ rows ] = await connection.query(query, [table, columns, data])

        console.log(rows)

        return (rows.length > 0) ?  rows : null;
    }
    catch(error){

    }
}

async function addStadiumPhoto(stadiumID, filePath){
    try{
        const query = "INSERT INTO picture (path, stadium_id) values(?, ?)"

        const [ result ] = connection.query(query, [filePath, stadiumID]);

        console.log(result)
    }
    catch (err){

    }
}




module.exports = {connectDatabase, checkDuplicate, insertNewUser, login, getUserInfo, addStadium, getStadiumInfo, addStadiumPhoto}