const webpack = require('webpack');
const resolve = require('path').resolve;
const config = {
  entry: __dirname + '/assets/js/gens.js',
  output:{
    path: resolve('./build/js'),
    filename: 'gens.min.js',
    library: 'gens',
  },
  resolve: {
    extensions: ['.js','.jsx']
  },
  mode: 'production',
};
module.exports = config;
