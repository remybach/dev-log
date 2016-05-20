module.exports = {
  isJSON: (req) => {
    return req.headers.accept.indexOf('application/json') > -1;
  }
};