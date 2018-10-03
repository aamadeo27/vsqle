const { app, BrowserWindow, Menu } = require('electron')
require('./client');
const debug = false;

function createWindow () {
  win = new BrowserWindow({ width: 1024, height: 768 });
  win.maximize();
  if ( !debug ) Menu.setApplicationMenu(new Menu());

  // and load the index.html of the app.
  win.loadFile('public/index.html');
}


app.on('ready', createWindow)