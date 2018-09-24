const winston = require('winston');

module.exports = {
	log: winston.createLogger({
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
	}).info,

	error: winston.createLogger({
		transports: [
			new (winston.transports.Console)(),
			new (winston.transports.File)({ filename: 'server.error.log' })
		]
	}).error,

	audit: winston.createLogger({
		format: winston.format.printf(info =>{
			let nodes = info.nodes && info.nodes.join(',') || 'disconnected';
			return `[${info.timestamp}][${info.username || ''}][${nodes}][${info.message}][${info.procedure || '@AdHoc'}] ${info.query ? '- ' + info.query : ''} ${info.args ? '- ' + info.args.join(',') : ''}`;
		}),
		transports: [
			new (winston.transports.Console)(),
			new (winston.transports.File)({ filename: 'audit.log', timestamp: false })
		]
	}).info
};