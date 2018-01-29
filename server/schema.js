const express = require('express')
const router = express.Router()
const url = require('url')
const fetch = require('node-fetch')

const sendMw = (res,object) => res.send(JSON.stringify(object))

router.post('/', (req, res, next) => {
	
	const { objectType, host, user, password } = req.body
	const port = req.body.port || 8080

	const params = [
		`Procedure=${encodeURIComponent('@SystemCatalog')}`,
		`Parameters=['${encodeURIComponent(objectType)}']`,
		`User=${encodeURIComponent(user)}`,
		`Password=${encodeURIComponent(password)}`,
	]
   const queryURL = `http://${host}:${port}/api/1.0/?`+params.join("&")

   fetch(queryURL).then( response => {
		response.json().then( json =>{
			console.log(json)
			if ( json.status == 1 ) sendMw(res, json.results[0]) 
			else sendMw(res, { error: json.statusstring })
		})
   })
	
})



module.exports = router