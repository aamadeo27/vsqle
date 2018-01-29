import React, { Component } from 'react'
import { Panel, Table, ButtonGroup, Button, DropdownButton, MenuItem, Glyphicon } from 'react-bootstrap'
import Download from '../common/Download.js'

export default class extends Component {
	constructor(props){
		super(props)
		this.state = { 
			expanded: props.queryConfig.id === 0,
			download: {
				csv: false,
				xls: false,
				sql: false
			}
		}
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	componentWillReceiveProps(props){
		if ( props.queryConfig.id !== this.props.queryConfig.id ){
			if ( props.queryConfig.id === 0 || this.props.queryConfig.id === 0 ){
				this.setState({ expanded: props.queryConfig.id === 0 })
			}
		}
	}

	removeDownloadLink(format){
		this.setState({ download: { [format]: false }})
	}

	download(format){
		this.setState({ download: { [format]: true }  })
	}

	getValue(row, schema, column, literal){
		let value = row[column]
		const { type } = schema[column]

		const pad = x => x.length === 1 ? "0" + x : x;
		const DATE_TYPE = 11
		const STRING_TYPE = 9
		
		if ( type === DATE_TYPE ){
			value = value ? new Date(value / 1000) : "null"

			if ( value && value !== "null" ){
				const date = value
				value = date.getUTCFullYear() + "-"
				value += pad("" + (date.getUTCMonth()+1)) + "-"
				value += pad("" + date.getUTCDate()) + " "
				value += pad("" + date.getUTCHours()) + ":"
				value += pad("" + date.getUTCMinutes()) + ":"
				value += pad("" + date.getUTCSeconds())
			}
		}

		if ( !literal || !value ) return value
		if ( !(type === STRING_TYPE || type === DATE_TYPE) ) return value

		return `'${value}'`
	}

	getCSV(result){
		const csvHeader = result.schema.reduce( (content, h) => content + h.name.toLowerCase() + ",", "" ) + "\n"

		return csvHeader + result.data.reduce( (content,row) => {
			let columns = ""

			for( let column in row ){
				const value = this.getValue(row, result.schema, column)
				columns += value + ","
			}
			
			columns = columns.substring(0, columns.length - 1)
			
			return content + "\n" + columns
		}, '')

	}

	getXLS(result){
		const xlsHeader = result.schema.reduce( (content, h) => content + h.name.toLowerCase() + "\t", "") + "\n"
		return xlsHeader + result.data.reduce( (content,row) => {
			let columns = ""

			for( let column in row ){
				if( column !== ""){
					const value = this.getValue(row, result.schema, column)
					columns += value + "\t"
				}
			}

			columns = columns.substring(0, columns.length - 1)
			
			return content + "\n" + columns
		}, '')
	}

	getSQL(result, queryConfig){
		if ( !queryConfig.select ) return null
	
		const table = queryConfig.select.from[0].table

		let columns = result.schema.reduce( (content, h) => content + h.name.toLowerCase() + ", ", "")
		columns = columns.substring(0, columns.length-2)

		return result.data.reduce( (content, row) => {
			let args = '';

			for( let column in row ) {
				const value = this.getValue(row, result.schema, column, true)
				args += value + ", "
			}
			args = args.substring(0, args.length - 2)

			const insert = `insert into ${table} (${columns})\nvalues (${args})`

			return content + insert + ";\n\n"
		}, "" )
	}

	render(){
		const { queryConfig, all, more, result } = this.props
		const { expanded } = this.state
		const onClick = this.onClick.bind(this)

		const headers = result.schema.map( (ci, i) => <th key={i}>{ci.name.toLowerCase()}</th> )

		const csv = this.getCSV(result)
		const xls = this.getXLS(result)
		const sql = this.getSQL(result, queryConfig)

		let filename = ""
		if ( queryConfig.select ){
			 filename = queryConfig.select.from[0].table + "." + new Date().toLocaleString()
		}

		let rowID = 0
		const rows = result.data.map( row => {
			const columns = []

			for( let column in row ){
				if( column !== ""){
					let value = this.getValue(row, result.schema, column)

					if ( result.schema[column].type === 11 ){
						value = <span>{value}</span> 
					}

					columns.push(<td key={column}>{value}</td>)
				}
			}

			rowID++
			return <tr key={rowID}>{columns}</tr>
		}, '')

		const glyph = expanded ? "expand" : "collapse-down"
		
		const style = {
			fontWeight: "bold",
			cursor: "pointer"
		}

		const title = <div className="text-left" style={style}  onClick={onClick} >
			<Glyphicon glyph={glyph} />
			{' ' + ((queryConfig.select && queryConfig.select.original) || queryConfig.query)}
		</div>

		const exportBtnProps = {
			title: <Glyphicon glyph="floppy-disk" />,
			key: "exportBtn",
			id: "exportBtn",
			bsSize: "xsmall" 
		}

		const exportBtn = <DropdownButton {...exportBtnProps}>
      		<MenuItem eventKey="1" onClick={() => this.download('xls')}>as XLS</MenuItem>
			<MenuItem eventKey="1" onClick={() => this.download('csv')}>as CSV</MenuItem>
			<MenuItem eventKey="1" onClick={() => this.download('sql')}>as SQL</MenuItem>
    	</DropdownButton>


		return <Panel expanded={expanded} bsStyle="success" onToggle={() =>{}}>
			<Panel.Heading>{title}</Panel.Heading>
			<Panel.Body>
				<Table striped hover bordered condensed responsive>
					<thead>
						<tr>
							<td colSpan={headers.length}>
								<ButtonGroup className="pull-left">
									{exportBtn}
									<Button onClick={() => more(queryConfig)} title="more" bsSize="xsmall">
										<Glyphicon glyph="forward" /> 
									</Button>
									<Button onClick={() => all(queryConfig)} title="all" bsSize="xsmall">
										<Glyphicon glyph="fast-forward" /> 
									</Button>
								</ButtonGroup>
							</td>
						</tr>
						<tr>{headers}</tr>
					</thead>
					<tbody>{rows}</tbody>
				</Table>
				<Download content={csv} name={filename+ ".csv"} download={this.state.download.csv}/>
				<Download content={xls} name={filename+ ".xls"} download={this.state.download.xls}/>
				<Download content={sql} name={filename+ ".sql"} download={this.state.download.sql}/>
				<input type="hidden" id="clipboard" />
			</Panel.Body>
		</Panel>
	}
}