"use strict";

let
    _             = require('lodash'),          // Module to ease the pain!
    // Promise       = require('es6-promise').Promise,
    app           = require('app'),
    ipc           = require('ipc'),             // Module to have interprocess communication
    request       = require('superagent'),      // Module used to create/recieve HTTP requests
    mainWindow    = null,                       // Keep a global reference to avoid it being garbage collected
    BrowserWindow = require('browser-window');  // Module to create browser windows

require("babel/polyfill");

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
  mainWindow.loadUrl('file://' + __dirname + '/../views/index.html');

  // Make the window visible when HTML is done loading
  // This is non-essential but it is a good practice to hide non-loaded pages
  mainWindow.webContents.on('did-stop-loading', () => { mainWindow.show(); });

  ipc.on('auth-request', (event, arg) => {
    // console.log(arg);
    // authenticateAsync()
    //   .then(getTokenAsync)
    //   .then(getFilesAsync)
    //   .then((files) => {
    //     console.log(files);
    //   });
    authenticateAsync().then((result) => {
      console.log(result);
    })
  });

  // Dereference window
  mainWindow.on('closed', () => { mainWindow = null; });
});

////////////////////////////////
/* FUNCTIONS WITH CALL BACKS  */
////////////////////////////////

/* Gets authentication code */
function authenticate(callback) {
  // Use let instead of var for block scoped variables, this is why we had to add "use strict" at the top of the file
  let client_id = "2060";
  let callback_uri = "https://localhost/callback";
  // Create url using ES6 template strings (yey!)
  // let url = `https://put.io`;  // uncommnet and comment line below to logout for testing only
  let url = `https://api.put.io/v2/oauth2/authenticate?client_id=${client_id}&response_type=code&redirect_uri=${callback_uri}`;
  let code = null;

  // Create authentication window, pointing to Put.io API auth page
  let authWindow = new BrowserWindow({
    width: 500,
    height: 800,
    show: false,      // hide window initially
    // frame: false,
    'node-integration': false
  });

  // Start loading Put.io's page
  authWindow.loadUrl(url);

  // Present window to the user once it has been fully loaded
  authWindow.webContents.on('did-stop-loading', function () {
    authWindow.show();
  });

  // Detect form completion event
  authWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl, isMainFrame) => {
    if (newUrl.startsWith(callback_uri)) {
      // Strip code from the uri (Expected format: https://localhost/callback?code=COOKIES-HERE)
      code = newUrl.split(/[=]/)[1];
      authWindow.close(); // Close the auth window (This will trigger the close event, so we will clean up the references properly)
    }
  });

  // Close window
  authWindow.on('close', () => {
    authWindow = null;

    if (code) {
      callback(null, code);
    } else {
      callback(new Error("Could not Authenticate application"));
    }

  });
}


/* Gets access token */
function getToken(auth_code, callback) {
  let client_id = "2060";
  let client_secret = "nvygh6u4r1cdxb0q17w9"; // This demo app will be un-registered from Put.io so no point in trying malice
  let callback_uri = "https://localhost/callback";
  let url = `https://api.put.io/v2/oauth2/access_token?client_id=${client_id}&client_secret=${client_secret}&grant_type=authorization_code&redirect_uri=${callback_uri}&code=${auth_code}`;

  // use superagent to send GET request to obtain token, given the auth code
  // Convert returned response' text to JSON object
  // Parse json to get the token and return it via callback.
  request
    .get(url)
    .end((err, res) => {
      // console.log(res.text);  // Prints json as string with format: { "acess_token" : "ABCDEG" }
      if (err) {
        callback(new Error ("Failed to obtain the access token: " + err));
      } else {
        callback(null, JSON.parse(res.text).access_token);
      }
    });
}


/* Gather list of user files on the server */
function getFiles(auth_token, callback) {
  let url = `https://api.put.io/v2/files/list?oauth_token=${auth_token}`;
  request
    .get(url)
    .end((err, res) => {
        if (err) {
          callback(new Error ("Failed to obtain list of files: " + err));
        } else {
          callback(null, JSON.parse(res.text).files);
        }
    });
}

//////////////////////////////
/* FUNCTIONS WITH PROMISES  */
//////////////////////////////

function authenticateAsync() {
  return new Promise((fulfill, reject) => {
    authenticate((err, result) => {
      if (err) {
        reject(err);
      } else {
        fulfill(result);
      }
    });
  });
}

function getTokenAsync(auth_code) {
  return new Promise((fulfill, reject) => {
    getToken(auth_code, (error, result) => {
      if (error) {
        reject(error)
      } else {
        fulfill(result);
      }
    });
  });
}

function getFilesAsync(auth_token) {
  return new Promise((fulfill, reject) => {
    getFiles(auth_token, (error, result) => {
      if (error) {
        reject(error)
      } else {
        fulfill(result);
      }
    });
  });
}
