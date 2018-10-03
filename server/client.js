const router = require('express').Router();
const core = require('vsqle-core');
const multipartMiddleware = require('connect-multiparty')();//for files upload


const requestHandler = method => (req, res) => {
	const message = {
		data: req.body,
		query: req.query
	};

	const result = core[method](req.session, message);

	if ( result instanceof Promise ){
		result.then( response => res.json(response) );	
	} else {
		res.json(result);
	}
};

router.get('/session', requestHandler('session') );
router.get('/schema', requestHandler('schema') );
router.get('/disconnect', requestHandler('logout'));
router.post('/connect', requestHandler('login') );
router.post('/query', requestHandler('query') );
router.post('/store-procedure', requestHandler('exec'));

router.post('/load-classes', multipartMiddleware, function(req, res) {
	let buffer = [];

	req.on('data', chunk => {
		buffer.push(chunk);
	});

	req.on('end', () => {
		buffer = Buffer.concat(buffer);

		requestHandler('loadClasses')({ session: req.session, body: buffer }, res);
	});
});

module.exports = router;