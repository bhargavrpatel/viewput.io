"use strict"

var
    app           = require('app'),
    ipc           = require('ipc'),   // Module to have interprocess communication
    mainWindow    = null,             // Keep a global reference to avoid it being garbage collected
    BrowserWindow = require('browser-window'); // Module to create browser windows


// If all windows are closed ...
app.on('window-all-closed', function () {
  // Quit the application if we are not on an Apple machine (darwin)
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// When the application is ready (when Electron is ready to create browser windows)
app.on('ready', function () {
  mainWindow = new BrowserWindow({      // Create the browser window
    width: 800,
    height: 600,
    show: false     // Hide the window initially
  });

  // Load the first html file
  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  // Make the window visible when HTML is done loading
  // This is non-essential but it is a good practice to hide non-loaded pages
  mainWindow.webContents.on('did-stop-loading', function () {
    mainWindow.show();  // Show window
  });

  ipc.on('auth-request', function(event, arg) {
    authenticate(function (error, result) {  // Call the authentication method which will return the authentication code to us
      if (error) {
        console.error("User closed window and did not authenticate");
      } else {
        getToken(result);
        // mainWindow.webContents.send('auth-result', 'Success with code = ' + result);  // Send 'Success' to render process
      }
    });
  });

  mainWindow.on('closed', function () {
    mainWindow = null;  // Dereference window
  });
});


/* Gets authentication code */
function authenticate (callback) {
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
  authWindow.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl, isMainFrame) {
    if (newUrl.startsWith(callback_uri)) {
      // Strip code from the uri (Expected format: https://localhost/callback?code=COOKIES-HERE)
      code = newUrl.split(/[=]/)[1];
      authWindow.close(); // Close the auth window (This will trigger the close event, so we will clean up the references properly)
    }
  });

  // Close window
  authWindow.on('close', function() {
    authWindow = null;
    if (code) {
      callback(null, code);
    } else {
      callback(new Error("Authentication failed, window closed"));
    }
  });
}


/* Gets access token */
function getToken(auth_code) {
  console.log("INSIDE GET TOKEN");
  let client_id = "2060";
  let client_secret = "nvygh6u4r1cdxb0q17w9"; // This demo app will be un-registered from Put.io so no point in trying malice
  let callback_uri = "https://localhost/callback";
  let url = `https://api.put.io/v2/oauth2/access_token?client_id=${client_id}&client_secret=${client_secret}&grant_type=authorization_code&redirect_uri=${callback_uri}&code=${auth_code}`;
  let request = require('superagent');

  request
    .get(url)
    .end(function (err, res) {
      console.log(res.text);  // Prints json as string with format: { "acess_token" : "ABCDEG" }
    });
}
