const Config = require('./config');
const config = new Config();
const request = require('requests');
const Database = require('./database');
const querystring = require('querystring');
const got = require('got');

class API {
    static async get(method, params={}) {
        return new Promise(async (resolve, reject) => {
            const api_key = config.get('service', 'api_key');
            const domen = config.get('service', 'domen');
            const qs = Object.assign({
                api_key: api_key,
                action: method
            }, params);
            const response = await got(domen + '/stubs/handler_api.php?' + querystring.encode(qs));
            return resolve(response.body);
        }); 
    }
    
    static async getJSON(method, params={}) {
        return new Promise(async (resolve, reject) => {
            try {
                const g = await API.get(method, params);
                return resolve(JSON.parse(g));    
            } catch(ex) {
                return reject(ex);
            }
        });
    }

    static async getNumber(service, country) {
        return new Promise(async(resolve, reject) => {
            const req = await API.get("getNumber", {service, country});
            const errors = {
                'NO_NUMBERS': "Нет доступных номеров",
                'NO_BALANCE': 'Денег нет, но вы держитесь',
                'BAD_SERVICE': 'Некорректный сервис'
            };
            if (req in errors) {
                return reject(errors[req]);
            }
            const [access_number, id, number] = req.split(":");
            const operation_id = parseInt(id);
            return resolve({
                operation_id,
                number
            });    
        });
    }

    static async cancelActivation(id) {
        await API.get("setStatus", {id, status: 8}); 
    }

    static async smsSent(id) {
        return API.get("setStatus", {id, status: 1}); 
    }

    static async requestAnotherCode(id) {
        await API.get("setStatus", {id, status: 3}); 
    }
    static async completeActivation(id) {
        await API.get("setStatus", {id, status: 6}); 
    }

    static async getStatus(id) {
        return new Promise(async(resolve, reject) => {
            const req = await API.get("getStatus", {id});
            const body = req.split(':');
            console.log(body)
            if (body[0] == 'STATUS_OK')
                return resolve(body[1]);
            else if (body[0] == 'STATUS_CANCEL')
                return resolve("none")
            return reject();
        });
    }


    static async getCountriesButtons(_service, _countries) {
        return new Promise(async (resolve, reject) => {
            try {
                const g = await API.getJSON('getPrices', {
                    service: _service
                });
                return resolve(_countries.map(country => {
                   const kek = g[country['id']][_service];
                   if (typeof kek === 'undefined') return null;
                   return Object.assign(country, {
                       price: kek['cost'],
                       count: kek['count']
                   });
                }).filter(it => it != null));
            } catch(ex) {
                console.error(ex);
            }
        });
    }

    static async getPricesButtons(_services) {
        return new Promise(async (resolve, reject) => {
            try {
                return resolve(_services.map(async service => {
                    try {
                        const g = await API.getJSON('getPrices', {
                            service: service['id']
                        });
                        if (typeof g['0'][service.id]['cost'] === 'undefined') return null;
                        return Object.assign(
                            service,
                            {
                                count: g['0'][service.id]['count'],
                                price: g['0'][service.id]['cost']
                            }
                        )
                    } catch(ex) {
                        console.error(ex);
                    }
                }).filter(it => it != null));
            } catch(ex) {
                return reject(ex);
            }
        });
    }
}

module.exports = API;