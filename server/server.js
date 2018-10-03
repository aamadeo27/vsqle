const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const fs = require('fs');
const https = require('https');
const config = require('./config.json');
const appLogger = require('./logger');

const PORT = config.port || 8084;

appLogger.log('Configuration', config);

/*Routers*/
const client = require('./client');

app.use(session({
	resave: true, 
	saveUninitialized: true,
	secret: 'AManHasNoSecrets',
	cookie: {
		path: '/',
		maxAge: 1000 * 60 * 60 * 24,
		httpOnly: false,
		secure: true
	}
}));

app.disable('x-powered-by');

https.createServer({
	key: fs.readFileSync(config.key),
	cert: fs.readFileSync(config.cert)
}, app).listen({ port: PORT }, () => appLogger.log('Init', { PORT } ) );

app.use(compression());
app.use(function (req, res, next) {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', config.origin);
	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);
	// Pass to next layer of middleware
	next();
});

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));

if (app.get('env') === 'production') {
	app.set('trust proxy', 1);
}

app.use('/', client);
