'use strict';

const moment = require('moment');

module.exports = function(timestamp, data) {
  const date = moment(timestamp.getHighBits() * 1000);

  return date.format(data.hash.format);
};