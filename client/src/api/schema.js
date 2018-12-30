import * as api from './api'

const loadObject = object => api.loadObject(object).then ( response => {
	if ( response.error){
		return { error: response.error }
	} else {
		return response
	}
})

export const load = handleError => {
	const schema = {
    tables: {},
    tableInfo: false,
		procedures: false,
    pks: false,
    columns: false,
	}

	const afterLoad = (name, object, resolve, reject) => {
		if ( !schema[name] ) schema[name] = {}

		if ( object.error ){
			console.error("Load Schema Error", object)
			return
		}
    
		if ( name === "tables" ){
			object.data.forEach((tableEntry, i) => {
				const name = tableEntry[2].toLowerCase();
				const type = tableEntry[3].toLowerCase();
        const remarks = JSON.parse(tableEntry[4]);
        
        let table = schema.tables[name];

				if ( table === undefined ) {
					schema.tables[name] = { columns: [], pks: [] };
					table = schema.tables[name]
        }
        
        Object.assign(table, { name, type, remarks })
      });
      
      schema.tableInfo = true;
		} else if ( name === 'columns'){
			schema.columns = []

			object.data.forEach( (column,i) => {
				const tableName = column[2].toLowerCase()
				let table = schema.tables[tableName]

				if ( table === undefined ) {
					schema.tables[tableName] = { columns: [], pks: [] };
					table = schema.tables[tableName]
				}

				table.columns[column[16]-1] = { 
					name: column[3].toLowerCase(),
					type: column[5].toLowerCase(),
					size: column[6],
					partitionKey: column[11] === 'PARTITION_COLUMN',
					nullable: column[17] === 'YES'
				}

        schema.columns.push(column[3].toLowerCase())
      });

		} else if ( name === "pks" ){
			object.data.forEach((column, i) => {
				const tableName = column[2].toLowerCase()
				const name = column[3].toLowerCase()
				const position = column[4]

				let table = schema.tables[tableName]

				if ( table === undefined ) {
					schema.tables[tableName] = { columns: [], pks: [] };
					table = schema.tables[tableName];
				}

        table.pks[position-1] = name;
      });

      schema.pks = true;
		} else {
			object.data.forEach( (column,i) => {
				let proc = schema.procedures[column[2]]

				if ( proc === undefined ) {
					schema.procedures[column[2]] = []
					proc = schema.procedures[column[2]]
				}

				proc[column[17]] = { name: column[6] }
      });
		}
		
		if ( schema.tables && schema.tableInfo && schema.procedures && schema.pks && schema.columns ){
      delete schema.tableInfo;
      delete schema.pks;

			resolve(schema)
		}
	}

	const job = (resolve, reject) => {
		loadObject('PROCEDURECOLUMNS').then( procedures => 
			afterLoad("procedures", procedures, resolve, reject)
		).catch( err => reject(err) )

		loadObject('TABLES').then( tables => 
			afterLoad("tables", tables, resolve, reject)
		).catch( err => {
      console.error(err);
      reject(err);
    })

		loadObject('COLUMNS').then( columns => 
			afterLoad("columns", columns, resolve, reject)
		).catch( err => reject(err) )

		loadObject('PRIMARYKEYS').then( columns => 
			afterLoad("pks", columns, resolve, reject)
		).catch( err => reject(err) )
	}

	return new Promise(job).catch( handleError )
}