import * as api from './api';

const loadObject = object => api.loadObject(object).then ( response => {
	if ( response.error){
		return { error: response.error };
	} else {
		return response;
	}
});


const parseTables = (tableList, schema) => {
	tableList.data.forEach((tableEntry, i) => {
		const name = tableEntry[2].toLowerCase();
		const type = tableEntry[3].toLowerCase();
		const remarks = JSON.parse(tableEntry[4]);
    
		let table = schema.tables[name];

		if ( table === undefined ) {
			schema.tables[name] = { columns: [], pks: [] };
			table = schema.tables[name];
		}
		
		Object.assign(table, { name, type, remarks });
	});
  
	schema.tableInfo = true;
};

const parseColumns = (columnList, schema) => {
	schema.columns = [];

	columnList.data.forEach( (column,i) => {
		const tableName = column[2].toLowerCase();
		let table = schema.tables[tableName];

		if ( table === undefined ) {
			schema.tables[tableName] = { columns: [], pks: [] };
			table = schema.tables[tableName];
		}

		table.columns[column[16]-1] = { 
			name: column[3].toLowerCase(),
			type: column[5].toLowerCase(),
			size: column[6],
			partitionKey: column[11] === 'PARTITION_COLUMN',
			nullable: column[17] === 'YES'
		};

		schema.columns.push(column[3].toLowerCase());
	});
};

const parsePrimaryKeys = (pkList, schema) => {
	pkList.data.forEach((column, i) => {
		const tableName = column[2].toLowerCase();
		const name = column[3].toLowerCase();
		const position = column[4];

		let table = schema.tables[tableName];

		if ( table === undefined ) {
			schema.tables[tableName] = { columns: [], pks: [] };
			table = schema.tables[tableName];
		}
    
		if ( !table.pkOrder ){ 
			table.pkOrder = column[5].substring(22+1+tableName.length);
		}

		table.pks[position-1] = name;
	});

	schema.pks = true;
};

const parseProcedures = (procList, schema) => {
	procList.data.forEach( (column,i) => {
		let proc = schema.procedures[column[2]];

		if ( proc === undefined ) {
			schema.procedures[column[2]] = [];
			proc = schema.procedures[column[2]];
		}

		proc[column[17]] = { type: column[6] };
    
		if ( column[12] === 'PARTITION_PARAMETER' ){
			proc[column[17]].partitionParameter = true;
		}
	});
};

const parseIndexInfo = (indexColumnList, schema) => {
	indexColumnList.data.forEach( (column,i) => {
		const name = column[5];
		const table = column[2].toLowerCase();
		const idx = column[7] - 1;
		const columnName = column[8].toLowerCase();
		const pkIndex = !!name.match(/^VOLTDB_AUTOGEN_IDX_PK_.+/);

		let indexPos = schema.indexInfo.findIndex( i => i.name === name );
		if ( indexPos < 0 ) {
			indexPos = schema.indexInfo.length;
			schema.indexInfo[indexPos] = { name, table, columns: [], pkIndex };
		}

		schema.indexInfo[indexPos].columns[idx] = columnName;
	});
};

export const load = handleError => {
	const schema = {
		tables: {},
		tableInfo: false,
		procedures: false,
		pks: false,
		columns: false,
		indexInfo: false
	};

	const afterLoad = (name, objectList, resolve, reject) => {
		if ( objectList.error ){
			console.error('Load Schema Error', objectList);
			return;
		}

		if ( name === 'tables' ){
			schema.tables = schema.tables || {};
			parseTables(objectList, schema);
		} else if ( name === 'columns'){
			schema.columns = {};
			parseColumns(objectList, schema);
		} else if ( name === 'pks' ){
			schema.pks = {};
			parsePrimaryKeys(objectList, schema);
		} else if ( name === 'procedures' ){
			schema.procedures = {};
			parseProcedures(objectList, schema);
		} else if ( name === 'indexInfo' ){
			schema.indexInfo = [];
			parseIndexInfo(objectList, schema);
		}

		if (  schema.tables && 
				schema.tableInfo &&
				schema.procedures &&
				schema.pks &&
				schema.columns &&
				schema.indexInfo ){

			delete schema.tableInfo;
			delete schema.pks;

			schema.indexInfo.forEach( index => {
				const table = schema.tables[index.table];

				table.indexes = table.indexes || [index];

				if ( index.pkIndex ) table.pks = index.columns;
			});

			delete schema.indexInfo;

			console.log('Resolved Schema', schema);

			resolve(schema);
		}
	};

	const job = (resolve, reject) => {
		loadObject('PROCEDURECOLUMNS').then( procedures => 
			afterLoad('procedures', procedures, resolve, reject)
		).catch( err => reject(err) );

		loadObject('TABLES').then( tables => 
			afterLoad('tables', tables, resolve, reject)
		).catch( err => reject(err));

		loadObject('COLUMNS').then( columns => 
			afterLoad('columns', columns, resolve, reject)
		).catch( err => reject(err) );

		loadObject('PRIMARYKEYS').then( columns => 
			afterLoad('pks', columns, resolve, reject)
		).catch( err => reject(err) );
		
		loadObject('INDEXINFO').then( indexColumns => 
			afterLoad('indexInfo', indexColumns, resolve, reject)
		).catch( err => reject(err) );
	};

	return new Promise(job).catch( handleError );
};