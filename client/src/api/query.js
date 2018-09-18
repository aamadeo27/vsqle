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

	let groupByStr = -1
	if ( queryString.match(new RegExp(regexpStr + "group by(.+)","i")) ){
		regexpStr += "group by(.+)"
		groupByStr = currPos++
	}

	let havingStr = -1
	if ( queryString.match(new RegExp(regexpStr + "having(.+)","i")) ){
		regexpStr += "having(.+)"
		havingStr = currPos++
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
		groupBy: matches[groupByStr],
		having: matches[havingStr],
		ordered: orderStr > -1,
		limit: parseInt(matches[limitStr] || 7,10),
		offset: parseInt(matches[offsetStr] || 0,10)
	}
	
	return select
}

const describe = (queryConfig, schema) => new Promise( (resolve, reject) => {
	if ( ! schema.tables ) resolve({ queryConfig, error: 'Schema not loaded' })

	const table = queryConfig.table.toLowerCase()
	if ( !schema.tables[table] ) resolve({ queryConfig, error: "Table doesn't exists" })

	resolve({
		queryConfig,
		describe: true,
		table: {
			columns: schema.tables[table],
			pk: schema.pks[table]
		}
	})
})

// exec @AdHoc 'select * from dual' 123 456L
const nameRegex = /^([@\w\d\.]+)/
const argsRegex = /(?:\s+('.*?'[tT]?|\d+[LliI]|\d+\.\d+[FfDd]|\{.+\}))/g
const execStoreProcedure = (queryConfig, variables) => {
	let buffer = trimQuery(queryConfig.invocation)

	console.log(1, buffer)
	buffer = parseQuery(buffer, variables)
	console.log(2, buffer)

	const procedure = buffer.match(nameRegex)[1]
	buffer = buffer.replace(procedure,'')
	console.log(3, buffer)

	buffer = buffer.replace(/''/g,'#SINGLEQUOTES#');
	let args = buffer.match(argsRegex)
	args = args.map( arg => arg.replace(/#SINGLEQUOTES#/g,"'") );
	console.log(args)

	if ( ! args ) args = []

	args = args.map( e => e.substring(1))

	queryConfig.query = `${procedure}(${args.join(",")})`

	return api.execStoreProcedure({ procedure, args }).then ( response => {

		if ( response.error ){
			localStorage.setItem("LastResponse", JSON.stringify(response.error))
			return { queryConfig, error: response.error }
		} else {
			return { queryConfig, results: response }
		}
	})
}

const schema = {
	node:1,
	partition: 4,
	procedure: 5,
	statement: 6,
	
	sample: 8,

	minTime: 9,
	maxTime: 10,
	avgTime: 11,
}
const parseAnalysis = row => ({
	partition: row[schema.partition],
	node: row[schema.node],
	statement: row[schema.statement],
	
	time: {
		min: row[schema.minTime],
		avg: row[schema.avgTime],
		max: row[schema.maxTime]
	},

	sample: row[schema.sample]
})

const analyze = async (queryConfig, variables) => {
	delete queryConfig.analyze
	let buffer = []

	try {
		queryConfig.invocation = `@Statistics 'PROCEDUREDETAIL' 0i` //procedure
		let { result, error } = await execStoreProcedure(queryConfig, variables)

		queryConfig.query = queryConfig.procedure
	
		if ( error ){
			return { queryConfig, error }
		}

		buffer = result.data
	} catch (err){
		console.error(err)
	}

	const analysis = {
		procedure: queryConfig.procedure,
		partition: [],
		node: [],
		statement: [],
		all: []
	}

	buffer = buffer.filter( row => row[schema.procedure].match(queryConfig.procedure) )

	if ( buffer.length === 0 ){
		return { queryConfig, error: "No data found" }
	}

	buffer.forEach( e => {
		const row = parseAnalysis(e)

		if ( analysis.partition[row.partition] ) analysis.partition[row.partition].push(row)
		else analysis.partition[row.partition] = [row]

		if ( analysis.node[row.node] ) analysis.node[row.node].push(row)
		else analysis.node[row.node] = [row]

		if ( analysis.statement[row.statement] ) analysis.statement[row.statement].push(row)
		else analysis.statement[row.statement] = [row]
	})

	analysis.partition.forEach( pt => {
		let sum = 0
		let total = 0
		let min = Number.MAX_SAFE_INTEGER
		let max = Number.MIN_SAFE_INTEGER

		pt.forEach( e => {
			if ( e.statement !== '<ALL>' ) return 

			sum += e.time.avg * e.sample
			total += e.sample

			if ( e.time.min < min ) min = e.time.min
			if ( e.time.max > max ) max = e.time.max
		})

		pt['summary'] = {
			sample: total,
			time: { min, max, avg: sum / total }
		}
	})

	analysis.node.forEach( node => {
		let sum = 0
		let total = 0
		let min = Number.MAX_SAFE_INTEGER
		let max = Number.MIN_SAFE_INTEGER

		node.forEach( e => {
			if ( e.statement !== '<ALL>' ) return 

			sum += e.time.avg * e.sample
			total += e.sample

			if ( e.time.min < min ) min = e.time.min
			if ( e.time.max > max ) max = e.time.max
		})

		node['summary'] = {
			sample: total,
			time: { min, max, avg: sum / total }
		}
	})

	const list = []
	for( let name in analysis.statement ){
		list.push(analysis.statement[name])
	}
	analysis.statement = list

	analysis.statement.forEach( statement => {
		if ( statement[0].statement === '<ALL>' ) return

		let sum = 0
		let total = 0
		let min = Number.MAX_SAFE_INTEGER
		let max = Number.MIN_SAFE_INTEGER

		statement.forEach( e => {
			sum += e.time.avg * e.sample
			total += e.sample

			if ( e.time.min < min ) min = e.time.min
			if ( e.time.max > max ) max = e.time.max

			analysis.all.push(e)
		})

		statement['summary'] = {
			name: statement[0].statement,
			sample: total,
			time: { min, max, avg: sum / total }
		}
	})

	let sum = 0
	let total = 0
	let min = Number.MAX_SAFE_INTEGER
	let max = Number.MIN_SAFE_INTEGER

	analysis.statement[0].forEach( e => {
		console.debug("all", e.time, e.sample)
		sum += e.time.avg * e.sample
		total += e.sample

		if ( e.time.min < min ) min = e.time.min
		if ( e.time.max > max ) max = e.time.max
	})

	analysis.statement = analysis.statement.filter( s => s[0].statement !== '<ALL>')

	analysis.summary = {
		sample: total,
		time: { min, max, avg: sum / total }
	}

	return { queryConfig, analysis }
}

export const executeQuery = (queryConfig, schema, variables, trim = true) => {
	if ( queryConfig.describe ){
		return describe(queryConfig, schema)
	} else if ( queryConfig.exec ){
		return execStoreProcedure( queryConfig, variables )
	} else if ( queryConfig.analyze ){
		return analyze( queryConfig, variables )
	}

	let query = trim ? trimQuery(queryConfig.query) : queryConfig.query;

	if ( queryConfig.paginable ){
		query += queryConfig.limit ? (" limit " + queryConfig.limit) : ""
		query += " offset " + queryConfig.offset
	}

	return api.executeQuery(query).then ( response => {
		if ( response.error ){
			return { queryConfig, error: response.error }
		} else {
			console.log( "response", response )

			return { queryConfig, results: response }
		}
	})
}

export const handleResponse = (data, logout, addResult) => {
	if (data.error){
		if ( data.error === 'Not logged in' ){
			logout()
		}
		
		addResult(data)
	} else if ( data.describe || data.analyze) {
		addResult(data);
	} else {
		if ( data.results.length === 1) return addResult({ queryConfig: data.queryConfig, result: data.results[0] });

		data.results.forEach( (result,i) => {
			const name = ( data.queryConfig.name || data.queryConfig.invocation ) + ':' + i;
			const queryConfig = {...data.queryConfig, name };
			
			addResult( { queryConfig, result });
		});
	}
}

const prepareQueries = (queries, schema) => {
	const queue = []

	queries.forEach( query => {
		if ( query.length === 0 ) return
		const queryConfig = { id: queue.length, paginable: false }
		const selectRegex = /^\s*select .+ from .+/i
		const describeRegex = /^\s*describe\s+(.+)\s*/i
		const execRegex = /^\s*exec\s+(.+)\s*/i
		const analyzeRegex = /^\s*analyze\s+(.+)\s*/i

		const describeQuery = query.match(describeRegex)
		const execQuery = query.match(execRegex)
		const analyzeQuery = query.match(analyzeRegex)

		if ( describeQuery ){
			queryConfig.describe = true
			queryConfig.table = describeQuery[1]
		} else if ( execQuery ) {
			queryConfig.exec = true
			queryConfig.invocation = execQuery[1]
		} else if ( analyzeQuery ) {
			queryConfig.analyze = true
			queryConfig.procedure = analyzeQuery[1]
		} else if ( query.match(selectRegex) ){
			let select = getSelectInfo(query)

			queryConfig.select = select
			queryConfig.paginable = !select.groupBy;			
			queryConfig.limit = select.limit;
			queryConfig.offset = select.offset;
			
			if ( queryConfig.paginable ){
				query = query.replace(/offset .+/i,"")
				query = query.replace(/limit .+/i,"")
				
			}
			
			if (! select.ordered ){
				if ( query.match(/select\s+.*\*/) ){
					try {
						let orderBy = null;

						if ( select.groupBy ){
							orderBy = select.groupBy;
						} else {
							const alias = select.from[0].alias;
							const firstCol = schema.tables[select.from[0].table][1].name;
							orderBy = ( !alias ? select.from[0].table : alias ) + '.' + firstCol;	
						}

						query = `${query} order by ${orderBy}`;
	
						console.debug("Query:", query)
					} catch ( err ){
						console.error(err)
					}
				}
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

const executeSQL = (editor, variables, schema, asyncExec = true) => {
	const editorContent = editor.getValue()
	const curPos = editor.getCursorPosition()

	let queryString = editor.getSelectedText()
        
	if ( queryString === undefined || queryString === '' ) {
		queryString = editor.getValue()
	}

	queryString = parseQuery( queryString, variables )

	editor.setValue(IGNORE_PATTERN + queryString)
	const queue = prepareQueries( getAllQueries(editor), schema )

	editor.setValue(editorContent)
	editor.selection.clearSelection()
	editor.selection.moveCursorTo(curPos.row, curPos.column)

	if ( asyncExec ){
		const queryPromises = []
		queue.forEach( query => queryPromises.push(executeQuery(query, schema, variables)) )

		return queryPromises
	}

	return queue;
}

export const executeLine = (editor, variables, schema) => {
	const curPos = editor.getCursorPosition()
	let query = getQueryInLine(editor, curPos).content

	if ( query.charAt(query.length-1) === ';' ){
		query = query.substring(0,query.length-1)
	}

	query = parseQuery( query, variables )

	const queue = prepareQueries([query], schema)

	const queryPromises = []

	queue.forEach( query => queryPromises.push(executeQuery(query, schema, variables)) )

	console.log("Executing : ", queue[0])

	return queryPromises[0]
}

export const executeBatch = (editor, variables, schema ) => {
	const editorContent = editor.getValue()
	const curPos = editor.getCursorPosition()

	let queryString = editor.getSelectedText()
        
	if ( queryString === undefined || queryString === '' ) {
		queryString = editor.getValue()
	}

	queryString = parseQuery( queryString, variables )

	editor.setValue(IGNORE_PATTERN + queryString)
	
	const queryConfig = { id: 0, paginable: false }
	queryConfig.query = queryString + ";\n"
	queryConfig.name = 'Batch Execution'

	editor.setValue(editorContent)
	editor.selection.clearSelection()
	editor.selection.moveCursorTo(curPos.row, curPos.column)

	return executeQuery(queryConfig, schema, variables, false)
}

export const execute = (editor, variables, schema, asyncExecution) => 
		executeSQL( editor, variables, schema, asyncExecution )