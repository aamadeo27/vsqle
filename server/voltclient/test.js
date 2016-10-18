const client = require('./client')
const loginInfo = { username: 'voltdb', password: 'voltdb' }

client.connect(loginInfo)

const executeQuery = query => {
	if ( client.connected ){
		console.log(client)
		client.execute(query)
	} else {
		console.log("waiting")
		setTimeout(() => executeQuery(query), 1000)
	}
}

executeQuery("select * from saldos");