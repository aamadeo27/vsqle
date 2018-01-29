
const url = `http://${window.location.host}/schema`

const headers = new Headers()
headers.append('Accept','application/json')
headers.append('Content-Type','application/json') 

const loadObject = body => {
	const conf = { 
		method: 'POST',
		headers,
		body: JSON.stringify( body )
	}

	return fetch(url, conf).then( response => response.json() )
}

export const load = serverConfig => {
	const schema = {
		tables: false,
		procedures: false,
		pks: false
	}

	const afterLoad = (name, object, resolve, reject) => {
		schema[name] = {}

		if ( object.error ){
			console.error(object.error)
			return
		}

		if ( name === 'tables'){
			schema.columns = []

			object.data.forEach( (column,i) => {
				const tableName = column[2].toLowerCase()
				let table = schema.tables[tableName]

				if ( table === undefined ) {
					schema.tables[tableName] = []
					table = schema.tables[tableName]
				}

				table[column[16]] = { 
					name: column[3].toLowerCase(),
					type: column[5].toLowerCase(),
					size: column[6],
					partitionKey: column[11] === 'PARTITION_COLUMN',
					nullable: column[17] === 'YES'
				}

				schema.columns.push(column[3].toLowerCase())
			})
		} else if ( name === "pks" ){
			object.data.forEach((column, i) =>{
				const tableName = column[2].toLowerCase()
				const name = column[3].toLowerCase()
				const position = column[4]

				let pks = schema.pks[tableName]

				if ( pks === undefined ) {
					schema.pks[tableName] = []
					pks = schema.pks[tableName]
				}

				pks[position] = name
			})
		} else {
			object.data.forEach( (column,i) => {
				let proc = schema.procedures[column[2]]

				if ( proc === undefined ) {
					schema.procedures[column[2]] = []
					proc = schema.procedures[column[2]]
				}

				proc[column[17]] = { name: column[6] }
			})
		}
		
		if ( schema.tables && schema.procedures && schema.pks){
			resolve(schema)
		}
	}

	const job = (resolve, reject) => {
		let body = Object.assign({}, serverConfig, { objectType: 'PROCEDURECOLUMNS' })
		loadObject(body).then( procedures => 
			afterLoad("procedures", procedures, resolve, reject)
		).catch( err => reject(err) )

		body = Object.assign({}, serverConfig, { objectType: 'COLUMNS' })
		loadObject(body).then( columns => 
			afterLoad("tables", columns, resolve, reject)
		).catch( err => reject(err) )


		body = Object.assign({}, serverConfig, { objectType: 'PRIMARYKEYS' })
		loadObject(body).then( columns => 
			afterLoad("pks", columns, resolve, reject)
		).catch( err => reject(err) )
	}

	return new Promise(job).catch( err => console.log(err))
}