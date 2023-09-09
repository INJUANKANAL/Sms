const request = require('request');
module.exports = function QiwiMiniLib(token) {

    apiUri = "https://edge.qiwi.com";
    qtoken = token;

    apiHeaders = {
        'Accept': 'application/json',
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + qtoken
    }

    this.changeToken = function (newToken) {
        qtoken = newToken;
        apiHeaders.Authorization = 'Bearer ' + newToken;
    }

    this.getOperationHistory = function (wallet, requestOptions, callback) {
        const options = {
            method: 'GET',
            url: apiUri+'/payment-history/v2/persons/'+wallet+'/payments',
            headers: apiHeaders,
            qs: requestOptions
        };

        get(options, callback);
    }
    
    function get(options, callback) {
        request(options, (err, res, body) => {
            if (err) { return callback(err, null); }

            console.log("Статус код "+res.statusCode);
            if (res.statusCode == 401) return callback("Unauthorized, возможно токен просрочен", null);
        
            return callback(null, JSON.parse(body));
        });
    }
}
