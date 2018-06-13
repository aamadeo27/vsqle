import React, { Component } from 'react'
import { Panel, Table, ButtonGroup, Button, DropdownButton, MenuItem, Glyphicon } from 'react-bootstrap'
import Download from '../common/Download.js'
import * as api from '../../api/api'

const pad = x => x.length === 1 ? "0" + x : x
const getUTCString = date => {
	let value = date.getUTCFullYear() + "-"
	value += pad("" + (date.getUTCMonth()+1)) + "-"
	value += pad("" + date.getUTCDate()) + " "
	value += pad("" + date.getUTCHours()) + ":"
	value += pad("" + date.getUTCMinutes()) + ":"
	value += pad("" + date.getUTCSeconds()) + "."
	value += date.getTime() %  1000

	return value
}

const getLocalString = date => {
	let value = date.getFullYear() + "-"
	value += pad("" + (date.getMonth()+1)) + "-"
	value += pad("" + date.getDate()) + " "
	value += pad("" + date.getHours()) + ":"
	value += pad("" + date.getMinutes()) + ":"
	value += pad("" + date.getSeconds()) + "."
	value += date.getTime() %  1000

	return value
}

export default class extends Component {
	constructor(props){
		super(props)
		this.state = { 
			expanded: props.queryConfig.id === 0,
			download: {
				csv: false,
				xls: false,
				sql: false
			},
			hidden: []
		}
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	toggleColumn(name){
		const { hidden } = this.state
		const newHidden = [...hidden]

		if ( hidden[name] ){	
			delete newHidden[name]	
		} else {
			newHidden[name] = true
		}

		this.setState({ hidden: newHidden })
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

	getValue(row, schema, column, full){

		let value = row[column]
		const { type } = schema[column]
		const { config } = this.props

		const DATE_TYPE = 'date'
		const STRING_TYPE = 'string'
		
		if ( type === DATE_TYPE ){
			value = value ? new Date(value) : "null"

			if ( value && value !== "null" ){
				const date = value

				if ( config.useLocalTime ){
					value = getLocalString(date)
				} else {
					value = getUTCString(date)
				}
			}
		}

		if ( type === STRING_TYPE && value ){
			if ( !full && value.length > 256 ) return `'${value.substr(0,253)}'...`

			return `'${value}'`
		}

		return value
	}

	getCSV(result){
		const csvHeader = result.schema.reduce( (content, h) => content + h.name.toLowerCase() + ",", "" ) + "\n"

		return csvHeader + result.data.reduce( (content,row, i) => {
			let columns = ""
			
			for( let j = 0 ; j < row.length; j++ ){
				const value = this.getValue(row, result.schema, j, true)
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

			for( let j = 0 ; j < row.length; j++ ){
				const value = this.getValue(row, result.schema, j, true)
				columns += value + "\t"
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
			let args = ''

			for( let j = 0; j < row.length ; j++) {
				const value = this.getValue(row, result.schema, j, true)
				args += value + ", "
			}
			args = args.substring(0, args.length - 2)

			const insert = `insert into ${table} (${columns})\nvalues (${args})`

			return content + insert + ";\n\n"
		}, "" )
	}

	getVoltTable(result, queryConfig){
		if ( !queryConfig.select ) return null

		const { schema, data } = result
		const vt = {
			data,
			schema: schema.map( ({ type }) => type )
		}

		return JSON.stringify(vt)
	}

	newTab(content, name){
		const { addTab, changeTab } = this.props

		const newTab = api.newTab(content)
		newTab.filepath = "/" + name
		addTab(newTab)
		changeTab(newTab.id)
	}

	newVar(value){
		const { addVar, showVars } = this.props

		const variable = {
			id : api.getFileID(),
			value
		}

		variable.name = 'voltTable_' + variable.id

		api.addVar(variable)
		
		addVar(variable)
		showVars()
	}

	render(){
		const { queryConfig, all, more, result, config } = this.props
		const { expanded, hidden } = this.state
		const onClick = this.onClick.bind(this)

		console.log({ expanded })

		const toggle = i => e => {
			e.preventDefault()
			this.toggleColumn(i)
		}

		const headers = result.schema.map( (ci, i) => {
			if ( hidden[i] ) {
				return <th key={i} onContextMenu={toggle(i)}>
					&nbsp;
				</th>
			}

			return <th key={i} onContextMenu={toggle(i)}>
				{ci.name.toLowerCase()}
			</th>
		})

		const csv = this.getCSV(result)
		const xls = this.getXLS(result)
		const sql = this.getSQL(result, queryConfig)
		const voltTable = this.getVoltTable(result, queryConfig)

		let filename = ""
		if ( queryConfig.select ){
			const now = new Date()
			const id = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`
			filename = queryConfig.select.from[0].table + "." + id
		}

		let rowID = 0
		const rows = result.data.map( row => {
			const columns = []

			for( let j = 0 ; j < row.length; j++ ){
				let value = ''

				if( ! hidden[j] ){
					value = this.getValue(row, result.schema, j, config.fullColumn)

					if ( result.schema[j].type === 'date' ){
						value = <span>{value}</span> 
					}
				}
				
				columns.push(<td key={j}>{value}</td>)
			}

			rowID++
			return <tr key={rowID}>{columns}</tr>
		}, '')

		const glyph = expanded ? "expand" : "collapse-down"
		
		const style = {
			fontWeight: "bold",
			cursor: "pointer"
		}

		let title = ((queryConfig.select && queryConfig.select.original) || queryConfig.query)
		title = title.substring(0, 100) +  (title.length < 100 ? '' : '...')
		title = <div className="text-left" style={style}  onClick={onClick} >
			<Glyphicon glyph={glyph} />
			{' ' + title}
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
			<MenuItem divider />
			<MenuItem eventKey="1" onClick={() => this.newTab(sql, filename)}>as SQL in new tab</MenuItem>
			<MenuItem eventKey="1" onClick={() => this.newVar(voltTable)}>as a VoltTable variable</MenuItem>
    	</DropdownButton>

		return <Panel expanded={expanded} bsStyle="success" onToggle={onClick} >
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