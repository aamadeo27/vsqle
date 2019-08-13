const winston = require('winston');

const serverLogger = winston.createLogger({
	format: winston.format.printf(info => {
		let log = '';
		let tag = `[${info.timestamp || new Date().toLocaleString()}][${info.level}][${info.message}]`;

		for( let key in info ){
			if ( key.match(/timestamp|level|message/) ) continue;

			log += `${key}: ${JSON.stringify(info[key])}, `;
		}

		return `${tag} - { ${log.substring(0,log.length-2)} }`;
	}),
	transports: [
		new (winston.transports.Console)(),
		new (winston.transports.File)({ filename: 'server.log' })
	]
});

const errorLogger = winston.createLogger({
	transports: [
		new (winston.transports.Console)(),
		new (winston.transports.File)({ filename: 'server.error.log' })
	]
});

const auditLogger = winston.createLogger({
	format: winston.format.printf(info =>{
		let nodes = info.nodes && info.nodes.join(',') || 'disconnected';
		return `[${info.timestamp}][${info.username || ''}][${nodes}][${info.message}][${info.procedure || '@AdHoc'}] ${info.query ? '- ' + info.query : ''} ${info.args ? '- ' + info.args.join(',') : ''}`;
	}),
	transports: [
		new (winston.transports.Console)(),
		new (winston.transports.File)({ filename: 'audit.log', timestamp: false })
	]
});

module.exports = {
	log: (info) => serverLogger.info.call(serverLogger, info),
	error: (info) => errorLogger.error.call(errorLogger, info),
	audit: (info) => auditLogger.error.call(auditLogger, info)
}