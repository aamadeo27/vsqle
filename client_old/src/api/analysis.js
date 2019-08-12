import  { execStoredProcedure } from './query-utils';

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

	sample: parseInt(row[schema.sample],10)
})

export const analyze = async (queryConfig, variables) => {
	delete queryConfig.analyze
	let buffer = []

	try {
		queryConfig.invocation = `@Statistics 'PROCEDUREDETAIL' 0i` //procedure
		let { results, error } = await execStoredProcedure(queryConfig, variables)

		queryConfig.query = queryConfig.procedure
	
		if ( error ){
			return { queryConfig, error }
		}

		buffer = results[0].data
	} catch (err){
    console.error(err);
    return ({ queryConfig, error: err });
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
			total += parseInt(e.sample, 10);

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