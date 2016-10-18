const express = require('express')
const router = express.Router()
const url = require('url')

const client = require('./client')
const loginInfo = { username: 'voltdb', password: 'voltdb' }

client.connect(loginInfo)

const sendMw = (res,object) => res.send(JSON.stringify(object))

const executeQuery = (query, callback) => {
	if ( client.connected ){
		console.log(client)
		client.execute(query, callback)
	} else {
		console.log("waiting")
		setTimeout(() => executeQuery(query,callback), 1000)
	}
}

router.post('/', (req, res, next) => {
	executeQuery( req.body.query, result => sendMw(res, result) )
})


module.exports = router;