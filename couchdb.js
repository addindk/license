var express = require('express');
var http = require('http');
var config = require('./config.json');
var pgp = require('pg-promise')({});
var db = pgp(config.conString);
var app = express();
var basicAuth = require('basic-auth');
var uuid = require('uuid');
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

app.set('trust proxy', ['10.133.34.15']);
app.put('/:id', function (req, res) {
    req.body = '';
    req.on('data', function (chunk) {
        req.body += chunk;
    });
    req.on('end', function () {
        req.body = JSON.parse(req.body);
        new Promise(function (resolve, reject) {
            var user = basicAuth(req);
            if (user && req.body.product) {
                resolve({ customer: user.name, product: req.body.product });
            } else {
                reject();
            }
        }).then(function (data) {
            return db.any(sqlProvider.product, data);
        }).then(function (data) {
            if (data.length === 1) {
                var status = 1;
                if (req.body.message && req.body.message === 'Stop') {
                    status = -1;
                }
                var doc = {
                    id: uuid.v1(),
                    login: req.body.login,
                    machine: req.body.machine,
                    status: status,
                    product_id: req.body.product,
                    product_version: req.body.version,
                    customer_id: req.params.id,
                    log_timestamp: new Date(),
                    ip: req.ip
                }
                console.log(doc);
                return db.none(sqlProvider.add, doc);
            } else {
                return Promise.reject();
            }
        }).then(function () {
            res.send('ok');
        }).catch(function (err) {
            console.log('err', err);
            res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
            res.send(401);
        });
    });
});

app.listen(4001, function () {
    console.log('listening on http://localhost:4001');
});