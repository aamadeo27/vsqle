const configs = require('./config')

// VoltClient manages all communication with VoltDB
const VoltClient = require('voltjs/lib/client')
const VoltConstants = require('voltjs/lib/voltconstants')
const VoltConfiguration = require('voltjs/lib/configuration')
const VoltProcedure = require('voltjs/lib/query')
const VoltQuery = require('voltjs/lib/query')

const eventListener = (code, event, message) => {
	console.log("Event: ", { code, event, message })
}

const adHoc = new VoltProcedure("@AdHoc",['string'])
let connected = false
let client = null

const voltclient = {
	connected: false,
	connect(loginInfo){
		// The client is only configured at this point. The connection
		// is not made until the call to client.connect().
		client = new VoltClient(configs(loginInfo))

		// You can register for a long list of event types, including the results
		// of queries. Some developers will prefer a common message loop
		// while others will prefer to consume each event in a separate handler.
		// Queries can also be processed in a common handler at the client level,
		// but would be better handled by using a query callback instead.
		client.on(VoltConstants.SESSION_EVENT.CONNECTION, eventListener)
		client.on(VoltConstants.SESSION_EVENT.CONNECTION_ERROR, eventListener)
		client.on(VoltConstants.SESSION_EVENT.QUERY_RESPONSE_ERROR, eventListener)
		client.on(VoltConstants.SESSION_EVENT.QUERY_DISPATCH_ERROR, eventListener)
		client.on(VoltConstants.SESSION_EVENT.FATAL_ERROR, eventListener)

		// The actual connection. 
		// Note, there are two handlers. The first handler will generally indicate
		// a success, though it is possible for one of the connections to the 
		// volt cluster to fail.
		// The second handler is more for catastrophic failures.
		client.connect(
			(code, event, results) => {
				console.log('Node connected to VoltDB')
				voltclient.connected = true
			},
			(code, event, results) => console.log('Node did not connect to VoltDB')
		)
	},
	execute(queryString, callback){
		const query = adHoc.getQuery()
		query.setParameters([queryString])

		client.callProcedure( query, (code, event, results) => {
			if (code){
				console.log("Error:",{ code, event })
			} else {
				callback(results.table)
			}
		})
	}
}

module.exports = voltclient