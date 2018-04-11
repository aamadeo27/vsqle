import { IGNORE_PATTERN } from '../Constants.js'
import * as api from './api'
const trimQuery = query => query.replace(IGNORE_PATTERN,'').replace(/\n/g,' ').replace(/^\s+|\s+$/g, '')

const parseQuery = (inputString, variables) => {
	let queryString = inputString
	
	/* Variable Replacing */
	variables.forEach( variable => {
		if ( queryString.indexOf("${"+variable.name+"}" ) === -1) return
		
		console.debug("Replacing", "${" + variable.name + "}")
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
		queries.push ( trimQuery(querySection.content).replace(/;\s*$/,"") )
		
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

// exec @AdHoc 'select * from dual' 123 456L
const nameRegex = /^([@\w\d]+)/
const argsRegex = /(?:\s+('.*'[tT]?|\d+[LliIFf]|\d+\.\d+[FfDd]|\{.+\}))/g
const execStoreProcedure = (queryConfig, variables) => {
	let buffer = trimQuery(queryConfig.invocation)
	buffer = parseQuery(buffer, variables)

	const procedure = buffer.match(nameRegex)[1]
	buffer = buffer.replace(procedure,'')

	let args = buffer.match(argsRegex)

	if ( ! args ) args = []

	args = args.map( e => e.substring(1))

	queryConfig.query = `${procedure}(${args.join(",")})`

	return api.execStoreProcedure({ procedure, args }).then ( response => {

		if ( response.error ){
			localStorage.setItem("LastResponse", JSON.stringify(response.error))
			return { queryConfig, error: response.error }
		} else {
			return { queryConfig, result: response }
		}
	})
}

//Todo: quitar serverConfig
export const executeQuery = (queryConfig, serverConfig, schema, variables) => {
	if ( queryConfig.describe ){
		return describe(queryConfig, schema)
	} else if ( queryConfig.exec ){
		return execStoreProcedure( queryConfig, variables )
	}

	let query = trimQuery(queryConfig.query)

	if ( queryConfig.paginable ){
		query += queryConfig.limit ? (" limit " + queryConfig.limit) : ""
		query += " offset " + queryConfig.offset
	}

	return api.executeQuery(query).then ( response => {
		if ( response.error ){
			return { queryConfig, error: response.error }
		} else {
			return { queryConfig, result: response }
		}
	})
}

const prepareQueries = queries => {
	const queue = []

	queries.forEach( query => {
		if ( query.length === 0 ) return
		const queryConfig = { id: queue.length, paginable: false }
		const selectRegex = /^\s*select .+ from .+/i
		const describeRegex = /^\s*describe\s+(.+)\s*/i
		const execRegex = /^\s*exec\s+(.+)\s*/i

		const describeQuery = query.match(describeRegex)
		const execQuery = query.match(execRegex)

		if ( describeQuery ){
			queryConfig.describe = true
			queryConfig.table = describeQuery[1]
		} else if ( execQuery ) {
			queryConfig.exec = true
			queryConfig.invocation = execQuery[1]
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
	queue.forEach( query => queryPromises.push(executeQuery(query, config, schema, variables)) )
    
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