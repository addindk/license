var config = require('./config.json');
var fs = require('fs');
var license = require('nano')(config.couchdb.url + '/license');
var pgp = require('pg-promise')({});
var db = pgp(config.conString);
var moment = require('moment');
var current = 0;
var next = 'next.json';
var limit = 50000;
var sql = function (file) {
    var relativePath = './sql/';
    return new pgp.QueryFile(relativePath + file, { minify: true });
}
var sqlProvider = {
    copy: sql('log/copy.sql')
};
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

    license.changes(options, function (err, body) {
        console.log(body.results.length);
        if (body.results.length > 0) {
            var file = 'log.csv';
            fs.writeFileSync(file, "id;login;machine;status;product_id;product_version;customer_id;log_timestamp;ip", { mode: '0o666' });
            for (var i = 0; i < body.results.length; i++) {
                var row = body.results[i];
                var doc = row.doc;
                writeDoc(file, doc);
            }
            db.none(sqlProvider.copy, { file: __dirname + '/' + file }).then(function (res) {
                fs.writeFile(next, JSON.stringify({ since: body.last_seq }), function (err, data) {
                    get({
                        since: body.last_seq,
                        limit: limit,
                        include_docs: true
                    });
                });
            }).catch(function (err) {
                console.log(err);
            })
        }
    });
};

fs.stat(next, function (err, stats) {
    if (err) {
        get({
            limit: limit,
            include_docs: true
        });
    } else {
        fs.readFile(next, 'utf8', function (err, data) {
            if (!err) {
                var doc = JSON.parse(data);
                get({
                    since: doc.since,
                    limit: limit,
                    include_docs: true
                });
            }
        })
    }
});