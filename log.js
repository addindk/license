var config = require('./config.json');
var license = require('nano')(config.couchdb.url + '/license');
var pg = require('pg');

var conString = "postgres://postgres:postgres@localhost/license";


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

    license.list({
        /*limit: 100000,*/
        /*skip: 40000,
        include_docs: true*/
    }, function (err, body) {
        if (!err) {
            console.log('rows: ' + body.rows.length);
            var current = 0;
            var insert = function () {
                console.log(current);
                if (current < body.rows.length) {
                    var row = body.rows[current];
                    license.get(row.id, function (doc) {
                        //console.log(row);
                        if (doc.type && doc.type === 'log') {

                            client.query('INSERT INTO log (id,rev,login,machine,message,product,version,"user","timestamp",ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [doc['_id'], doc['_rev'], doc.timestamp ? doc.login : doc.user, doc.machine, doc.message, doc.product, doc.version, doc.timestamp ? doc.user : null, doc.timestamp || doc.datetime, doc.ip], function (err, result) {

                                if (err) {
                                    console.log(row);
                                    console.log(err);

                                }
                                current++;
                                insert();

                            });
                        } else {
                            current++;
                            insert();
                        }
                    });
                }
            };
            insert();
        }
    });

    // record the visit

});
