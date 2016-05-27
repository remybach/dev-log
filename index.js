'use strict';

const config = require('./config');
const utils = require('./utils');

require('marko/node-require').install();

const Hapi = require('hapi');
const Inert = require('inert');
const Path = require('path');
const MongoDB = require('mongodb');
const MongoClient = MongoDB.MongoClient;
const ObjectId = MongoDB.ObjectID;
const moment = require("moment");
const server = new Hapi.Server({
  connections: {
    routes: {
      files: {
        relativeTo: Path.join(__dirname, 'public')
      }
    }
  }
});

/*===== Marko Templates =====*/

const addTemplate = require('./templates/add.marko');
const logsTemplate = require('./templates/logs.marko');
const searchTemplate = require('./templates/search.marko');

/*===== Connect =====*/

server.connection({ port: process.env.PORT || 1236 });
server.register(Inert, () => {});

/*===== Refactor/DRY up =====*/

let addEntry = (message, callback) => {
  MongoClient.connect(config.dbUrl, (err, db) => {
    if (err) throw err;

    db.collection('logs').insertOne({
      timestamp: new MongoDB.Timestamp(0, Math.floor(new Date().getTime() / 1000)),
      formattedDate: moment().format("Do MMM YYYY"),
      formattedTime: moment().format("HH:MM"),
      message: message
    }, (err, result) => {
      if (err) throw err;
      callback();
      db.close();
    });
  });
}

/*===== Routes =====*/

server.route({
  method: 'PUT',
  path: '/log',
  handler: (req, reply) => {
    if (req.payload.msg) {
      console.log('Received message: ' + req.payload.msg);

      addEntry(req.payload.msg, () => {
        reply("New log entry added.");
      });
    } else {
      reply("Oops. You forgot to add a message to log!");
    }

  }
});

server.route({
  method: 'POST',
  path: '/log',
  handler: (req, reply) => {
    if (req.payload.msg) {
      console.log('Received message: ' + req.payload.msg);

      addEntry(req.payload.msg, () => {
        reply().redirect("/logs");
      });
    } else {
      reply(addTemplate.stream({ error: "Oops. You forgot to add a message to log!" })).type('text/html');
    }

  }
});

server.route({
  method: 'DELETE',
  path: '/log/{id}',
  handler: (req, reply) => {

    MongoClient.connect(config.dbUrl, (err, db) => {
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

  }
});

server.route({
  method: 'GET',
  path: '/',
  handler: (req, reply) => {
    reply(addTemplate.stream()).type('text/html');
  }
});

server.route({
  method: 'GET',
  path: '/logs',
  handler: (req, reply) => {

    let page = req.params.page || 1;

    MongoClient.connect(config.dbUrl, (err, db) => {
      if (err) throw err;

      let entries = db.collection('logs');

      entries.aggregate([
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

          if (utils.isJSON(req)) {
            reply(docs);
          } else {
            reply(logsTemplate.stream({ logs: docs })).type('text/html');
          }

          db.close();
        });
      
    });

  }
});

server.route({
  method: 'POST',
  path: '/search',
  handler: (req, reply) => {

    MongoClient.connect(config.dbUrl, (err, db) => {
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

          if (utils.isJSON(req)) {
            reply(docs);
          } else {
            reply(searchTemplate.stream({ logs: docs, q: req.payload.q })).type('text/html');
          }
      });

    });

  }
});

/*===== Public Assets =====*/

server.route({
    method: 'GET',
    path: '/public/{param*}',
    handler: {
        directory: {
            path: '.',
            redirectToSlash: true,
            index: true
        }
    }
});

/*===== Start =====*/

server.start((err) => {
    if (err) throw err;

    console.log('Server running at:', server.info.uri);
});