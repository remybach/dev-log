'use strict';

const Handlers = require('./handlers');
const Config = require('./config');

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

server.bind({
  config: Config,
  templates: {
    add: require('./templates/add.marko'),
    logs: require('./templates/logs.marko'),
    search: require('./templates/search.marko')
  },
  utils: require('./utils')
});

/*===== Plugins =====*/

server.register({
  register: require('hapi-mongodb'),
  options: {
    url: Config.dbUrl
  }
}, (err) => {
  if (err) throw err;
});
server.register(Inert, () => {});

/*===== Routes =====*/

server.route({
  method: 'GET',
  path: '/',
  handler: Handlers.landing
});

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