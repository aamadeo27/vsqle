const express = require('express');
const router = express.Router();
const VoltDAO = require('./VoltDAO');
const logger = require('./logger');
const multipartMiddleware = require('connect-multiparty')();//for files upload

const connections = new Map();
const disconnects = new Map();

const disconnect = (req) => {
	const { cid } = req.session;

	if ( cid ) {
		delete req.session.cid;
		delete req.session.name;

		const voltDAO = connections.get(cid);

		if ( voltDAO ){
			voltDAO.close();
			connections.delete(cid);
		}

		const disconnect = disconnects.get(cid);
		if ( disconnect ){
			clearTimeout(disconnect);
			delete req.session.disconnect;
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

const valueOf = v => {
	if ( typeof v !== 'object' || !v ) return v;
	
	//BigInteger
	if ( v['0'] !== undefined ) {
		return parseInt(v.toString());
	}

	return v.getTime();
};

router.get('/session', (req, res) => {
	const { cid, name } = req.session;

	if ( cid ){
		const voltDAO = connections.get(cid);

		let response = { name };
		if ( voltDAO && voltDAO.isConnected() ) {
			response = { name, user: voltDAO.client.config[0].username };
		}

		res.json(response);
		logger.log('GetSession', response);
	} else {
		res.json({});
	}
});

router.get('/schema', (req, res) => {
	const { cid } = req.session;
	const { object } = req.query;

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
			res.json(response );
		}).catch( error => {
			logger.error('Schema',{ error });
			res.json({ error });
		});
		
	} else {
		const response = { error: 'Not logged in' };
		logger.error('QueryResponse', response );
		res.json(response);
	}
});

router.get('/disconnect', (req, res) => {
	const { cid, name } = req.session;

	logger.log('LogOutRequest', { name, cid });
	logger.audit('Logout', { name, timestamp: new Date().toLocaleString() });

	disconnect(req);

	logger.log('LogOutResponse', { name, status: 0 });
	res.json({ status: 0 });
});

router.post('/connect', (req, res) => {
	const { cid, name: currSession } = req.session;
	const { user , nodes, name } = req.body;

	if ( cid ){
		const voltDAO = connections.get(cid);

		if ( voltDAO && voltDAO.isConnected() ) {
			if ( currSession === name ) return res.json({ status: 0 });
			disconnect(req);
		}
	}
	
	logger.log('LogInRequest', { user, nodes });
	
	const voltDAO = new VoltDAO(req.body);
	
	voltDAO.connect().then( () => {
		voltDAO.id = `${req.headers.cookie.substring(14)}`;
		req.session.cid = voltDAO.id;
		req.session.name = name;

		const disconnect = setTimeout(() => connections.delete(voltDAO.id), req.session.cookie.maxAge);
		connections.set(voltDAO.id, voltDAO);
		disconnects.set(voltDAO.id, disconnect);

		logger.log('LogInResponse',{ user, status: 0 });
		logger.audit('LogIn', { user, timestamp: new Date().toLocaleString() });

		res.json({ status: 0 });
	}).catch( errors => {
		req.session.name = undefined;
		
		logger.log('LogInResponse [ERRORS]',{ user, errors });
		res.json({ errors });
	});
});

router.post('/query', (req, res) => {
	const { session: { cid }, body: { query }} = req;
	const { ip } = req;
	
	if ( cid ){
		const voltDAO = connections.get(cid);
		const username = voltDAO.client.config[0].username;
		const nodes = voltDAO.client.config.map( e => e.host );

		logger.log('QueryRequest',{ query });
		logger.audit('QueryRequest',{ query, ip, username, timestamp: new Date().toLocaleString(), nodes });
		
		voltDAO.query(query).then( tables => {
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
			logger.log('QueryResponse OK', { query });
			res.json(response );
		}).catch( error => {
			logger.error('QueryResponse', error);
			res.json({ error });
		});
		
	} else {
		const response = { error: 'Not logged in' };
		logger.error('QueryResponse', response );
		res.json(response);
	}
});

router.post('/store-procedure', (req, res) => {
	const { session: { cid } ,  body: { procedure, args }} = req;
	const { ip } = req;

	logger.log('StoreProcedureRequest',{ procedure, args, cid });

	if ( cid ){
		const voltDAO = connections.get(cid);
		const username = voltDAO.client.config[0].username;
		const nodes = voltDAO.client.config.map( e => e.host );

		logger.audit('StoreProcedureRequest',{ procedure, args, ip, username, timestamp: new Date().toLocaleString(), nodes });
		
		voltDAO.callProcedure(procedure, args).then( tables => {
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
			logger.log('QueryResponse OK', { procedure, args });
			res.json(response);
		}).catch( error => {
			logger.error('QueryResponse', error);
			res.json({ error });
		});
		
	} else {
		const response = { error: 'Not logged in' };
		logger.error('QueryResponse', response );
		res.json(response);
	}
});



router.post('/load-classes', multipartMiddleware, function(req, res) {
	let buffer = [];

	const { session: { cid } ,  body: { procedure, args }} = req;
	const { ip } = req;

	if ( !cid ) {
		return res.json({ error: 'Not logged in' });
	}

	logger.log('Load Classes',{ procedure, args, cid, ip });

	req.on('data', chunk => {
		buffer.push(chunk);
	});

	req.on('end', () => {
		buffer = Buffer.concat(buffer);

		logger.log('File length', buffer.length);

		const voltDAO = connections.get(cid);

		voltDAO.loadClasses(buffer).then( tables => {
			res.json(parseVoltTable(tables[0]));
		}).catch( error => res.json({ error }));
	});
});

module.exports = router;