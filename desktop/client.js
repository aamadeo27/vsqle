const ipcMain = require('electron').ipcMain;
const core = require('vsqle-core');

const session = {};

const requestHandler = method => (event, message) => {
  const result = core[method](session, message);

  if ( result instanceof Promise ){
    result.then( response => event.sender.send( message.id, response ) );	
  } else {
		event.sender.send(message.id, result);
	}
}

const router = {
  get: (resource, listener) => ipcMain.on(`GET#${resource}`, listener),
  post: (resource, listener) => ipcMain.on(`POST#${resource}`, listener),
  put: (resource, listener) => ipcMain.on(`PUT#${resource}`, listener),
  delete: (resource, listener) => ipcMain.on(`DELETE#${resource}`, listener)
}

router.get('/session', requestHandler('session') );
router.get('/schema', requestHandler('schema') );
router.get('/disconnect', requestHandler('logout'));
router.post('/connect', requestHandler('login') );
router.post('/query', requestHandler('query') );
router.post('/store-procedure', requestHandler('exec'));
router.post('/load-classes', requestHandler('loadClasses'));