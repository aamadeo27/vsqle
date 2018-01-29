const express = require('express')
const router = express.Router()
const url = require('url')
const fetch = require('node-fetch')


const sendMw = (res,object) => res.send(JSON.stringify(object))

router.post('/', (req, res, next) => {
	
	console.log("body:", req.body)
	
	let { query, host, user, password } = req.body
	const port = req.body.port || 8080
	
	query = query.split('"').join('\\"')
	query = query.split('%').join('%25')
	
	const params = [
		`Procedure=@AdHoc`,
		`Parameters=["${encodeURIComponent(query)}"]`,
		`User=${encodeURIComponent(user)}`,
		`Password=${encodeURIComponent(password)}`,
	]
	
  const queryURL = decodeURI(`http://${host}:${port}/api/1.0/?`+params.join("&"))
	let resolved = false
	
	console.log ( "\nurl: ", queryURL )
	console.log ( "\nquery: <", query ,">")
	
   fetch(queryURL).then( response => {
		response.json().then( json =>{
			if ( resolved ) return
			resolved = true
			
			console.log(json)
			if ( json.status == 1 ) sendMw(res, json.results[0]) 
			else sendMw(res, { error: json.statusstring })
		})
   }).catch( err => {
		console.log("Error: ")
	})
	
	setTimeout( () => {
		if ( resolved ) return
		resolved = true
		
		console.log("TIMEOUT")
		
		sendMw(res, { error: 'Timeout' })
	}, req.body.timeout - 50)
	
})

module.exports = router