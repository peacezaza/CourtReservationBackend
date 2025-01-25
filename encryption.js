const bcrypt = require('bcrypt');

async function hashPassword(password) {
    const saltRounds = 10

    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log("Hashed password is:", hash);
        return hash;
    } catch (err) {
        console.log(err);
        throw err;
    }
}

module.exports = {hashPassword};