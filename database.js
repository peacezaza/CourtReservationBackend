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

        // console.log(rows)

        return (rows.length > 0) ?  rows : null;
    }
    catch(error){

    }
}

async function addStadiumPhoto(stadiumID, filePath){
    try{
        const query = "INSERT INTO picture (path, stadium_id) values(?, ?)"

        const [ result ] = await connection.query(query, [filePath, stadiumID]);

        // console.log(result)
    }
    catch (err){

    }
}

async function addFacilityList(name){

    try{
        const query = "INSERT INTO facility (name) values(?)"

        const [ result ] = await connection.query(query, [name])

        // console.log(result)

        return result
    }
    catch (error){
        console.log(error)
    }
}

async function getData(column, data){

    try{
        const query = "SELECT * FROM facility WHERE ?? = ?"
        const [ result ] = await connection.query(query, [column, data]);

        return (result.length > 0) ?  result : null;
    }
    catch(error){
        console.log(error);
    }
}

async function addStadiumFacility(stadiumId, facilityId){
    try{
        const query = "INSERT INTO stadium_facility (stadium_id, facility_id) values (?, ?)"

        const [ result ] = await connection.query(query, [stadiumId, facilityId])

        return (result.affectedRows > 0) ?  result : null;
    }
    catch(error){
        console.log(error);
        return null
    }
}

async function addCourtType(type){
    try{
        const query = "INSERT INTO court_type (type) values (?)"
        const [ result ] = await connection.query(query, [type])

        return result;
    }catch (error){
        console.log(error);
    }
}

async function getCourtType(columns, typeName){
    try{
        const query = "select * from court_type where ?? = ?"
        const [ result ] = await connection.query(query,[columns, typeName])

        return (result.length > 0) ? result : null
    }catch (error){
        console.log(error);
        return null;
    }
}

async function addCourt(stadiumId, courtTypeId, availability){
    try{
        const query = "INSERT INTO court (stadium_id, court_type_id, availability) values(?, ?, ?)"
        const [ result ] = await connection.query(query, [stadiumId, courtTypeId, availability])

        return (result.affectedRows >0) ? result : null;
    }
    catch (error){
        console.log(error)
        return null
    }

}

async function addStadiumCourtType(stadiumId, courtTypeId, numberOfCourts, pricePerHour){

    try{
        const query = "INSERT INTO stadium_courttype (stadium_id, court_type_id, number_of_courts, price_per_hr) values (?, ?, ?, ?)"
        const [ result ] = connection.query(query, [stadiumId, courtTypeId, numberOfCourts, pricePerHour])

        return (result.affectedRows >0) ? result : null
    }
    catch (error){
        console.log(error)
        return null;
    }

}





module.exports = {connectDatabase, checkDuplicate, insertNewUser,
    login, getUserInfo, addStadium, getStadiumInfo, addStadiumPhoto,
    addFacilityList, addStadiumFacility, getData, addCourtType, getCourtType,
    addCourt, addStadiumCourtType}
