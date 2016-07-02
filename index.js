'use strict';

const Handlers = require('./handlers');
const Config = require('./config');

const Bcrypt = require('bcrypt');
const Hapi = require('hapi');
const Basic = require('hapi-auth-basic');
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
server.register([
  require('inert'),
  require('vision')
], (err) => {

  server.views({
    engines: {
      hbs: require('handlebars')
    },
    helpersPath: './views/helpers',
    isCached: false,
    layout: true,
    layoutPath: './views/layouts',
    partialsPath: './views/partials',
    path: './views',
    relativeTo: __dirname
  });

});

// Authentication

const validate = function (request, username, password, callback) {
  if (username !== Config.username) {
    return callback(null, false);
  }

  Bcrypt.compare(password, Config.password, (err, isValid) => {
    callback(err, isValid, { id: 1, name: Config.username });
  });
};

server.register(Basic, (err) => {

  if (err) throw err;

  server.auth.strategy('simple', 'basic', true, { validateFunc: validate });

  /*===== Routes =====*/

  server.route({
    method: 'GET',
    path: '/',
    handler: Handlers.landing
  });

  server.route({
    method: ['PUT', 'POST'],
    path: '/log',
    handler: Handlers.addEntry
  });

  server.route({
    method: 'DELETE',
    path: '/log/{id}',
    handler: Handlers.deleteEntry
  });

  // Side note: stupid browsers not allowing us to use proper REST methods.
  server.route({
    method: 'POST',
    path: '/log/{id}/delete',
    handler: Handlers.deleteEntry
  });

  server.route({
    method: ['PATCH', 'POST'],
    path: '/log/{id}',
    handler: Handlers.updateEntry
  });

  server.route({
    method: 'GET',
    path: '/logs',
    handler: Handlers.getLogs
  });

  server.route({
    method: 'GET',
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
});
