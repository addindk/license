var express = require('express');
var http = require('http');
var config = require('./config.json');
var socketIo = require('socket.io');
var jwt = require('jsonwebtoken');
var socketioJwt = require('socketio-jwt');
var serveStatic = require('serve-static');
var pgp = require('pg-promise')({});
var db = pgp(config.conString);
var jwt_secret = config.secret;

var app = express();
app.use(serveStatic('public', {
    'index': ['index.html']
}));

var server = http.createServer(app);
var sio = socketIo.listen(server);

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
                    db.manyOrNone("select id, name from users where customer=$1", [data]).then(function (res) {
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
    socket.on('licenses', function (data) {
        if (socket.hasOwnProperty('token')) {
            jwt.verify(socket.token, jwt_secret, function (err, decoded) {
                if (decoded.name === 'rune@addin.dk' || decoded.customer === data) {
                    db.manyOrNone("select id, name from product inner join customer_product on product.id=customer_product.product where customer_product.customer=$1", [data]).then(function (res) {
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
                    db.manyOrNone("select id, name from product inner join customer_product on product.id=customer_product.product where customer_product.customer=$1 and customer_product.product=$2", [data.customer, data.product]).then(function (res) {
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

                    var sql = "WITH range AS (SELECT $1::date AS start_date, $2::date AS end_date)" +
                        ", cte AS (" +
                        "SELECT * " +
                        "FROM   log, range r " +
                        "WHERE  \"timestamp\"::date  < r.end_date " +
                        "AND    \"timestamp\"::date >= r.start_date " +
                        "AND product = $3 " +
                        "AND \"user\" = $4 " +                        
                        "), " +
                        "sub as ( " +
                        "SELECT DISTINCT machine, \"timestamp\"::date AS log_date, \"timestamp\"::time AS log_time, -1 AS ct "+
                        "FROM cte " +
                        "WHERE message = 'Stop' " +
                        "UNION ALL " +
                        "SELECT DISTINCT machine, \"timestamp\"::date, \"timestamp\"::time, 1 "+
                        "FROM cte " +
                        "WHERE message = 'Start' " +
                        "), " +
                        "cte2 AS (" +
                        "SELECT log_date, sum(ct) OVER (PARTITION BY log_date ORDER BY log_date, log_time, ct) AS session_ct " +
                        "FROM   sub " +
                        ") " +
                        "SELECT log_date, max(session_ct) AS max_sessions " +
                        "FROM   cte2, range r " +
                        "GROUP  BY 1 " +
                        "ORDER  BY 1;";
                    db.manyOrNone(sql, [data.start, data.stop, data.product, data.customer]).then(function (res) {
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

                    var sql = "WITH range AS (SELECT $1::date AS start_date, $2::date AS end_date)," +
                        "cte AS (" +
                        "SELECT * " +
                        "FROM   log, range r " +
                        "WHERE  \"timestamp\"::date  < r.end_date " +
                        "AND    \"timestamp\"::date >= r.start_date " +
                        "AND product = $3 " +
                        "AND \"user\" = $4 " +
                        ")," +
                        "cte2 as (" +
                        "SELECT *, min(\"timestamp\") OVER (partition by machine ORDER BY \"timestamp\" rows between 1 following and unbounded following) " +
                        "FROM   cte" +
                        ")" +
                        "select login,machine,ip,timestamp as start,min as stop from cte2 " +
                        "where message = 'Start' " +
                        "order by machine, start;";
                    db.manyOrNone(sql, [data.start, data.stop, data.product, data.customer]).then(function (res) {
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
    
    /*
    WITH cte1 AS (
  SELECT extract(day from start) as day, start, stop
  FROM   log
  WHERE  product='f988e515-9d46-462b-beae-a119430e74f5'
  AND    "user"='5896b645-bd88-413a-b46a-bf95cee69d22'
  AND    start>='2015-01-01 0:0+0'
  AND    start<'2015-02-01 0:0+0'
  AND    message='Start'
),
cte2 as (
  SELECT lead(start, 1, 'infinity') OVER w < max(stop) OVER w AS range_end,
         day, start, stop,lead(start, 1, 'infinity') OVER w, max(stop) OVER w
  FROM   cte1
  WINDOW w AS (partition by day ORDER BY start)
),
cte3 as(
  select count(*), day, max 
  from cte2 
  --where range_end 
  group by day, max 
  order by day
)
select distinct day, max(count) over(partition by day) from cte3 order by day*/





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
                    socket.profile = decoded;
                    socket.emit('authenticated', {
                        token: data.t,
                        profile: decoded
                    });
                }

            });
        } else if (data.hasOwnProperty('n') && data.hasOwnProperty('p')) {
            db.one("SELECT password = crypt($1, password) as test, customer FROM users where id=$2", [data.p, data.n]).then(function (res) {
                if (res.test) {
                    socket.profile = {
                        name: data.n,
                        customer: res.customer
                    };
                    var token = jwt.sign(socket.profile, jwt_secret, {
                        expiresIn: 60 * 60 * 24
                    });
                    socket.emit('authenticated', {
                        token: token,
                        profile: socket.profile
                    });
                } else {
                    socket.emit('unathenticated', err);
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
        if (socket.hasOwnProperty('profile')) {
            delete socket.profile;
        }
        socket.emit('unauthenticated', 'logout');
    });
});

server.listen(3000, function () {
    console.log('listening on http://localhost:3000');
});
