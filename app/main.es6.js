"use strict";
require("babel/polyfill");

let
    mainWindow    = null,                       // Keep a global reference to avoid it being garbage collected
    app           = require('app'),
    ipc           = require('ipc'),             // Module to have interprocess communication
    PouchDB       = require('pouchdb'),         // New database
    request       = require('superagent'),      // Module used to create/recieve HTTP requests
    BrowserWindow = require('browser-window');  // Module to create browser windows

let
    db            = new PouchDB('myDB', {db: require('memdown')}),
    putDriver     = require('../browser/build/js/putioDriver.dist');

// Initialize the database
putDriver.dbInit();

// If all windows are closed ...
app.on('window-all-closed', () => {
  // Quit the application if we are not on an Apple machine (darwin)
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// When the application is ready (when Electron is ready to create browser windows)
app.on('ready', () => {

  mainWindow = new BrowserWindow({      // Create the browser window
    width: 800,
    height: 600,
    show: false     // Hide the window initially
  });

  // Load the first html file
  mainWindow.loadUrl('file://' + __dirname + '/../browser/index.html');

  // Make the window visible when HTML is done loading
  // This is non-essential but it is a good practice to hide non-loaded pages
  mainWindow.webContents.on('did-stop-loading', () => { mainWindow.show(); });

  ipc.on('auth-request', (event, arg) => {
    console.log("Got auth request");
    putDriver.login().then((x) => {
      console.log('Returned from login');
      mainWindow.webContents.send('auth-result', x)
    })
  });

  // Dereference window
  mainWindow.on('closed', () => { mainWindow = null; });
});
