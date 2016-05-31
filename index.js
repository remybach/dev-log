'use strict';

const Handlers = require('./handlers');

require('marko/node-require').install();

const Hapi = require('hapi');
const Inert = require('inert');
const Path = require('path');

const server = new Hapi.Server({
  connections: {
    routes: {
      files: {
        relativeTo: Path.join(__dirname, 'public')
      }
    }
  }
});

/*===== Connect =====*/

server.connection({ port: process.env.PORT || 1236 });
server.register(Inert, () => {});
server.bind({
  config: require('./config'),
  templates: {
    add: require('./templates/add.marko'),
    logs: require('./templates/logs.marko'),
    search: require('./templates/search.marko')
  },
  utils: require('./utils')
});

/*===== Routes =====*/

server.route({
  method: 'PUT',
  path: '/log',
  handler: Handlers.addEntry
});

server.route({
  method: 'POST',
  path: '/log',
  handler: Handlers.addEntry
});

server.route({
  method: 'DELETE',
  path: '/log/{id}',
  handler: Handlers.deleteEntry
});

server.route({
  method: 'GET',
  path: '/',
  handler: Handlers.landing
});

server.route({
  method: 'GET',
  path: '/logs',
  handler: Handlers.getLogs
});

server.route({
  method: 'POST',
  path: '/search',
  handler: Handlers.search
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