var config = require('./config.json');
var license = require('nano')(config.couchdb.url + '/license');
var pg = require('pg');

var conString = "postgres://postgres@localhost/license";

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

    license.list({
        /*limit: 100000,*/
        /*skip: 40000,*/
        include_docs: true
    }, function (err, body) {
        if (!err) {
            body.rows.forEach(function (row) {
                //console.log(row);
                if (row.doc.type && row.doc.type === 'log') {

                    client.query('INSERT INTO log (id,rev,login,machine,message,product,version,"user","timestamp",ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [row.doc['_id'], row.doc['_rev'], row.doc.timestamp ? row.doc.login : row.doc.user, row.doc.machine, row.doc.message, row.doc.product, row.doc.version, row.doc.timestamp ? row.doc.user : null, row.doc.timestamp || row.doc.datetime, row.doc.ip], function (err, result) {

                        if (err) {
                            console.log(row);
                            console.log(err);
                            return;
                        }


                    });
                }
            });
        }
    });

    // record the visit

});
