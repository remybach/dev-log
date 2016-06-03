'use strict';

const md = require('markdown-it')();
const Handlebars = require('handlebars');

module.exports = function(text) {
  text = Handlebars.Utils.escapeExpression(text);

  return new Handlebars.SafeString(md.renderInline(text)) ;
};