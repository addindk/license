var config = require('./config.json');
var fs = require('fs');
var license = require('nano')(config.couchdb.url + '/license');
var pg = require('pg');
var moment = require('moment');

var conString = "postgres://postgres:postgres@localhost/license";
var limit = 50000;
var writeDoc = function (file, doc) {
    if (doc.type && doc.type === 'log') {
        var s = "\n\"" + doc['_id'] + "\";";
        //s += "\"" + doc['_rev'] + "\";";
        if (doc.timestamp) {
            s += "\"" + doc.login + "\";";
        } else {
            s += "\"" + doc.user + "\";";
        }
        if (doc.machine) {
            s += "\"" + doc.machine + "\";";
        } else {
            s += ";";
        }
        if (doc.message) {
            if (doc.message === 'Start') {
                s += "1;";
            } else {
                s += "-1;";
            }
        } else {
            s += ";";
        }
        if (doc.product) {
            s += "\"" + doc.product + "\";";
        } else {
            s += ";";
        }
        if (doc.version) {
            s += "\"" + doc.version + "\";";
        }
        else {
            s += ",";
        }
        if (doc.timestamp) {
            s += "\"" + doc.user + "\";";
        } else {
            s += ";";
        }
        if (doc.timestamp) {
            s += "\"" + doc.timestamp + "\";";
        } else if (doc.datetime) {
            var dt = moment.utc(doc.datetime, "DD-MM-YYYY HH:mm:ss");
            s += "\"" + dt.format() + "\";";
        } else {
            s += ";";
        }
        if (doc.ip) {
            s += "\"" + doc.ip + "\"";
        }
        fs.appendFileSync(file, s);
    }
}
var get = function (options) {
    var file = 'log' + current + '.csv';
    fs.writeFileSync(file, "id;login;machine;status;product_id;product_version;customer_id;log_timestamp;ip");
    license.list(options, function (err, body) {
        console.log(body.rows.length);
        if (body.rows.length > 1) {
            for (var i = 0; i < body.rows.length - 1; i++) {
                var row = body.rows[i];
                var doc = row.doc;
                writeDoc(file, doc);
            }
            current++;
            get({
                startkey_docid: body.rows[body.rows.length - 1].id,
                limit: limit,
                include_docs: true
            });
        } else if (body.rows.length === 1) {
            writeDoc(file, body.rows[0].doc);
        }
    });
};
var current = 0;
get({
    limit: limit,
    include_docs: true
});
//})
/*
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
        //limit: 1000,
        //skip: 40000,
        //include_docs: true
    }, function (err, body) {
        if (!err) {
            console.log('rows: ' + body.rows.length);
            var current = 0;
            var insert = function () {
                console.log(current);
                if (current < body.rows.length) {
                    var row = body.rows[current];
                    license.get(row.id, function (err, doc) {
                        if (err) {
                            console.log(err);
                            console.log(row);
                            current++;
                            insert();
                        } else {
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
                        }
                    });
                }
            };
            insert();
        }
    });
});
*/