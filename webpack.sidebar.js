const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/sidebar.tsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'sidebar.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
};