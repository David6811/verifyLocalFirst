# verifyLocalFirst

Local-First Chat Application with Supabase Integration

This project demonstrates a local-first approach to data management with real-time synchronization to Supabase. It includes a Chrome extension sidebar interface with authentication.

## Features

- 🏠 **Local-First Architecture**: Data stored locally with offline capability
- 🔄 **Real-time Sync**: Automatic synchronization with Supabase
- 🔐 **Authentication**: Secure login with user session management
- 🧩 **Chrome Extension**: Sidebar interface for browser integration
- ⚡ **Effect.js**: Functional programming with Effect library
- 📱 **Material-UI**: Modern React UI components

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Chrome Extension

To build and install the Chrome extension:

1. Run `npm run build` to build the project and extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `build` folder
5. The sidebar extension will be available in your Chrome toolbar

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).