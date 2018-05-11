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
	const nodes = userConfig.nodes.replace(/\s/g,"").split(",")

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
			
			return connection.client._connections.reduce( (r, c) => r || !c || !c.destroyed, false )
		},

		close: () => {
			try {
				connection.client.exit()
			} catch (err) {
				connection.client.connectionStats()
				console.log({
					counter: connection.client._connectionCounter
				})
				console.error("Error on log out")
			}
		},

		handler: {
			err : {
				connection: (code, event, conn) => {
					console.log("Connection to database was lost")
					console.log("Node: ", conn.config.host)
					console.log(code, event)
					conn.socket.destroy()
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

        connect: () => {
			
			client.on(VoltConstants.SESSION_EVENT.CONNECTION_ERROR, connection.handler.err.connection)
			client.on(VoltConstants.SESSION_EVENT.QUERY_RESPONSE_ERROR, connection.handler.err.query)
			client.on(VoltConstants.SESSION_EVENT.QUERY_DISPATCH_ERROR, connection.handler.err.query)
			client.on(VoltConstants.SESSION_EVENT.FATAL_ERROR, connection.handler.err.fatal)
			
			const connected = []
			let failed = 0
			let finished = 0

			return new Promise( (resolve, reject) => {
				connection.connecting = true

				let fails = 0

				client.connect( ( { loggedIn, message } ) => {
					if ( loggedIn ){
						connection.connecting = false
						connection.client = client
	
						resolve(connection)
					} else {
						fails++

						if ( fails === 3 ) reject({ error: message })
					}
				})
			})
		},

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
				console.log("Not Logged in")
				return reject('Not Logged in')
			}

			const statement = AdHoc.getQuery()

        	statement.setParameters([query])

			const timeout = setTimeout( () => reject(`Timeout(${config.timeout}ms)`),config.timeout)

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