const { app, BrowserWindow, Menu } = require('electron')
require('./client');
const debug = false;

function createWindow () {
  win = new BrowserWindow({
	  width: 1024,
	  height: 768,
	  webPreferences: { nodeIntegration: true },
	  icon: __dirname + '/public/favicon.ico'
	});

  win.maximize();
  
  if ( process.env.NODE_DEV ) win.webContents.openDevTools();
  
  if ( !debug ) Menu.setApplicationMenu(new Menu());

  // and load the index.html of the app.
  win.loadFile('public/index.html');
}

app.on('ready', createWindow)
app.on('window-all-closed', () => {
  app.quit()
})