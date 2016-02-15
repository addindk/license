var express = require('express');
var http = require('http');
var config = require('./config.json');
var pgp = require('pg-promise')({});
var db = pgp(config.conString);
var app = express();
var basicAuth = require('basic-auth');
var bodyParser = require('body-parser');
var uuid = require('uuid');
app.use(bodyParser.json());
app.set('trust proxy', ['10.133.34.15']);

var sql = function (file) {
    var relativePath = './sql/';
    return new pgp.QueryFile(relativePath + file, { minify: true });
}
var sqlProvider = {
    authorize: sql('users/authorize.sql'),
    product: sql('customer/product.sql'),
    log: sql('log/log.sql'),
    add: sql('log/add.sql')
};

app.put('/:id', function (req, res) {
    new Promise(function (resolve, reject) {
        var user = basicAuth(req);
        if (user) {
            db.one(sqlProvider.authorize, user).then(function (res) {
                if (res.test) {
                    resolve({ product: req.params.id, customer: res.customer });
                } else {
                    reject();
                }
            });
        } else {
            reject();
        }
    }).then(function (data) {
        return db.any(sqlProvider.has_product, data);
    }).then(function (data) {
        if (data.length === 1) {
            var status = 1;
            if (req.body.message && req.body.message === 'Stop') {
                status = -1;
            }
            var doc = {
                id: uuid.v1(),
                login: req.body.login,
                machine: req.body.mashine,
                status: status,
                product_id: data[0].product,
                product_version: req.body.version,
                customer_id: data[0].customer,
                log_timestamp: new Date(),
                ip: req.ip
            }
            return db.none(sqlProvider.add, doc);
        } else {
            return Promise.reject();
        }
    }).then(function () {
        res.send('ok');
    }).catch(function () {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        res.send(401);
    })
});

app.listen(4001, function () {
    console.log('listening on http://localhost:4001');
});