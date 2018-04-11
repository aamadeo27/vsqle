const express = require('express')
const router = express.Router()
const getVoltConnection = require('./VoltConnection')
const sendMw = (res,object) => res.send(JSON.stringify(object))
const { BigInteger } = require('bignumber')
const logger = require('./logger')

const connections = new Map()
const disconnects = new Map()

const disconnect = (req) => {
	const { cid, name } = req.session

	if ( cid ) {
		delete req.session.cid
		delete req.session.name

		const connection = connections.get(cid)
		if ( connection && connection.connected() ){
			connection.close()
			connections.delete(cid)
		}

		const disconnect = disconnects.get(cid)
		if ( disconnect ){
			clearTimeout(disconnect)
			delete req.session.disconnect
		}
	}
}

const valueOf = v => {
	if ( typeof v !== 'object' || !v ) return v
	
	//BigInteger
	if ( v['0'] !== undefined ) return v['0']

	return v.getTime()
}

router.get('/session', (req, res, next) => {
	const { cid, name } = req.session

	if ( cid ){
		const connection = connections.get(cid)

		let response = { name }
		if ( connection && connection.connected() ) {
			response = { name, user: connection.client.config[0].username }
		}

		sendMw(res, response)
		logger.log("GetSession", response)
	} else {
		sendMw(res, {})
	}
})

router.get('/schema', (req, res, next) => {
	const { cid, name } = req.session
	const { object } = req.query

	logger.log("Schema",{ object })


	if ( cid ){
		const connection = connections.get(cid)
		
		connection.loadSchema(object).then( r => {
			const { table, err } = r

			let data = undefined, schema = undefined
			if ( table.length > 0 ){
				schema = table[0].columnTypes.map( (t,i) => ({ name: table[0].columnNames[i], type : t }) )
				data = table[0].map( r => table[0].columnNames.map( (t,i) => valueOf(r[table[0].columnNames[i]]) ))
				
				delete data.columnNames
				delete data.columnTypes
			}

			const response = { data, schema, error: r.status !== 1 ? r.statusString : undefined }
			logger.log("Schema",{ response })
			sendMw(res, response )
		}).catch( err => {
			logger.error("Schema",{ error: err.toString() })
			sendMw(res, { error: err })
		})
		
	} else {
		const response = { error: "Not logged in" }
		logger.error("QueryResponse", response )
		sendMw(res, response)
	}
})

router.get('/disconnect', (req, res, next) => {
	const { cid, name } = req.session

	logger.log("LogOutRequest", { name, cid })
	disconnect(req)

	logger.log("LogOutResponse", { name, status: 0 })
	sendMw(res, { status: 0 })
})

router.post('/connect', (req, res, next) => {
	const { cid, name: currSession } = req.session
	const { user , nodes, name } = req.body

	if ( cid ){
		const connection = connections.get(cid)
		if ( connection && connection.connected() ) {
			return sendMw(res, { status: 0 })
		} else {
			disconnect(req)
		}
	}
	
	logger.log("LogInRequest", { user, nodes })
	
	const conn = getVoltConnection(req.body)
	conn.connect().then( connection => {
		connection.id = `${req.headers.cookie.substring(14)}`
		req.session.cid = connection.id
		req.session.name = name

		const disconnect = setTimeout(() => connections.delete(connection.id), req.session.cookie.maxAge)
		connections.set(connection.id, connection)
		disconnects.set(connection.id, disconnect)

		logger.log("LogInResponse",{ user, status: 0 })
		sendMw(res, { status: 0 })
	}).catch( err => {
		req.session.name = undefined
		logger.log("LogInResponse -Catch-",{ user, error: err })
		console.log(err)
		sendMw(res, { err })
	})
})

router.post('/query', (req, res, next) => {
	const { session: { cid } ,  body: { query }} = req

	logger.log("QueryRequest",{ query, cid })
	if ( cid ){
		const connection = connections.get(cid)
		
		connection.executeQuery(query).then( r => {
			const { table, err } = r

			let data = undefined, schema = undefined
			if ( table.length > 0 ){
				schema = table[0].columnTypes.map( (t,i) => ({ name: table[0].columnNames[i], type : t }) )
				data = table[0].map( r => table[0].columnNames.map( (t,i) => valueOf(r[table[0].columnNames[i]]) ))
				
				delete data.columnNames
				delete data.columnTypes
			}

			const response = { data, schema, error: r.status !== 1 ? r.statusString : undefined }
			logger.log("QueryResponse",{ response })
			sendMw(res, response )
		}).catch( err => {
			logger.error("QueryResponse", err)
			sendMw(res, { error: err })
		})
		
	} else {
		const response = { error: "Not logged in" }
		logger.error("QueryResponse", response )
		sendMw(res, response)
	}
})

router.post('/store-procedure', (req, res, next) => {
	const { session: { cid } ,  body: { procedure, args }} = req

	logger.log("StoreProcedureRequest",{ procedure, args, cid })
	if ( cid ){
		const connection = connections.get(cid)
		
		connection.callProcedure(procedure, args).then( r => {
			const { table, err } = r

			let data = undefined, schema = undefined
			if ( table.length > 0 ){
				schema = table[0].columnTypes.map( (t,i) => ({ name: table[0].columnNames[i], type : t }) )
				data = table[0].map( r => table[0].columnNames.map( (t,i) => valueOf(r[table[0].columnNames[i]]) ))
				
				delete data.columnNames
				delete data.columnTypes
			}

			const response = { data, schema, error: r.status !== 1 ? r.statusString : undefined }
			logger.log("QueryResponse",{ response })
			sendMw(res, response )
		}).catch( err => {
			logger.error("QueryResponse", err)
			sendMw(res, { error: err.toString() })
		})
		
	} else {
		const response = { error: "Not logged in" }
		logger.error("QueryResponse", response )
		sendMw(res, response)
	}
})

module.exports = router