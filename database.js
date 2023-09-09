const mysql = require('mysql');
const Config = require('./config');
const config = new Config();
//const mongoose = require('mongoose');

const conn = mysql.createPool(config.getGroup('database'));

//mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});

class Database {
    static async createUser(telegram_id, telegram_username) {
        return new Promise((resolve, reject) => {
            conn.query(
                "INSERT INTO bot_users(`telegram_id`, `telegram_username`, `balance`, `last_transaction`, `purchases`, `admin`) " +
                "VALUES(?, ?, ?, ?, ?, ?);",
                [
                    telegram_id,
                    telegram_username,
                    0,
                    0,
                    0,
                    0
                ],
                async err => {
                    if (err) return reject(err);
                    const u = await Database.findUser(telegram_id, true);
                    return resolve(u);
                }
            )
        });
    }

    static async findUser(query, findById=true) {
        return new Promise((resolve, reject) => {
            conn.query(
                "SELECT * FROM bot_users WHERE "+(findById ? "telegram_id" : "telegram_username")+" = ? LIMIT 1;",
                [
                    query
                ],
                (err, res) => {
                    if (err || res.length == 0) return reject(err || null);
                    return resolve(res[res.length-1]);
                }
            )
        })
    }
    
    static async getUsers() {
        return new Promise((resolve, reject) => {
            conn.query(
                "SELECT * FROM bot_users;",
                (err, res) => {
                    if (err) return reject(err);
                    return resolve(res);
                }
            )
        });
    }

    static async userExists(query, findById=true) {
        return new Promise(async(resolve, reject) => {
            conn.query(
                "SELECT * FROM bot_users WHERE "+(findById ? "telegram_id" : "telegram_username")+" = ? LIMIT 1;",
                [
                    query
                ],
                (err, res) => {
                    if (err) return reject(err);
                    return resolve(res.length > 0);
                }
            )
        });
    }

    static async updateUsername(telegram_id, telegram_username) {
        return new Promise(async(resolve, reject) => {
            const e = await Database.userExists(telegram_id, true);
            if (!e) {
                return resolve(await Database.createUser(telegram_id, telegram_username));
            }
            
            return resolve(await Database.findUser(telegram_id, true))
        });
    }

    static async incrementPurchases(telegram_id) {
        return new Promise(async (resolve, reject) => {
            conn.query("UPDATE bot_users SET purchases = purchases + 1 WHERE telegram_id = ?;", [
                telegram_id
            ], (err) => {
                if (err) return reject(err);
                return resolve();
            })
        });
    }

    static async setTransactionId(telegram_id, trans) {
        return new Promise(async(resolve, reject) => {
            conn.query("UPDATE bot_users SET last_transaction = ? WHERE telegram_id = ?;", [
                trans,
                telegram_id
            ], (err) => {
                if (err)
                    return reject(err);
                return resolve();
            })
        });
    }
    static async addMoney(telegram_id, amount) {
        return new Promise(async(resolve, reject) => {
            const operation = amount < 0 ? "-" : "+";
            let newAmount = amount < 0 ? amount*-1:amount;
            console.log("UPDATE bot_users SET balance = balance " + operation + newAmount + " WHERE telegram_id = "+telegram_id+";")
            conn.query(
                "UPDATE bot_users SET balance = balance " + operation + newAmount + " WHERE telegram_id = ?;",
                [
                    telegram_id
                ],
                (err) => {
                    if (err)
                        return reject(err);
                    return resolve();
                }
            )
        });
    }

    static async removeAdmin(username) {
        return new Promise((resolve, reject) => {
            conn.query(
                "UPDATE bot_users SET admin = 0 WHERE telegram_username = ?;",
                [
                    username
                ],
                err => {
                    if (err) return reject(err);
                    return resolve();
                }
            )
        });
    }

    static async addAdmin(username) {
        return new Promise((resolve, reject) => {
            conn.query(
                "UPDATE bot_users SET admin = 1 WHERE telegram_username = ?;",
                [
                    username
                ],
                err => {
                    if (err) return reject(err);
                    return resolve();
                }
            )
        });
    }
}

module.exports = Database;