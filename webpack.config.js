var config = {
    entry: [__dirname + '/public/scripts/main.js'],
    output: {
        path: './public',
        filename: 'main.js'
    },

    devtool: "source-map",
    
    module: {
      loaders: [{
        test: /\.js?$/,
        exclude: /(node_modules)/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }]
    }
};


module.exports = config;
