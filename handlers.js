'use strict';

const moment = require("moment");
const MongoDB = require('mongodb');
const MongoClient = MongoDB.MongoClient;
const ObjectId = MongoDB.ObjectID;

let groupPipeline = [{
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
                    }];

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

let getLogsWithPagination = function(req, reply, pipeline, template, extraData) {
  let page = Number(req.params.page || req.query.page) || 1;

  MongoClient.connect(this.config.dbUrl, (err, db) => {
    if (err) throw err;

    let entries = db.collection('logs').aggregate(pipeline);

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

        let results = Object.assign({ logs: docs, pagination: pagination }, extraData || {});

        if (this.utils.isJSON(req)) {
          reply(results);
        } else {
          reply(template.stream(results)).type('text/html');
        }

        db.close();
      });
    });
  });
};

module.exports.getLogs = function(req, reply) {
  getLogsWithPagination.call(this, req, reply, groupPipeline, this.templates.logs);
};

module.exports.search = function(req, reply) {
  console.log("searching for '" + req.payload.q + "'");

  let pipeline = [{ $match: { $text: { $search: req.payload.q } } }].concat(groupPipeline);

  getLogsWithPagination.call(this, req, reply, pipeline, this.templates.search, { q: req.payload.q });
}