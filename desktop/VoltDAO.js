const VoltConfiguration = require('voltjs/lib/configuration');
const VoltClient = require('voltjs/lib/client');
const VoltProcedure = require('voltjs/lib/query');
const VoltConstants = require('voltjs/lib/voltconstants');
const config = require('./config');
const logger = require('./logger');

const defaults = {
	voltdbPort: 21212
};

const MESSAGES = {
	DISCONNECTED: 'Not Logged In'
}

function VoltDAO(userAuth){
  const confs = [];
	const nodes = userAuth.nodes.replace(/\s/g,'').split(',');

	nodes.forEach( node => {
		const nodeConfig = new VoltConfiguration();
		nodeConfig.host = node;
		nodeConfig.port = defaults.voltdbPort || config.voltDBPort;
		nodeConfig.username = userAuth.user;
		nodeConfig.password = userAuth.password;
		confs.push(nodeConfig);
	});

	this.client = new VoltClient(confs);
}


VoltDAO.prototype.connect = function(){
	return this.client.connect().then( (response) => {
    const { connected, errors } = response;
		if ( ! connected ) {
      return Promise.reject( errors.map(e => VoltConstants.LOGIN_ERRORS[e] ));
    }
	});
};

VoltDAO.prototype.close = function(){
	return this.client.exit();
};

VoltDAO.prototype.isConnected = function(){
	return this.client.isConnected();
};

const SystemCatalog = new VoltProcedure('@SystemCatalog', ['string']);
VoltDAO.prototype.loadSchema = function(object){
	if ( !this.client.isConnected() ) return Promise.reject(MESSAGES.DISCONNECTED);

	const stmt = SystemCatalog.getQuery();
	stmt.setParameters([object]);
	return this.client.callProcedure(stmt).read.then( response => {
		if ( response.results.status !== VoltConstants.RESULT_STATUS.SUCCESS ) {
			return Promise.reject(response.results.statusString);
		}

		return response.results.table;
	});
};

VoltDAO.prototype.query = function(query){
	if ( !this.client.isConnected() ) return Promise.reject(MESSAGES.DISCONNECTED);

	return this.client.adHoc(query).read.then( response => {
		if (response.code || response.results.status !== VoltConstants.RESULT_STATUS.SUCCESS) {
			return Promise.reject(response.results.statusString);
		}

		return response.results.table;
	});
};

const numberTypes = {
	f: 'float', d: 'double', i: 'int', l: 'long', t: 'date'
};

const parseType = arg => arg.match(/'.+'$/) ? 'string' : numberTypes[ arg[arg.length-1].toLowerCase() ];
const parseValue = (arg,type) => type === 'string' ? arg.substring(1, arg.length-1) : parseInt(arg);

VoltDAO.prototype.callProcedure = function(procedure, args){
	if ( !this.client.isConnected() ) return Promise.reject(MESSAGES.DISCONNECTED);

	let parsedArgs = args.map( e => ({ value: e, type: parseType(e) }));
	parsedArgs = parsedArgs.map( ({ value, type}) => ({ type, value: parseValue(value, type)}));

	const voltProcedure = new VoltProcedure(procedure, parsedArgs.map( ({ type }) => type));
	const statement = voltProcedure.getQuery();
	statement.setParameters(parsedArgs.map( ({ value }) => value));

	return this.client.callProcedure(statement).read.then( response => {
		if ( response.results.status !== VoltConstants.RESULT_STATUS.SUCCESS ) {
			return Promise.reject(response.results.statusString);
		}

		return response.results.table;
	});
};

VoltDAO.prototype.loadClasses = function(jarBuffer){
	if ( !this.client.isConnected() ) return Promise.reject(MESSAGES.DISCONNECTED);

	return this.client.updateClasses(jarBuffer).read.then( response => {
		if ( response.results.status !== VoltConstants.RESULT_STATUS.SUCCESS ) {
			return Promise.reject(response.results.statusString);
		}

		return response.results.table;
	});
};

module.exports = VoltDAO;