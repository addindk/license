var express = require('express');
var http = require('http');
var config = require('./config.json');

var jwt = require('jsonwebtoken');

//var serveStatic = require('serve-static');
var pgp = require('pg-promise')({});
var db = pgp(config.conString);
var jwt_secret = config.secret;
var iconv = require('iconv-lite');
var basicAuth = require('basic-auth');
var moment = require('moment');
var app = express();
var server = http.createServer(app);
var socketIo = require('socket.io')(server, {path: '/lm/socket.io'});
var sio = socketIo.listen(server);
var socketioJwt = require('socketio-jwt');
app.use(express.static('www'));
/*app.use(serveStatic(__dirname + '/www', {
    'index': ['index.html']
}));*/
var sql = function (file) {
    var relativePath = './sql/';
    return new pgp.QueryFile(relativePath + file, { minify: true });
}
var sqlProvider = {
    // external queries for Users:
    users: {
        authorize: sql('users/authorize.sql')
    },
    // external queries for Loging:
    log: {
        peak: sql('log/peak.sql'),
        daily: sql('log/daily.sql'),
        daily_product: sql('log/daily_product.sql')
    },
    customer: {
        users: sql('customer/users.sql'),
        update_license: sql('customer/update-license.sql'),
        license: sql('customer/license.sql'),
        licenses: sql('customer/licenses.sql')
    }
};
var auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
    }
    var user = basicAuth(req);
    if (user) {
        db.one(sqlProvider.users.authorize, user).then(function (res) {
            if (res.test) {
                req.user = { name: user.name, customer: res.customer };
                next();
            } else {
                return unauthorized(res);
            }
        }).catch(function (err) {
            return unauthorized(res);
        })
    } else if (req.query.token) {
        jwt.verify(req.query.token, jwt_secret, function (err, decoded) {
            if (!err) {
                req.user = decoded;
                next();
            } else {
                return unauthorized(res);
            }
        });
    } else {
        return unauthorized(res);
    }
};

app.get('/daily/:customer/:product/:start', auth, function (req, res) {
    console.log(req.user);
    if (req.user.name === 'rune@addin.dk' || req.user.customer === req.params.customer) {
        var stop = moment(req.params.start).add(1, 'day');
        var stopJSON = stop.clone().endOf('day')._d.toJSON();
        var options = { customer: req.params.customer, product: req.params.product, start: req.params.start, stop: stop.format('YYYY-MM-DD') };
        db.manyOrNone(sqlProvider.log.daily_product, options).then(function (data) {
            var csv = "\"product\";\"machine\";\"login\";\"ip\";\"start\";\"stop\"";
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                csv += "\n\"" + row.product + "\";\"" + row.machine + "\";\"" + row.login + "\";\"" + row.ip + "\";";
                if (row.start) {
                    csv += "\"" + row.start.toJSON() + "\";";
                } else {
                    csv += ";"
                }
                if (row.stop) {
                    csv += "\"" + row.stop.toJSON() + "\"";
                } else {
                    csv += "\"" + stopJSON + "\"";
                }
            }
            res.header('Content-Type', 'text/csv');
            res.send(iconv.encode(csv, 'win1252'));
        }).catch(function (err) {
            res.json(err);
        });
    } else {
        res.send("unauthorized");
    }
});





var authorize = function () {
    var auth = {
        secret: jwt_secret,
        success: function (data, accept) {
            if (data.request) {
                accept();
            } else {
                accept(null, true);
            }
        },
        fail: function (error, data, accept) {
            if (data.request) {
                accept(error);
            } else {
                accept(null, false);
            }
        }
    };

    return function (data, accept) {
        var token;
        var req = data.request || data;
       
        //get the token from query string
        if (req._query && req._query.token) {
            token = req._query.token;
        }
        else if (req.query && req.query.token) {
            token = req.query.token;
        } else if (data.token) {
            token = data.token;
        }
        if (!token) {
            return auth.success({}, accept);
        }
        jwt.verify(token, auth.secret, function (err, decoded) {
            if (!err) {
                data.decoded_token = decoded;
            }
            auth.success(data, accept);
        });
    };
};
var testExpire = function (socket) {
    if (socket.hasOwnProperty('decoded_token')) {
        console.log(Date.now() / 1000, socket.decoded_token);
        if (Date.now() / 1000 > socket.decoded_token.exp) {
            socket.emit('unauthenticated');
            console.log('unauthenticated');
            return false;
        }
        return true;
    }
    return false;
}

//sio.use(authorize());
sio.sockets.on('connection', function (socket) {
    /*if (socket.hasOwnProperty('decoded_token')) {
        socket.emit('authenticated', { token: socket.token, profile: socket.decoded_token });
    }*/
    socket.on('addUser', function (data) {
        db.one("insert into users(id,name,password,customer) values($1,$2,crypt($3, gen_salt('md5')),$4)", [data.email, data.name, data.password, data.customer]).then(function (res) {
            socket.emit('addUser', res);
        }).catch(function (err) {
            socket.emit('error', err);
        });
    });
    socket.on('users', function (data) {
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (decoded.name === 'rune@addin.dk' || decoded.customer === data) {
                    db.manyOrNone(sqlProvider.customer.users, [data]).then(function (res) {
                        socket.emit('users', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('update_license', function (data) {
        console.log('update_license', data);
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (decoded.name === 'rune@addin.dk' || decoded.customer === data.customer) {
                    db.none(sqlProvider.customer.update_license, data).then(function (res) {
                        socket.emit('update_license', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('licenses', function (data) {
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (decoded.name === 'rune@addin.dk' || decoded.customer === data) {
                    db.manyOrNone(sqlProvider.customer.licenses, [data]).then(function (res) {
                        socket.emit('licenses', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('license', function (data) {
        console.log(data);
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (data.product && data.customer && (decoded.name === 'rune@addin.dk' || decoded.customer === data.customer)) {
                    db.manyOrNone(sqlProvider.customer.license, [data.customer, data.product]).then(function (res) {
                        socket.emit('license', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('peak', function (data) {
        console.log(data);
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (data.product && data.customer && (decoded.name === 'rune@addin.dk' || decoded.customer === data.customer)) {
                    db.manyOrNone(sqlProvider.log.peak, data).then(function (res) {
                        socket.emit('peak', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('day', function (data) {
        console.log(data);
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (data.product && data.customer && (decoded.name === 'rune@addin.dk' || decoded.customer === data.customer)) {
                    db.manyOrNone(sqlProvider.log.daily, data).then(function (res) {
                        socket.emit('day', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('customers', function (data) {
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (decoded.name === 'rune@addin.dk') {
                    db.manyOrNone("select id, name from customer").then(function (res) {
                        socket.emit('customers', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('customer', function (data) {
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (decoded.name === 'rune@addin.dk' || decoded.customer === data) {
                    db.oneOrNone("select id, name from customer where id=$1", [data]).then(function (res) {
                        socket.emit('customer', res);
                    }).catch(function (err) {
                        socket.emit('error', err);
                    });
                } else {
                    socket.emit('unathenticated', 'permission');
                }
            });
        } else {
            socket.emit('unathenticated', 'user');
        }
    });
    socket.on('authenticate', function (data) {
        if (data.hasOwnProperty('t')) {
            jwt.verify(data.t, jwt_secret, function (err, decoded) {
                if (err) {
                    socket.emit('unathenticated', err);
                }
                else {
                    socket.token = data.t;

                    socket.emit('authenticated', {
                        token: data.t,
                        profile: decoded
                    });
                }

            });
        } else if (data.hasOwnProperty('n') && data.hasOwnProperty('p')) {
            db.one(sqlProvider.users.authorize, { pass: data.p, name: data.n }).then(function (res) {
                if (res.test) {
                    var profile = {
                        name: data.n,
                        customer: res.customer
                    };
                    var token = jwt.sign(profile, jwt_secret, {
                        expiresIn: 60 * 60 * 24
                    });
                    socket.token = token;
                    socket.emit('authenticated', {
                        token: token,
                        profile: profile
                    });
                } else {
                    socket.emit('unathenticated');
                }
            }).catch(function (err) {
                socket.emit('unathenticated', err);
            })
        }
    });
    socket.on('unauthenticate', function (data) {
        if (socket.hasOwnProperty('token')) {
            delete socket.token;
        }
        socket.emit('unauthenticated', 'logout');
    });
});

server.listen(3000, function () {
    console.log('listening on http://localhost:3000');
});
