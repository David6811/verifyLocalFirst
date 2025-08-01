const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/sidebar.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'sidebar.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: false,
            compilerOptions: {
              target: 'es5',
              lib: ['dom', 'dom.iterable', 'es6'],
              allowJs: true,
              skipLibCheck: true,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              strict: false,
              forceConsistentCasingInFileNames: true,
              module: 'esnext',
              moduleResolution: 'node',
              resolveJsonModule: true,
              isolatedModules: true,
              noEmit: false,
              jsx: 'react-jsx',
            },
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  // Remove externals to bundle React with the app
};