"use strict";

let
    request        = require('superagent'),
    low           = require('lowdb');
let db = low('db.json');

// Add polyfill to add ES6 goodness
require("babel/polyfill");

export function logme() {
  console.log("===================================================\n\n\n");
  console.log('\t\tTEST LOGME');
  console.log("===================================================\n\n\n");
}


/* Authenticate user by prompting a signin
   returns a Promise containing the auth code */
export function authenticate(retry = false) {
  console.log("Running authenticate function");
  let client_id = '2060';
  let callback_uri = 'https://localhost/callback';
  let url = `https://api.put.io/v2/oauth2/authenticate?client_id=${client_id}&response_type=code&redirect_uri=${callback_uri}`;
  let code = null;

  return new Promise((resolve, reject) => {
    // Skip grant access if grant code is in DB
    if (( db('OAuth').size() > 0 ) && ( db('OAuth').pluck('grant')[0] ) && !retry) {
      console.log("Grant already in DB, skipping");
      return resolve(db('OAuth').pluck('grant')[0]);
    }

    // Create auth window
    let authWindow = new BrowserWindow({
      width: 500,
      height: 800,
      frame: false,
      show: false,
      'node-integration': false
    });

    // Load the page
    authWindow.loadUrl(url)

    // Present window to the user once it is loaded
    authWindow.webContents.on('did-stop-loading', () => {
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
        resolve(code);
      } else {
        reject(new Error("Could not Authenticate application"));
      }
    });
  });
}


/* Get the access token given an auth code
   returns a promise with the access token */
export function getToken(retry = false, auth_code) {
  console.log("Running getToken function");
  let client_id = "2060";
  let client_secret = "nvygh6u4r1cdxb0q17w9"; // This demo app will be un-registered from Put.io so no point in trying malice
  let callback_uri = "https://localhost/callback";
  let url = `https://api.put.io/v2/oauth2/access_token?client_id=${client_id}&client_secret=${client_secret}&grant_type=authorization_code&redirect_uri=${callback_uri}&code=${auth_code}`;

  return new Promise((resolve, reject) => {
      // If we already have the Authorization grant code, skip the whole OAuth flow
      if (( db('OAuth').size() > 0 ) && ( db('OAuth').pluck('token')[1] && !retry)) {
        console.log("Access token already in database, skipping token flow");
        return resolve(db('OAuth').pluck('token')[1]);
      } else {
        console.log("Token not in db");
      }

      // use superagent to send GET request to obtain token, given the auth code
      // Convert returned response' text to JSON object
      // Parse json to get the token along with the promise
      request
        .get(url)
        .end((err, res) => {
          if (err) {
            reject(err);
          } else {

            if (typeof (db('OAuth').pluck('token')[1]) == 'undefined') {
              console.log(("Adding token for the first time"));
            } else {
              console.log(("Replacing grant code"));
              db('OAuth')
                .chain()
                .find({ token: db('OAuth').pluck('token')[1] })
                .assign({ token: JSON.parse(res.text).access_token})
                .value()
            }
            resolve(JSON.parse(res.text).access_token);
          }
        });
  });
}


/* Logs user IN by following the auth and token procedure
   returns a promise with token and user information (result of getUser function)
   in an object */
export function login(retry = false) {
  console.log("Running login function");
  let token;
  return new Promise((resolve, reject) => {
    authenticate(retry)
      .then((auth_code) => {
        console.log(`Grant code returned from authenticate: ${auth_code}`);
        return getToken(retry, auth_code)
      })
      .then((returned_token) => {
        token = returned_token;
        console.log(`Token returned from getToken: ${token}`);
        return getUser(returned_token);
      })
      .then((userInfo) => {
        const user = userInfo.info;
        resolve({ user, token })
      })
      .catch((err) => {
        if (err.code == "ECONNREFUSED" || (err.status === 400)) {
          return login(true);
        } else {
          reject(err);
        }
      });
  });
}


/* Gather user account information and returns
   a promise containing a JSON object of the response */
export function getUser(auth_token) {
  console.log("Running getUser function");
  console.log(auth_token);
  let url = `https://api.put.io/v2/account/info?oauth_token=${auth_token}`;
  return new Promise((resolve, reject) => {
    request
      .get(url)
      .end((err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.parse(res.text));
          }
      });
  });
}


/* Get list of all files in an account and return a
   promise along with the JSON object */
export function getAllFiles(auth_token, parent_id = 0) {
  let url = `https://api.put.io/v2/files/list?oauth_token=${auth_token}&parent_id=${parent_id}`;
  return new Promise((resolve, reject) => {
    request
      .get(url)
      .end((err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.parse(res.text).files);
          }
      });
  });
}

/* Gets upto 50 videos in an account and returns
a promise continaing an array of files on a single page */
export function getVideos(auth_token, currentPage=1) {
  console.log("Running getVideos");
  let url = `https://api.put.io/v2/files/search/type:video/page/${currentPage}?oauth_token=${auth_token}`;
  console.log(url);
  return new Promise((resolve, reject) => {
    request
      .get(url)
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          // console.log("Files: " + JSON.parse(res.text).files.length);
          resolve(JSON.parse(res.text).files);
        }
      });
  });
}

/* Gets all videos in an account and returns a promise
    continaing an array of all file objects */
export function getAllVideos(auth_token, counter=1, arr=[]) {
  var tempArray = [...arr];
  return getVideos(auth_token, counter)
    .then((result) => {
      if (result.length === 0) {
        console.log(`result.length is zero \ntempArray length = ${tempArray.length}`);
        return tempArray;
      } else {
        // console.log('result.length is not zero');
        tempArray.push(...result);
        return getAllVideos(auth_token, counter + 1, tempArray);
      }
    })
}
