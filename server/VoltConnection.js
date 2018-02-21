const VoltConfiguration = require('voltjs/lib/configuration')
const VoltClient = require('voltjs/lib/client')
const VoltProcedure = require('voltjs/lib/query')
const VoltConstants = require('voltjs/lib/voltconstants')
const config = require('./config')

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
		connected: () => connection.client && !!connection.client._getConnection(),
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

        connect: (query) => new Promise( (resolve, reject) => {
			client.on(VoltConstants.SESSION_EVENT.CONNECTION, (event, code, message) => {})
			client.on(VoltConstants.SESSION_EVENT.CONNECTION_ERROR, connection.handler.err.connection)
			client.on(VoltConstants.SESSION_EVENT.QUERY_RESPONSE_ERROR, connection.handler.err.query)
			client.on(VoltConstants.SESSION_EVENT.QUERY_DISPATCH_ERROR, connection.handler.err.query)
			client.on(VoltConstants.SESSION_EVENT.FATAL_ERROR, connection.handler.err.fatal)
			
			const connected = []
			let failed = 0

            client.connect( (code, event, result) => {
				if( code ) {
					connected[result.config.host] = false
					failed++
					console.log("Could not connect to " + result.config.host + "\nError:", VoltConstants.STATUS_CODE_STRINGS[code])
					result.close()

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
            }, (code, event, results) => reject({ code, event, message: VoltConstants.STATUS_CODE_STRINGS[code] }) )
		}),

		loadSchema: object => new Promise( (resolve, reject) => {
			if ( !connection.connected() ) {
				reject({ status: ERR_NOT_CONNECTED, message: 'Not Connected' })
				return
			}

			const statement = SystemCatalog.getQuery()

        	statement.setParameters([object])

			client.callProcedure( statement, (event, code, results) => {
				if ( results.error ) reject(results)
				else resolve(results)
			})
		}),
		
		executeQuery: query => new Promise( (resolve, reject) => {
			if ( !connection.connected() ) {
				reject({ status: ERR_NOT_CONNECTED, message: 'Not Connected' })
				return
			}

			const statement = AdHoc.getQuery()

        	statement.setParameters([query])

			client.callProcedure( statement, (event, code, results) => {
				if ( results.error ) reject(results)
				else resolve(results)
			})
		}),

		callProcedure: () => new Promise( (resolve, reject) => {
			if ( !connection.connected() ) {
				reject({ status: ERR_NOT_CONNECTED, message: 'Not Connected' })
				return
			}

			reject({ status: -2, message: 'Not Implemented' })

			/*
			const procedure = new VoltProcedure(proc.name, proc)

			const statement = SystemCatalog.getQuery()
			statement.setParameters(['COLUMNS'])
	
			const tables = { }
			let result = await client.callProcedure(statement)
			*/
		})
	}
	
	return connection
}