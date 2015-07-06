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

  mainWindow.on('closed', function () {
    mainWindow = null;  // Dereference window
  });
});
