const spicedPg = require("spiced-pg");

let db;
if (process.env.DATABASE_URL) {
    db = spicedPg(process.env.DATABASE_URL);
} else {
    const { dbuser, dbpass } = require("../secrets");
    db = spicedPg(`postgres:${dbuser}:${dbpass}@localhost:5432/petition`);
}

exports.addAccounts = function(first, last, email, password) {
    return db.query(
        `INSERT INTO users (first, last, email, password)
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
        [first, last, email, password]
    );
};

exports.getLogin = email => {
    return db.query(`SELECT id, password FROM users WHERE email = $1`, [email]);
};

exports.addUserProfiles = function(age, city, url, userId) {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
        [age || null, city || null, url || null, userId || null]
    );
};

exports.addSignature = function(signature, userId) {
    return db.query(
        `INSERT INTO signatures (signature, user_id)
    VALUES ($1, $2)
    RETURNING id`,
        [signature, userId]
    );
};

exports.getSignature = user_id => {
    return db.query(
        `SELECT id, user_id, signature
        FROM signatures
        WHERE user_id = $1`,
        [user_id]
    );
};

exports.getSigners = function() {
    return db.query(`SELECT first, last, age, city, url
        FROM users
        JOIN signatures
        ON users.id = signatures.user_id
        LEFT OUTER JOIN user_profiles
        ON users.id = user_profiles.user_id`);
};

exports.filterByCities = function(city) {
    return db
        .query(
            `SELECT users.first, users.last, user_profiles.age, user_profiles.url
        FROM signatures
        JOIN users
        ON signatures.user_id = users.id
        JOIN user_profiles
        ON users.id = user_profiles.user_id
        WHERE LOWER(user_profiles.city) = LOWER($1)`,
            [city || null]
        )
        .then(({ rows }) => {
            return rows;
        });
};

exports.getUserInfo = function(id) {
    return db.query(
        `SELECT first, last, email, age, city, url
        FROM users
        LEFT JOIN user_profiles
        ON users.id = user_profiles.user_id
        WHERE users.id = $1`,
        [id]
    );
};

//update without password
exports.updateProfile = function(first, last, email, id) {
    console.log(first, last, email, id);
    return db.query(
        `UPDATE users
        SET first = $1, last = $2, email = $3
        WHERE id = $4`,
        [first || null, last || null, email || null, id]
    );
};

//update with password
exports.updateProfilePw = function(first, last, email, password, id) {
    console.log("updateProfilePw", first, last, email, password, id);
    return db.query(
        `UPDATE users
        SET first = $1, last = $2, email = $3, password = $4
        WHERE id = $5`,
        [first, last, email, password, id]
    );
};

//update profile optionals
exports.updateProfileOpt = function(userId, age, city, url) {
    return db.query(
        `INSERT INTO user_profiles (user_id, age, city, url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET age = $2, city = $3, url = $4`,
        [userId, age || null, city || null, url || null]
    );
};

exports.deleteSignature = function(id) {
    return db.query(`DELETE FROM signatures WHERE user_id=$1`, [id]);
};

exports.countSigners = function() {
    return db.query(`SELECT COUNT(*) FROM signatures`);
};
