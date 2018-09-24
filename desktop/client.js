const VoltDAO = require('./VoltDAO');
const ipcMain = require('electron').ipcMain;
const logger = require('./logger');
const config = require('./config');

const connections = new Map();
const disconnects = new Map();
const session = {};
const router = {
  get: (resource, listener) => ipcMain.on(`GET#${resource}`, listener),
  post: (resource, listener) => ipcMain.on(`POST#${resource}`, listener),
  put: (resource, listener) => ipcMain.on(`PUT#${resource}`, listener),
  delete: (resource, listener) => ipcMain.on(`DELETE#${resource}`, listener)
}


const valueOf = v => {
	if ( typeof v !== 'object' || !v ) return v;
	
	//BigInteger
	if ( v['0'] !== undefined ) {
		return v.toString();
	}

	return v.getTime();
};

const mapTables = (tables) => {
	const mappedTables = [];

	for( let i = 0 ; i < tables.length ; i++ ){
		let schema = tables[i].columnTypes.map( (t,j) => ({ name: tables[i].columnNames[j], type : t }) );
		let data = tables[i].data.map( row => 
			tables[i].columnNames.map( (t,j) => 
				valueOf(row[tables[i].columnNames[j]])
			)
		);
		
		delete data.columnNames;
		delete data.columnTypes;

		mappedTables.push({ data, schema });
	}

	return mappedTables;
};

const disconnect = () => {
	const { cid } = session;

	if ( cid ) {
		delete session.cid;
		delete session.name;

		const voltDAO = connections.get(cid);

		if ( voltDAO ){
			voltDAO.close();
			connections.delete(cid);
		}

		const disconnect = disconnects.get(cid);
		if ( disconnect ){
			clearTimeout(disconnect);
			delete session.disconnect;
		}
	}
};

const parseVoltTable = vt => {
	const schema = vt.columnTypes.map( (t,i) => ({ name: vt.columnNames[i], type : t }) );
	const data = vt.data.map( row => 
		vt.columnNames.map( (t,i) => 
			valueOf(row[vt.columnNames[i]]) 
		)
	);

	return { data, schema };
};

router.get('/session', (event, message) => {
  const { id } = message;
	const { cid, name } = session;

	if ( cid ){
		const voltDAO = connections.get(cid);

		let response = { name };
		if ( voltDAO && voltDAO.isConnected() ) {
			response = { name, user: voltDAO.client.config[0].username };
		}

    logger.log('GetSession', response);
    
    event.sender.send(id, response);
	} else {
		event.sender.send(id, {});
	}
});


router.get('/schema', (event, message) => {
  const { cid } = session;
  const { id, query } = message;
	const { object } = query;

	logger.log('Schema',{ object });

	if ( cid ){
		const voltDAO = connections.get(cid);
		
		voltDAO.loadSchema(object).then( tables => {
			let data = undefined, schema = undefined;

			if ( tables.length > 0 ){
				schema = tables[0].columnTypes.map( (t,i) => ({ name: tables[0].columnNames[i], type : t }) );
				data = tables[0].data.map( row => 
					tables[0].columnNames.map( (t,i) => 
						valueOf(row[tables[0].columnNames[i]]) 
					)
				);
				
				delete data.columnNames;
				delete data.columnTypes;
			}

			const response = { data, schema };
			logger.log('Schema OK');
			event.sender.send(id, response );
		}).catch( error => {
			logger.error('Schema',{ error });
			event.sender.send(id, { error });
		});
		
	} else {
		const response = { error: 'Not logged in' };
		logger.error('QueryResponse', response );
		event.sender.send(id, response);
	}
});


router.get('/disconnect', (event, message) => {
  const { id } = message;
	const { cid, name } = session;

	logger.log('LogOutRequest', { name, cid });
	logger.audit('Logout', { name, timestamp: new Date().toLocaleString() });

	disconnect();

	logger.log('LogOutResponse', { name, status: 0 });
	event.sender.send(id, { status: 0 });
});

router.post('/connect', (event, message) => {
  const { cid, name: currSession } = session;
  const { data, id } = message;
	const { user , nodes, name } = data;

	if ( cid ){
		const voltDAO = connections.get(cid);

		if ( voltDAO && voltDAO.isConnected() ) {
			if ( currSession === name ) return event.sender.send(id, { status: 0 });
			disconnect();
		}
	}
	
	logger.log('LogInRequest', { user, nodes });
	
	const voltDAO = new VoltDAO(data);
	
	voltDAO.connect().then( () => {
    logger.log('Connected')
		voltDAO.id = new Date().getTime();
		session.cid = voltDAO.id;
		session.name = name;

		const disconnect = setTimeout(() => connections.delete(voltDAO.id), config.sessionLifespan);
		connections.set(voltDAO.id, voltDAO);
		disconnects.set(voltDAO.id, disconnect);

		logger.log('LogInResponse',{ user, status: 0 });
		logger.audit('LogIn', { user, timestamp: new Date().toLocaleString() });

		event.sender.send(id, { status: 0 });
	}).catch( errors => {
		session.name = undefined;
		
		logger.log('LogInResponse', { user, error: errors.toString() });
		event.sender.send(id, { errors });
	});
});


router.post('/query', (event, message) => {
  const { cid } = session
	const { data: { query }, id } = message;
	
	if ( cid ){
		const voltDAO = connections.get(cid);
		const username = voltDAO.client.config[0].username;
		const nodes = voltDAO.client.config.map( e => e.host );

		logger.log('QueryRequest',{ query });
		logger.audit('QueryRequest',{ query, username, timestamp: new Date().toLocaleString(), nodes });
		
		voltDAO.query(query).then( tables => {
			const response = mapTables(tables);

			logger.log('QueryResponse OK', { query });
			event.sender.send( id, response );
		}).catch( error => {
			logger.error('QueryResponse', error);
			event.sender.send( id, { error });
		});
		
	} else {
		const response = { error: 'Not logged in' };
		logger.error('QueryResponse', response );
		event.sender.send( id, response);
	}
});

router.post('/store-procedure', (event, message) => {
	const { id,  data: { procedure, args }} = message;
	const { cid } = session;

	logger.log('StoreProcedureRequest',{ procedure, args, cid });

	if ( cid ){
		const voltDAO = connections.get(cid);
		const username = voltDAO.client.config[0].username;
		const nodes = voltDAO.client.config.map( e => e.host );

		logger.audit('StoreProcedureRequest',{ procedure, args, username, timestamp: new Date().toLocaleString(), nodes });
		
		voltDAO.callProcedure(procedure, args).then( tables => {
			const response = mapTables(tables);

			logger.log('StoredProcedureResponse', { procedure, args, status: 'ok' });
			event.sender.send( id, response);
		}).catch( error => {
			logger.error('StoredProcedureResponse', error);
			event.sender.send( id, { error });
		});
		
	} else {
		const response = { error: 'Not logged in' };
		logger.error('StoredProcedureResponse', response );
		event.sender.send( id, response);
	}
});


router.post('/load-classes', (event, message) => {
  const { cid } = session;
  const { data, id } = message;
  let buffer = Buffer.from(data);

	if ( !cid ) {
		return event.sender.send( id, { error: 'Not logged in' });
  }

  console.log( data );

	logger.log('Load Classes',{ cid });
  logger.log('File length', data.length );

  const voltDAO = connections.get(cid);

  voltDAO.loadClasses(buffer).then( tables => {
    event.sender.send( id, parseVoltTable(tables[0]));
  }).catch( error => event.sender.send( id, { error }));
});
