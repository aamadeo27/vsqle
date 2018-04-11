const VoltConfiguration = require('voltjs/lib/configuration')
const VoltClient = require('voltjs/lib/client')
const VoltProcedure = require('voltjs/lib/query')
const VoltConstants = require('voltjs/lib/voltconstants')
const config = require('./config')
const logger = require('./logger')
const AdHoc = new VoltProcedure('@AdHoc', ['string'])
const SystemCatalog = new VoltProcedure('@SystemCatalog', ['string'])

const defaults = {
	voltdbPort: 21212
}

const ERR_NOT_CONNECTED = -1

const CONNECTED = 0
const DISCONNECTED = 1

module.exports = userConfig => {
    const confs = []
	const nodes = userConfig.nodes.split(",")

    nodes.forEach( node => {
        const nodeConfig = new VoltConfiguration()
        nodeConfig.host = node
        nodeConfig.port = defaults.voltdbPort || config.voltDBPort
        nodeConfig.username = userConfig.user
        nodeConfig.password = userConfig.password
		confs.push(nodeConfig)
	})

	const client = new VoltClient(confs)

    const connection = {
		connected: () => {
			if ( ! connection.client ) return false
			
			const conn = connection.client._getConnection()
			if ( ! conn ) return false 
			if ( ! conn.isValidConnection() ) return false

			return true
		},

		close: () => connection.client.exit(),

		handler: {
			err : {
				connection: (code, event, message) => {
					console.log("Connection to database was lost\n", code, message)
				},

				query: (code, event, message) => console.log("QueryError", {
					code,
					event,
					message
				}),

				fatal: (code, event, message) => {
					console.log("FatalError", {
						code,
						event,
						message
					})
				}
			},
		},

		connecting: false,

        connect: () => new Promise( (resolve, reject) => {
			client.on(VoltConstants.SESSION_EVENT.CONNECTION, (event, code, message) => {})
			client.on(VoltConstants.SESSION_EVENT.CONNECTION_ERROR, connection.handler.err.connection)
			client.on(VoltConstants.SESSION_EVENT.QUERY_RESPONSE_ERROR, connection.handler.err.query)
			client.on(VoltConstants.SESSION_EVENT.QUERY_DISPATCH_ERROR, connection.handler.err.query)
			client.on(VoltConstants.SESSION_EVENT.FATAL_ERROR, connection.handler.err.fatal)
			
			const connected = []
			let failed = 0
			let finished = 0

			connection.connecting = true

            client.connect( (code, event, result) => {
				if( code ) {
					if ( ! connection.connecting ){
						if ( connection.client ) return connection.client.exit()
					}

					connected[result.config.host] = false
					failed++
					console.log("Could not connect to " + result.config.host + "\nError:", VoltConstants.STATUS_CODE_STRINGS[code])
					result.close()
					result.validConnection = false

					if ( failed === nodes.length ){
						reject({ status: ERR_NOT_CONNECTED })
					}
				} else {
					connected[result.config.host] = true
					setTimeout(() => {
						if ( connected[result.config.host] ){
							console.log("Connected to ", result.config.host)

							if ( ! connection.connected() ) {
								connection.client = client
								connection.config = userConfig
								resolve(connection)
							}
						}
					}, config.loginDelay)
				}

				finished++
				connection.connecting = finished < nodes.length
			}, (code, event, results) => reject({ code, event, message: VoltConstants.STATUS_CODE_STRINGS[code] }) )
			
			setTimeout(() => {
				connection.connecting = false 
			},config.longDelay)
		}),

		loadSchema: object => new Promise( (resolve, reject) => {
			if ( !connection.connected() ) {
				return reject('Not Logged in')
			}

			const statement = SystemCatalog.getQuery()

        	statement.setParameters([object])

			client.callProcedure( statement, (event, code, results) => {
				if ( results.error ) reject(results.error)
				else resolve(results)
			})
		}),
		
		executeQuery: query => new Promise( (resolve, reject) => {
			if ( !connection.connected() ) {
				return reject('Not Logged in')
			}

			const statement = AdHoc.getQuery()

        	statement.setParameters([query])

			console.log("Timeout: ",  config.timeout)
			const timeout = setTimeout( () => reject('Timeout'),config.timeout)

			client.callProcedure( statement, (event, code, results) => {
				if ( results.error ) reject(results.error)
				else resolve(results)
			})
		}),

		callProcedure: (procedure, args) => new Promise( (resolve, reject) => {
			if ( !connection.connected() ) {
				return reject('Not Logged in')
			}

			const numberTypes = {
				f: "float", d: "double", i: "int", l: "long", t: "date"
			}

			const parseType = arg => arg.match(/'.+'$/) ? 'string' : numberTypes[ arg[arg.length-1].toLowerCase() ]
			const parseValue = (arg,type) => type === 'string' ? arg.substring(1, arg.length-1) : parseInt(arg)
			const parsedArgs = args.map( e => ({ value: e, type: parseType(e) }))
								   .map( ({ value, type}) => ({ type, value: parseValue(value, type)}))

			const voltProcedure = new VoltProcedure(procedure, parsedArgs.map( ({ type }) => type))

			console.log("Call Procedure ", { procedure, parsedArgs })
			console.log(voltProcedure)
			
			const statement = voltProcedure.getQuery()
			statement.setParameters(parsedArgs.map( ({ value }) => value))

			client.callProcedure(statement, (event, code, results) => {
				if ( results.error ) reject(results.error)
				else resolve(results)
			})
		})
	}
	
	return connection
}