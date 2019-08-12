import { IGNORE_PATTERN } from '../Constants.js';
import * as api from './api';

import { 
	trimQuery, getSelectInfo, parseQuery, 
	getQueryInLine, getAllQueries, execStoredProcedure 
} from './query-utils';
import { analyze } from './analysis';


/***************************TOP LEVEL********************************/

const executeSQL = (editor, variables, schema, asyncExec = true) => {
	const editorContent = editor.getValue();
	const curPos = editor.getCursorPosition();

	let queryString = editor.getSelectedText();
        
	if ( queryString === undefined || queryString === '' ) {
		queryString = editor.getValue();
	}

	queryString = parseQuery( queryString, variables );

	editor.setValue(IGNORE_PATTERN + queryString);
	const queue = prepareQueries( getAllQueries(editor), schema );

	editor.setValue(editorContent);
	editor.selection.clearSelection();
	editor.selection.moveCursorTo(curPos.row, curPos.column);

	if ( asyncExec ){
		const queryPromises = [];
		queue.forEach( query => queryPromises.push(executeQuery(query, schema, variables)) );

		return queryPromises;
	}

	return queue;
};

export const executeLine = (editor, variables, schema) => {
	const curPos = editor.getCursorPosition();
	let query = getQueryInLine(editor, curPos).content;

	if ( query.charAt(query.length-1) === ';' ){
		query = query.substring(0,query.length-1);
	}

	query = parseQuery( query, variables );

	const queue = prepareQueries([query], schema);

	const queryPromises = [];

	queue.forEach( query => queryPromises.push(executeQuery(query, schema, variables)) );

	console.log('Executing : ', queue[0]);

	return queryPromises[0];
};

export const executeBatch = (editor, variables, schema ) => {
	const editorContent = editor.getValue();
	const curPos = editor.getCursorPosition();

	let queryString = editor.getSelectedText();
        
	if ( queryString === undefined || queryString === '' ) {
		queryString = editor.getValue();
	}

	queryString = parseQuery( queryString, variables );

	editor.setValue(IGNORE_PATTERN + queryString);
	
	const queryConfig = { id: 0, paginable: false };
	queryConfig.query = queryString + ';\n';
	queryConfig.name = 'Batch Execution';

	editor.setValue(editorContent);
	editor.selection.clearSelection();
	editor.selection.moveCursorTo(curPos.row, curPos.column);

	return executeQuery(queryConfig, schema, variables, false);
};

export const execute = (editor, variables, schema, asyncExecution) => 
	executeSQL( editor, variables, schema, asyncExecution );

export const handleResponse = (data, logout, addResult) => {
	if (data.error){
		if ( data.error === 'Not logged in' ) logout();

		
		addResult(data);
	} else if ( data.describe || data.analysis || data.explain) {
		addResult(data);
	} else {
		if ( data.results.length === 1) return addResult({ queryConfig: data.queryConfig, result: data.results[0] });

		data.results.forEach( (result,i) => {
			const name = ( data.queryConfig.name || data.queryConfig.invocation ) + ':' + i;
			const queryConfig = {...data.queryConfig, name };
			
			addResult( { queryConfig, result });
		});
	}
};

    
/*************************** LEVEL-1 ********************************/

const prepareQueries = (queries, schema) => {
	const queue = [];

	queries.forEach( query => {
		if ( query.length === 0 ) return;
		const queryConfig = { id: queue.length, paginable: false };
		const selectRegex = /^\s*select .+ from .+/i;
		const describeRegex = /^\s*describe\s+(.+)\s*/i;
		const execRegex = /^\s*exec\s+(.+)\s*/i;
		const analyzeRegex = /^\s*analyze\s+(.+)\s*/i;
		const explainRegex = /^\s*explain\s+(.+)\s*/i;

		const describeQuery = query.match(describeRegex);
		const execQuery = query.match(execRegex);
		const analyzeQuery = query.match(analyzeRegex);
		const explainQuery = query.match(explainRegex);

		if ( describeQuery ){
			queryConfig.describe = true;
			queryConfig.table = describeQuery[1];
      
		} else if ( execQuery ) {
			queryConfig.exec = true;
			queryConfig.invocation = execQuery[1];
      
		} else if ( explainQuery ) {
			queryConfig.explain = true;
			queryConfig.object = explainQuery[1];

		} else if ( analyzeQuery ) {
			queryConfig.analyze = true;
			queryConfig.procedure = analyzeQuery[1];
      
		} else if ( query.match(selectRegex) ){
			let select = getSelectInfo(query);

			queryConfig.select = select;
			queryConfig.paginable = !select.groupBy;			
			queryConfig.limit = select.limit;
			queryConfig.offset = select.offset;
			
			if ( queryConfig.paginable ){
				query = query.replace(/offset .+/i,'');
				query = query.replace(/limit .+/i,'');
				
			}
			
			if (! select.ordered ){
				if ( query.match(/select\s+.*\*/) ){
					try {
						let orderBy = null;

						if ( select.groupBy ){
							orderBy = select.groupBy;
						} else {
							orderBy = 1;	
						}

						query = `${query} order by ${orderBy}`;
	
						console.debug('Query:', query);
					} catch ( err ){
						console.error(err);
					}
				}
			}
			
			queryConfig.query = query;
		} else {
			queryConfig.paginable = false;
			queryConfig.query = query + ';\n';
		}

		queue.push(queryConfig);
	});
	
	return queue;
};

export const executeQuery = (queryConfig, schema, variables, trim = true) => {
	if ( queryConfig.describe ){
		return describe(queryConfig, schema);
	} else if ( queryConfig.exec ){
		return execStoredProcedure( queryConfig, variables );
	} else if ( queryConfig.analyze ){
		return analyze( queryConfig, variables );
	} else if ( queryConfig.explain ){
		return explain( queryConfig, schema);
	}

	let query = trim ? trimQuery(queryConfig.query) : queryConfig.query;

	if ( queryConfig.paginable ){
		query += queryConfig.limit ? (' limit ' + queryConfig.limit) : '';
		query += ' offset ' + queryConfig.offset;
	}

	return api.executeQuery(query).then ( response => {
		if ( response.error ){
			return { queryConfig, error: response.error };
		} else {
			console.log( 'response', response );

			return { queryConfig, results: response };
		}
	});
};

/*************************** LEVEL-2 ********************************/

const describe = (queryConfig, schema) => new Promise( (resolve, reject) => {
	if ( ! schema.tables ) resolve({ queryConfig, error: 'Schema not loaded' });

	const table = queryConfig.table.toLowerCase();
	if ( !schema.tables[table] ) resolve({ queryConfig, error: 'Table doesn\'t exists' });
  
	console.log('DESC', schema.tables[table]);

	resolve({
		queryConfig,
		describe: true,
		table: schema.tables[table]
	});
});

const explain = async (queryConfig, schema) => {
	if ( !schema.procedures ) return ({ queryConfig, error: 'Schema not loaded' });

	let explainProc = '@Explain';
	if ( schema.procedures[queryConfig.object] ){
		explainProc += 'Proc';
	}

	let buffer = null;
	try {
		queryConfig.invocation = `${explainProc} '${queryConfig.object}'`;
		let { results, error } = await execStoredProcedure(queryConfig, []);

		queryConfig.query = 'explain ' + queryConfig.object;
		if ( error ){
			return { queryConfig, error };
		}

		buffer = results[0].data;
	} catch (err){
		console.error(err);
	}

	let queries = [];
	if ( buffer.length > 0 ){
		if ( buffer[0].length === 3) { //
			queries = buffer.map( ([ name, sql, executionPlan ]) => ({ name, sql, executionPlan }) );
		} else if ( buffer[0].length === 2) { //no name
			queries = buffer.map( ([ sql, executionPlan ], i) => ({ name: 'sql'+i, sql, executionPlan }) );
		} else { //plan only
			const sql = queryConfig.object;
			queries = buffer.map( ([ executionPlan ], i) => ({ name: 'sql'+i, sql, executionPlan }) );
		}
	}

	console.log(buffer);

	return ({
		queryConfig,
		explain: true,
		queries
	});
};