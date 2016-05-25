'use strict';

const config = require('./config');
const utils = require('./utils');

require('marko/node-require').install();

const Hapi = require('hapi');
const Inert = require('inert');
const Path = require('path');
const MongoDB = require('mongodb');
const MongoClient = MongoDB.MongoClient;
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

const logsTemplate = require('./templates/logs.marko');
const searchTemplate = require('./templates/search.marko');

/*===== Connect =====*/

server.connection({ port: process.env.PORT || 1236 });
server.register(Inert, () => {});

/*===== Routes =====*/

server.route({
  method: 'PUT',
  path: '/log',
  handler: (req, reply) => {
    if (req.payload.msg) {
      console.log('Received message: ' + req.payload.msg);

      MongoClient.connect(config.dbUrl, (err, db) => {
        if (err) throw err;

        db.collection('logs').insertOne({
          timestamp: new MongoDB.Timestamp(0, Math.floor(new Date().getTime() / 1000)),
          formattedDate: moment().format("Do MMM YYYY"),
          formattedTime: moment().format("HH:MM"),
          message: req.payload.msg
        }, (err, result) => {
          if (err) throw err;
          reply("New log entry added.");
          db.close();
        });
      });
    } else {
      reply("Oops. You forgot to add a message to log!");
    }

  }
});

server.route({
  method: 'GET',
  path: '/logs',
  handler: (req, reply) => {

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
          }
        ]).toArray(function(err, docs) {
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