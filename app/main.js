'use strict';

var _ = require('lodash'),
    app = require('app'),
    ipc = require('ipc'),
    request = require('superagent'),
    mainWindow = null,
    BrowserWindow = require('browser-window');

require('babel/polyfill');

app.on('window-all-closed', function () {

  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false
  });

  mainWindow.loadUrl('file://' + __dirname + '/../views/index.html');

  mainWindow.webContents.on('did-stop-loading', function () {
    mainWindow.show();
  });

  ipc.on('auth-request', function (event, arg) {

    authenticateAsync().then(function (result) {
      console.log(result);
    });
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
});

function authenticate(callback) {

  var client_id = '2060';
  var callback_uri = 'https://localhost/callback';

  var url = 'https://api.put.io/v2/oauth2/authenticate?client_id=' + client_id + '&response_type=code&redirect_uri=' + callback_uri;
  var code = null;

  var authWindow = new BrowserWindow({
    width: 500,
    height: 800,
    show: false,

    'node-integration': false
  });

  authWindow.loadUrl(url);

  authWindow.webContents.on('did-stop-loading', function () {
    authWindow.show();
  });

  authWindow.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl, isMainFrame) {
    if (newUrl.startsWith(callback_uri)) {

      code = newUrl.split(/[=]/)[1];
      authWindow.close();
    }
  });

  authWindow.on('close', function () {
    authWindow = null;

    if (code) {
      callback(null, code);
    } else {
      callback(new Error('Could not Authenticate application'));
    }
  });
}

function getToken(auth_code, callback) {
  var client_id = '2060';
  var client_secret = 'nvygh6u4r1cdxb0q17w9';
  var callback_uri = 'https://localhost/callback';
  var url = 'https://api.put.io/v2/oauth2/access_token?client_id=' + client_id + '&client_secret=' + client_secret + '&grant_type=authorization_code&redirect_uri=' + callback_uri + '&code=' + auth_code;

  request.get(url).end(function (err, res) {

    if (err) {
      callback(new Error('Failed to obtain the access token: ' + err));
    } else {
      callback(null, JSON.parse(res.text).access_token);
    }
  });
}

function getFiles(auth_token, callback) {
  var url = 'https://api.put.io/v2/files/list?oauth_token=' + auth_token;
  request.get(url).end(function (err, res) {
    if (err) {
      callback(new Error('Failed to obtain list of files: ' + err));
    } else {
      callback(null, JSON.parse(res.text).files);
    }
  });
}

function authenticateAsync() {
  return new Promise(function (fulfill, reject) {
    authenticate(function (err, result) {
      console.log('INSIDE AUTHSYNC SUCESS YO');
      if (err) {
        reject(err);
      } else {
        console.log('ABOUT TO FULFILL THIS Yo');
        fulfill(result);
      }
    });
  });
}

function getTokenAsync(auth_code) {
  return new Promise(function (fulfill, reject) {
    getToken(auth_code, function (error, result) {
      if (error) {
        reject(error);
      } else {
        fulfill(result);
      }
    });
  });
}

function getFilesAsync(auth_token) {
  return new Promise(function (fulfill, reject) {
    getFiles(auth_token, function (error, result) {
      if (error) {
        reject(error);
      } else {
        fulfill(result);
      }
    });
  });
}