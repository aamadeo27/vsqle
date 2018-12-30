import { IGNORE_PATTERN } from '../Constants.js';
import * as api from './api';

export const trimQuery = query => query.replace(IGNORE_PATTERN,'').replace(/\n/g,' ').replace(/^\s+|\s+$/g, '')

export const parseQuery = (inputString, variables) => {
	let queryString = inputString
	
	/* Variable Replacing */
	variables.forEach( variable => {
		if ( queryString.indexOf("${"+variable.name+"}" ) === -1) return
		
		console.debug("Replacing", "${" + variable.name + "}")
		queryString = queryString.split("${" + variable.name + "}").join(variable.value)
	})
	
	return queryString
}

export const getQueryInLine = (editor, { row, column }) => {
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

export const getAllQueries = editor => {
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

export const getSelectInfo = queryString => {
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

// exec @AdHoc 'select * from dual' 123 456L
const nameRegex = /^([@\w\d\.]+)/
const argsRegex = /(?:\s+('.*?'[tT]?|\d+[LliI]|\d+\.\d+[FfDd]|\{.+\}))/g
export const execStoredProcedure = (queryConfig, variables) => {
	let buffer = trimQuery(queryConfig.invocation)
	buffer = parseQuery(buffer, variables)

	const procedure = buffer.match(nameRegex)[1]
  buffer = buffer.replace(procedure,'')

  let args = []

  if ( buffer.length > 0 ){
    buffer = buffer.replace(/''/g,'#SINGLEQUOTES#');
    args = buffer.match(argsRegex)
  }
  
  console.log({
    args,
    argsRegex,
    buffer
  })

	args = args.map( arg => arg.replace(/#SINGLEQUOTES#/g,"'") );

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