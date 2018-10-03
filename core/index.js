const VoltDAO = require('./VoltDAO');
const logger = require('./logger');
const config = require('./config');

const connections = new Map();
const disconnects = new Map();

/**
 * Utility Functions
 */
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

const disconnect = (session) => {
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

/**
 * Core Functions
 */
const Core = function(){
  
};

Core.prototype.session = function( session ){
  const { cid, name } = session;

  if ( cid ){
    const voltDAO = connections.get(cid);

    let response = { name };
    if ( voltDAO && voltDAO.isConnected() ) {
      response = { name, user: voltDAO.client.config[0].username };
    }

    logger.log('GetSession', response);
    
    return response;
  } else {
    return {};
  }
};

Core.prototype.schema = function(session, params){
  const { cid } = session;
  const { query } = params;
  const { object } = query;

  logger.log('Schema',{ object });

  if ( cid ){
    const voltDAO = connections.get(cid);
  
    return voltDAO.loadSchema(object).then( tables => {
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
  
      return response;
    }).catch( error => {
      logger.error('Schema',{ error });
      return { error };
    });
		
  } else {
    const response = { error: 'Not logged in' };
    logger.error('QueryResponse', response );
    return response;
  }
};

Core.prototype.logout =function( session ){
  const { cid, name } = session;

  logger.log('LogOutRequest', { name, cid });
  logger.audit('Logout', { name, timestamp: new Date().toLocaleString() });

  disconnect(session);

  logger.log('LogOutResponse', { name, status: 0 });
  return { status: 0 };
};

Core.prototype.login = function(session, params){
  const { cid, name: currSession } = session;
  const { data } = params;
  const { user, nodes, name } = data;

  if ( cid ){
    const voltDAO = connections.get(cid);

    if ( voltDAO && voltDAO.isConnected() ) {
      if ( currSession === name ) return { status: 0 };
      disconnect(session);
    }
  }
	
  logger.log('LogInRequest', { user, nodes });
  const voltDAO = new VoltDAO(data);
	
  return voltDAO.connect().then( () => {
    logger.log('Connected');
    voltDAO.id = new Date().getTime();
    session.cid = voltDAO.id;
    session.name = name;

    const disconnect = setTimeout(() => connections.delete(voltDAO.id), config.sessionLifespan);
    connections.set(voltDAO.id, voltDAO);
    disconnects.set(voltDAO.id, disconnect);

    logger.log('LogInResponse',{ user, status: 0 });
    logger.audit('LogIn', { user, timestamp: new Date().toLocaleString() });

    return { status: 0 };
  }).catch( errors => {
    session.name = undefined;
		
    logger.log('LogInResponse', { user, error: errors.toString() });
    return { errors };
  });
};


Core.prototype.query = function(session, params){
  const { cid } = session;
  const { query } = params.data;
	
  if ( cid ){
    const voltDAO = connections.get(cid);
    const username = voltDAO.client.config[0].username;
    const nodes = voltDAO.client.config.map( e => e.host );

    logger.log('QueryRequest',{ query });
    logger.audit('QueryRequest',{ query, username, timestamp: new Date().toLocaleString(), nodes });
		
    return voltDAO.query(query).then( tables => {
      const response = mapTables(tables);

      logger.log('QueryResponse OK', { query });
      return response;
    }).catch( error => {
      logger.error('QueryResponse', error);
      return { error };
    });
		
  } else {
    const response = { error: 'Not logged in' };
    logger.error('QueryResponse', response );
    return response;
  }
};

Core.prototype.exec = function(session, params){
  const { procedure, args } = params.data;
  const { cid } = session;

  logger.log('StoreProcedureRequest',{ procedure, args, cid });

  if ( cid ){
    const voltDAO = connections.get(cid);
    const username = voltDAO.client.config[0].username;
    const nodes = voltDAO.client.config.map( e => e.host );

    logger.audit('StoreProcedureRequest',{ procedure, args, username, timestamp: new Date().toLocaleString(), nodes });
		
    return voltDAO.callProcedure(procedure, args).then( tables => {
      const response = mapTables(tables);

      logger.log('StoredProcedureResponse', { procedure, args, status: 'ok' });
      return response;
    }).catch( error => {
      logger.error('StoredProcedureResponse', error);
      return { error };
    });
		
  } else {
    const response = { error: 'Not logged in' };
    logger.error('StoredProcedureResponse', response );

    return response;
  }
};


Core.prototype.loadClasses = function(session, params){
  const { cid } = session;
  const { data } = params;

  if ( !cid ) {
    return { error: 'Not logged in' };
  }

  logger.log('Load Classes',{ cid });
  logger.log('File length', (data.length / 8192) + 'KBs');

  const voltDAO = connections.get(cid);
  
  return voltDAO.loadClasses(data).then( tables => {
    return parseVoltTable(tables[0]);
  }).catch( error => ({ error }) );
};

module.exports = new Core();