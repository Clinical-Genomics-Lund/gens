const webpack = require('webpack');
const resolve = require('path').resolve;
const config = {
  entry: __dirname + '/assets/js/gens.js',
  output:{
    path: resolve('./gens/blueprints/gens/static'),
    filename: 'gens.min.js',
    library: 'gens',
  },
  resolve: {
    extensions: ['.js','.jsx']
  },
};
module.exports = config;
