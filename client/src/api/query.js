import { IGNORE_PATTERN, CONNECTION_ERROR, TIMEOUT_ERROR } from '../Constants.js'

const trimQuery = query => query.replace(IGNORE_PATTERN,'').replace(/\n/g,' ').replace(/^\s+|\s+$/g, '')

const parseQuery = (inputString, variables) => {
	let queryString = inputString
	
	/* Variable Replacing */
	variables.forEach( variable => {
		if ( queryString.indexOf("${"+variable.name+"}" ) === -1) return
		
		console.log("Replacing", "${" + variable.name + "}")
		queryString = queryString.split("${" + variable.name + "}").join(variable.value)
	})
	
	return queryString
}

const getQueryInLine = (editor, { row, column }) => {
	let queryString = ""
	let done = false
	let skip = true
	let lastToken = false
	
	if ( column === null ) column = 0
	
	while(! done){
		let tokens = editor.session.getTokens(row)
		lastToken = tokens.length === 0
		let currColumn = 0
		
		for(let i = 0; i < tokens.length; i++){
			currColumn += tokens[i].length
			lastToken = (i === tokens.length - 1)
			
			if ( currColumn <= column && skip) continue
			else skip = false
			
			queryString += (tokens[i].type === 'comment') ? "" : tokens[i].value
			
			if ( tokens[i].type === 'text' && tokens[i].value.indexOf(';') >= 0 ){
				done = true
				break
			}
		}
		
		if ( ! done ){
			if ( (editor.session.getLength() - 1) === row ) {
				break
			}
			
			queryString += "\n"
			row++
		}
	}
	
	return {
		content: queryString,
		row: row + (lastToken ? 1 : 0),
		column: lastToken ? 0 : queryString.length -1
	}
}

const getAllQueries = editor => {
	const queries = []
	let pos = { row: 0, column: 0 }
	
	while( true ){
		let querySection = getQueryInLine(editor, pos)
		queries.push ( trimQuery(querySection.content).replace(";","") )
		
		let { row, column } = querySection
		pos = { row, column }
		
		if ( querySection.row === editor.session.getLength() ) break
	}
	
	return queries
}

const getSelectInfo = queryString => {
	let regexpStr = "from(.+)"

	let fromStr = 1
	let currPos = 2

	let whereStr = -1
	if ( queryString.match(new RegExp(regexpStr + "where(.+)","i")) ){
		regexpStr += "where(.+)"
		whereStr = currPos++
	}

	let orderStr = -1
	if ( queryString.match(new RegExp(regexpStr + "order by(.+)","i")) ){
		regexpStr += "order by(.+)"
		orderStr = currPos++
	}
	
	var limitStr = -1
	if ( queryString.match(new RegExp(regexpStr + "limit(.+)","i")) ){
		regexpStr += "limit(.+)"
		limitStr = currPos++
	}
	
	var offsetStr = -1
	if ( queryString.match(new RegExp(regexpStr + "offset(.+)","i")) ){
		regexpStr += "offset(.+)"
		offsetStr = currPos++
	}
	
	var matches = queryString.match(new RegExp(regexpStr,"i"))

	console.log({matches, fromStr, regexpStr, queryString})
	
	fromStr = matches[fromStr].split(",")
	fromStr = fromStr.map( e => {
		e = e.replace(/^\s+/g, '').split(" ")
		return { table: e[0].toLowerCase(), alias: e[1] }
	})
	
	var select = {
		original: queryString,
		from: fromStr,
		where: matches[whereStr],
		ordered: orderStr > -1,
		limit: parseInt(matches[limitStr] || 7,10),
		offset: parseInt(matches[offsetStr] || 0,10)
	}
	
	return select
}

const url = `http://${window.location.host}/query`

const describe = (queryConfig, schema) => new Promise( (resolve, reject) => {
	if ( ! schema.tables ) resolve({ queryConfig, error: 'Schema not loaded' })

	if ( !schema.tables[queryConfig.table] ) resolve({ queryConfig, error: "Table doesn't exists" })

	resolve({
		queryConfig,
		describe: true,
		table: {
			columns: schema.tables[queryConfig.table],
			pk: schema.pks[queryConfig.table]
		}
	})
})

export const executeQuery = (queryConfig, serverConfig, schema) => {

	if ( queryConfig.describe ){
		return describe(queryConfig, schema)
	}

	let query = trimQuery(queryConfig.query)

	if ( queryConfig.paginable ){
		query += queryConfig.limit ? (" limit " + queryConfig.limit) : ""
		query += " offset " + queryConfig.offset
	}

	const headers = new Headers()
	headers.append('Accept','application/json')
  	headers.append('Content-Type','application/json') 

	const conf = { 
		method: 'POST',
		headers,
		body: JSON.stringify( Object.assign({}, serverConfig, { query }) )
	}

	console.log({ query })

	return new Promise( (resolve, reject) => {
		fetch(url, conf).then( response => {
			response.json().then( json =>  ( json.error 
				? resolve({ queryConfig, error: json.error })
				: resolve({ queryConfig, result: json }) 
			))
		}).catch( reason => 
			resolve({ queryConfig, error: CONNECTION_ERROR })
		)

		console.log("ServerConfig", serverConfig)
		setTimeout(
			() => resolve({ queryConfig, error: TIMEOUT_ERROR }),
			serverConfig.timeout || 5000
		)
	}).then( x => { console.log("Response: ", x) ; return x })
}

const prepareQueries = queries => {
	const queue = []

	queries.forEach( query => {
		if ( query.length === 0 ) return
		const queryConfig = { id: queue.length, paginable: false }
		const selectRegex = /^\s*select .+ from .+/i
		const describeRegex = /^\s*describe\s+(.+)\s*/i

		console.log({ query })

		const describeQuery = query.match(describeRegex)
		if ( describeQuery ){
			queryConfig.describe = true
			queryConfig.table = describeQuery[1]

		} else if ( query.match(selectRegex) ){
			let select = getSelectInfo(query)

			queryConfig.paginable = true
			queryConfig.select = select
			
			queryConfig.limit = select.limit
			queryConfig.offset = select.offset
			
			query = query.replace(/offset .+/i,"")
			query = query.replace(/limit .+/i,"")
			
			if (! select.ordered ){
				/*
				const alias = select.from[0].alias

				query += " order by " +	( alias === undefined || alias.length === 0 ? select.from[0].table : alias )																				
				query += "." + getColumns(select.from[0].table)[0]
				*/
			}
			
			queryConfig.query = query
		} else {
			queryConfig.paginable = false
			queryConfig.query = query + ";\n"
		}

		queue.push(queryConfig)
	})
	
	return queue
}

const executeSQL = (editor, config, variables, schema) => {
	const editorContent = editor.getValue()
	const curPos = editor.getCursorPosition()

	let queryString = editor.getSelectedText()
        
	if ( queryString === undefined || queryString === '' ) {
			queryString = editor.getValue()
	}

  queryString = parseQuery( queryString, variables )

  editor.setValue(IGNORE_PATTERN + queryString)
	const queue = prepareQueries( getAllQueries(editor) )
	
	const queryPromises = []
	queue.forEach( query => queryPromises.push(executeQuery(query, config, schema)) )
    
  editor.setValue(editorContent)
	editor.selection.clearSelection()
	editor.selection.moveCursorTo(curPos.row, curPos.column)

	return queryPromises
}

export const executeLine = (editor, config, variables, schema) => {
	const curPos = editor.getCursorPosition()
  let query = getQueryInLine(editor, curPos).content

	if ( query.charAt(query.length-1) === ';' ){
		query = query.substring(0,query.length-1)
	}

	const queue = prepareQueries([query])

	const queryPromises = []

	queue.forEach( query => queryPromises.push(executeQuery(query, config)) )

	console.log("Executing : ", queue[0])

	return executeQuery(queue[0],config, schema)
}

export const execute = (editor, config, variables, schema) => executeSQL( editor, config, variables, schema )