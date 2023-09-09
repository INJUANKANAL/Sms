const ms = require('ms');
const Database = require('./database');
const Config = require('./config');
const config = new Config();

const request = require('request');
const querystring = require("querystring");


const sendMessage = (id, message) => {
    const baseUrl = `https://api.telegram.org`;
    const token = config.get('telegram', 'token');
    const qs = querystring.stringify({
        chat_id: id,
        text: message
    });
    request.post(`${baseUrl}/bot${token}/sendMessage?${qs}`, (err, response, body) => {
        if (err) console.error(err);
        console.log(response)
    });
}

module.exports = function(wallet) {
    const wally = config.get('qiwi', 'wallet');
    setInterval(() => {
        wallet.getOperationHistory(wally, {rows: 50, operation: "IN"}, async (err, operations) => {
            if (err) {
                return;
            }
            for (let i = 0; i < operations.data.length; i++) {
                if (operations.data[i]["comment"] != null) {
                    if (operations.data[i].total.currency != 643) continue;
                    const comment = operations.data[i]['comment'];
                    const trans = operations.data[i].txnId;
                    console.log(comment)
                    if (isNaN(comment)) continue;
                    const userId = parseInt(comment);
                    try {
                        const user = await Database.findUser(userId, true);
                        if (user.last_transaction < trans) {
                            await Database.setTransactionId(
                                user.telegram_id,
                                operations.data[i].txnId
                            );
                            await Database.addMoney(
                                user.telegram_id,
                                parseInt(operations.data[i].total.amount)
                            );
                            sendMessage(userId, `✅ Добавлено ${operations.data[i].total.amount} рублей на баланс`);
                        }
                    } catch(ex) {
                        console.error(ex);
                    }
    
                }    
            }
            //txnId <- айди транзы
        });
    }, ms('5s'));
}