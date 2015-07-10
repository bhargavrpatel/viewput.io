"use strict";

let
    _             = require('lodash'),          // Module to ease the pain!
    low           = require('lowdb'),
    app           = require('app'),
    ipc           = require('ipc'),             // Module to have interprocess communication
    request       = require('superagent'),      // Module used to create/recieve HTTP requests
    mainWindow    = null,                       // Keep a global reference to avoid it being garbage collected
    BrowserWindow = require('browser-window');  // Module to create browser windows

var db = low('db.json');

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
  mainWindow.loadUrl('file://' + __dirname + '/../browser/index.html');

  // Make the window visible when HTML is done loading
  // This is non-essential but it is a good practice to hide non-loaded pages
  mainWindow.webContents.on('did-stop-loading', () => { mainWindow.show(); });

  ipc.on('auth-request', (event, arg) => {
    authAndTokenAsync()
      .getAccountAsync((x) => {
        console.log(x);
      });
  });

  // Dereference window
  mainWindow.on('closed', () => { mainWindow = null; });
});

////////////////////////////////
/* FUNCTIONS WITH CALL BACKS  */
////////////////////////////////

/* Gets authentication code */
function authenticate(retry, callback) {
  // Use let instead of var for block scoped variables, this is why we had to add "use strict" at the top of the file
  let client_id = "2060";
  let callback_uri = "https://localhost/callback";
  // Create url using ES6 template strings (yey!)
  // let url = `https://put.io`;  // uncommnet and comment line below to logout for testing only
  let url = `https://api.put.io/v2/oauth2/authenticate?client_id=${client_id}&response_type=code&redirect_uri=${callback_uri}`;
  let code = null;

  // If we already have the Authorization grant code, skip the whole OAuth flow
  if (( db('OAuth').size() > 0 ) && ( db('OAuth').pluck('grant')[0] ) && !retry) {
    console.log("Grant already in database, skipping access grant flow");
    return callback(null, db('OAuth').pluck('grant')[0]);
  }


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
      // If database does not have the grant field push it
      if (typeof (db('OAuth').pluck('grant')[0]) == 'undefined') {
        console.log(("Adding grant code for the first time"));
        db('OAuth')
          .push({grant: code})
      } else {
        console.log(("Replacing grant code"));
        db('OAuth')
          .chain()
          .find({ grant: db('OAuth').pluck('grant')[0] })
          .assign({ grant: code})
          .value()
      }
      callback(null, code);
    } else {
      callback(new Error("Could not Authenticate application"));
    }

  });
}


/* Gets access token */
function getToken(retry, auth_code, callback) {
  let client_id = "2060";
  let client_secret = "nvygh6u4r1cdxb0q17w9"; // This demo app will be un-registered from Put.io so no point in trying malice
  let callback_uri = "https://localhost/callback";
  let url = `https://api.put.io/v2/oauth2/access_token?client_id=${client_id}&client_secret=${client_secret}&grant_type=authorization_code&redirect_uri=${callback_uri}&code=${auth_code}`;

  // If we already have the Authorization grant code, skip the whole OAuth flow
  if (( db('OAuth').size() > 0 ) && ( db('OAuth').pluck('token')[1] && !retry)) {
    console.log("Access token already in database, skipping token flow");
    return callback(null, db('OAuth').pluck('token')[1]);
  }



  // use superagent to send GET request to obtain token, given the auth code
  // Convert returned response' text to JSON object
  // Parse json to get the token and return it via callback.
  request
    .get(url)
    .end((err, res) => {
      if (err) {
        callback(err);
      } else {

        if (typeof (db('OAuth').pluck('token')[1]) == 'undefined') {
          console.log(("Adding token for the first time"));
          db('OAuth')
            .push({ token: JSON.parse(res.text).access_token })
        } else {
          console.log(("Replacing grant code"));
          db('OAuth')
            .chain()
            .find({ token: db('OAuth').pluck('token')[1] })
            .assign({ token: JSON.parse(res.text).access_token})
            .value()
        }
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
          callback(err);
        } else {
          callback(null, JSON.parse(res.text).files);
        }
    });
}
/* Gather user account info on the server */
function getAccount(auth_token, callback) {
  let url = `https://api.put.io/v2/account/info?oauth_token=${auth_token}`;
  request
    .get(url)
    .end((err, res) => {
        if (err) {
          callback(err);
        } else {
          callback(null, JSON.parse(res.text).info);
        }
    });
}


/*
Gets access grant code and token
updates the database if needed and prompts retrial
if the grant code expires in the case of revoked access
*/
function authAndToken(retry, callback) {
  authenticateAsync(retry)      // Authenticate and get the access grant
    .then( (x) => { return getTokenAsync(retry, x) } )
    .then( (y) => { return getAccountAsync(y) } ) // Ensure no error occurs
    .then( (result) => {
      console.log(result.info);
      callback(null, y);  // Return the token instead of result of getAccount
    })
    .catch((err) => {
      if ((err.code == "ECONNREFUSED") || (err.status === 400)) {
        return authAndToken(true)
      } else {
        callback(err);
      }
    });
}

//////////////////////////////
/* FUNCTIONS WITH PROMISES  */
//////////////////////////////

/* Call authenticate function and returns a promise */
function authenticateAsync(retry = false) {
  return new Promise((fulfill, reject) => {
    authenticate(retry, (err, result) => {
      if (err) {
        reject(err);
      } else {
        fulfill(result);
      }
    });
  });
}

/* Call getToken function and returns a promise */
function getTokenAsync(retry = false, auth_code) {
  return new Promise((fulfill, reject) => {
    getToken(retry, auth_code, (error, result) => {
      if (error) {
        reject(error);
      } else {
        fulfill(result);
      }
    });
  });
}

/* Call getFiles function and returns a promise */
function getFilesAsync(auth_token) {
  return new Promise((fulfill, reject) => {
    getFiles(auth_token, (error, result) => {
      if (error) {
        reject(error);
      } else {
        fulfill(result);
      }
    });
  });
}

/* Call getAccount function and returns a promise */
function getAccountAsync(auth_token) {
  return new Promise((fulfill, reject) => {
    getAccount(auth_token, (error, result) => {
      if (error) {
        reject(error);
      } else {
        fulfill(result);
      }
    });
  });
}

/* Call authAndToken function and returns a promise */
function authAndTokenAsync(retry = false) {
  return new Promise((fulfill, reject) => {
    authAndToken(retry, (error, result) => {
      if (error) {
        reject(error);
      } else {
        fulfill(result);
      }
    });
  });
}
