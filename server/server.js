const express = require('express')
const path = require('path')
const compression = require('compression')
const favicon = require('serve-favicon')
const logger = require('morgan')
const session = require('express-session')
const bodyParser = require('body-parser')
const app = express()
const fs = require('fs')
const PORT = process.env.PORT || 10080

/*Routers*/
const client = require('./client')
const schema = require('./schema')

app.listen(PORT, function () {
	console.log("Listening on " + PORT)
})

app.use(compression())
app.use(function (req, res, next) {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', 'http://www.dev.localhost:3000')
	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true)
	// Pass to next layer of middleware
	next()
})

app.use(express.static('public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extended: false
}))

if (app.get('env') === 'production') {
	app.set('trust proxy', 1)
}

app.use('/query', client)
app.use('/schema', schema)
