var config = require('./config.json');
var license = require('nano')(config.couchdb.url + '/_users');
var pg = require('pg');
var conString = "postgres://localhost/license";

//var server = http.createServer(function(req, res) {

// get a pg client from the connection pool
pg.connect(conString, function (err, client, done) {

    var handleError = function (err) {
        // no error occurred, continue with the request
        if (!err) return false;

        // An error occurred, remove the client from the connection pool.
        // A truthy value passed to done will remove the connection from the pool
        // instead of simply returning it to be reused.
        // In this case, if we have successfully received a client (truthy)
        // then it will be removed from the pool.
        if (client) {
            done(client);
        }
        console.log(err);
        //res.writeHead(500, {'content-type': 'text/plain'});
        //res.end('An error occurred');
        return true;
    };

    // handle an error from the connection
    if (handleError(err)) return;
    license.view('users', 'company', function (err, body) {
        if (!err) {

            body.rows.forEach(function (row) {
                //console.log(row);

                license.get(row.id, function (err, body) {
                    if (!err) {


                        client.query('INSERT INTO customer (id,name) VALUES ($1,$2)', [body.name, body.company], function (err, result) {

                            if (err) {
                                console.log(row);
                                console.log(err);
                                return;
                            }



                        });
                        body.roles.forEach(function (role) {
                            client.query('INSERT INTO customer_product (customer,product) VALUES ($1,$2)', [body.name, role], function (err, result) {

                                if (err) {
                                    console.log(row);
                                    console.log(err);
                                    return;
                                }


                            });
                        });
                    }

                });

            });

        }

    });
});
