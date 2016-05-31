'use strict';

const moment = require("moment");
const MongoDB = require('mongodb');
const MongoClient = MongoDB.MongoClient;
const ObjectId = MongoDB.ObjectID;

module.exports.addEntry = function(req, reply) {
  if (req.payload.msg) {
    console.log('Received message: ' + req.payload.msg);

    MongoClient.connect(this.config.dbUrl, (err, db) => {
      if (err) throw err;

      db.collection('logs').insertOne({
        timestamp: new MongoDB.Timestamp(0, Math.floor(new Date().getTime() / 1000)),
        formattedDate: moment().format("Do MMM YYYY"),
        formattedTime: moment().format("HH:MM"),
        message: req.payload.msg
      }, (err, result) => {
        if (err) throw err;
        
        if (/PUT/i.test(req.method)) {
          reply("New log entry added.");
        } else {
          reply().redirect("/logs");
        }

        db.close();
      });
    });
  } else {
    reply("Oops. You forgot to add a message to log!");
  }
};

module.exports.deleteEntry = function(req, reply) {
  MongoClient.connect(this.config.dbUrl, (err, db) => {
    if (err) throw err;

    db.collection('logs').deleteOne({
      _id: new ObjectId(req.params.id)
    }, (err, results) => {
      if (err) throw err;

      let result = results.result;

      if (result.ok && result.n > 0) {
        reply().redirect("/logs");
      } else {
        reply("Couldn't delete that for some reason.");
      }
      
      db.close();
    });
  });
};

module.exports.landing = function(req, reply) {
  reply(this.templates.add.stream()).type('text/html');
};

module.exports.getLogs = function(req, reply) {
  let page = Number(req.params.page || req.query.page) || 1;

  MongoClient.connect(this.config.dbUrl, (err, db) => {
    if (err) throw err;

    let entries = db.collection('logs').aggregate([
        {
          $group: {
            _id: {
              year:{$year:"$timestamp"},
              month:{$month:"$timestamp"},
              day:{$dayOfMonth:"$timestamp"}
            },
            entries: {
              $push: "$$ROOT"
            }
          }
        }]);

    entries.toArray((err, docs) => {
        if (err) throw err;

        let numPages = Math.ceil(docs.length / this.config.pageSize);
        let pagination;

        if (numPages > 1) {
          pagination = {
            numPages: numPages
          };

          if (page > 1) {
            pagination.prev = page - 1;
          }
          if (page + 1 <= numPages) {
            pagination.next = page + 1;
          }
        }

        entries.sort({ _id: -1 });
        entries.skip((page - 1) * this.config.pageSize);
        entries.limit(this.config.pageSize);

        entries.toArray((err, docs) => {
            if (err) throw err;

            let results = { logs: docs, pagination: pagination };

            if (this.utils.isJSON(req)) {
              reply(results);
            } else {
              reply(this.templates.logs.stream(results)).type('text/html');
            }

            db.close();
          });
      });
    
  });
};

module.exports.search = function(req, reply) {
  MongoClient.connect(this.config.dbUrl, (err, db) => {
    if (err) throw err;

    console.log("searching for '" + req.payload.q + "'");

    let entries = db.collection('logs');

    entries.aggregate([
        { $match: { $text: { $search: req.payload.q } } },
        {
          $group: {
            _id: "$formattedDate",
            entries: {
              $push: "$$ROOT"
            }
          }
        },
        { $sort: { timestamp: 1 } }//,
        // { $skip: (page - 1) * 5 },
        // { $limit: 5 }
      ]).toArray((err, docs) => {
        if (err) throw err;

        if (this.utils.isJSON(req)) {
          reply(docs);
        } else {
          reply(this.templates.search.stream({ logs: docs, q: req.payload.q })).type('text/html');
        }
    });

  });
}