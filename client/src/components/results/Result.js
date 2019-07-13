import React, { Component } from 'react'
import { Table, ButtonGroup, Button, DropdownButton, MenuItem, Glyphicon, Collapse } from 'react-bootstrap'
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
			expanded: props.expanded,
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

	getValue(row, schema, column, options = {}){

		let value = row[column]
		const { type } = schema[column]

		const DATE_TYPE = 'date'
		const STRING_TYPE = 'string'
		
		if ( type === DATE_TYPE ){
			value = value ? new Date(value) : "null"

			if ( value && value !== "null" ){
        value = options.useLocalTime ? getLocalString(value) : getUTCString(value);
        value = options.singleQuotedDate ? `'${value}'` : value;
			}
		}

		if ( type === STRING_TYPE && value ){
			if ( !options.full && value.length > 256 ) return `'${value.substr(0,253)}'...`

			return `'${value}'`
		}

		return value
	}

	getCSV(result){
    console.log({ result })
    const options = {...this.props.config, singleQuotedDate: true};

		const csvHeader = result.schema.reduce( (content, h) => content + h.name.toLowerCase() + ",", "" ) + "\n"

		return csvHeader + result.data.reduce( (content,row, i) => {
			let columns = ""
			
			for( let j = 0 ; j < row.length; j++ ){
				const value = this.getValue(row, result.schema, j, options)
				columns += value + ","
			}
			
			columns = columns.substring(0, columns.length - 1)
			
			return content + "\n" + columns
		}, '')

	}

	getXLS(result){
    const options = {...this.props.config };
    const xlsHeader = result.schema.reduce( (content, h) => content + h.name.toLowerCase() + "\t", "") + "\n"
    
		return xlsHeader + result.data.reduce( (content,row) => {
			let columns = ""

			for( let j = 0 ; j < row.length; j++ ){
				const value = this.getValue(row, result.schema, j, options)
				columns += value + "\t"
			}

			columns = columns.substring(0, columns.length - 1)
			
			return content + "\n" + columns
		}, '')
	}

	getSQL(result, queryConfig){
		if ( !queryConfig.select ) return null
  
    const options = {...this.props.config, singleQuotedDate: true };

		const table = queryConfig.select.from[0].table

		let columns = result.schema.reduce( (content, h) => content + h.name.toLowerCase() + ", ", "")
		columns = columns.substring(0, columns.length-2)

		return result.data.reduce( (content, row) => {
			let args = ''

			for( let j = 0; j < row.length ; j++) {
				const value = this.getValue(row, result.schema, j, options)
				args += value + ", "
			}
			args = args.substring(0, args.length - 2)

      const dboperation = this.props.config.useUpsert ? 'upsert' : 'insert';
			const sentence = `${dboperation} into ${table} (${columns})\nvalues (${args})`

			return content + sentence + ";\n\n"
		}, "" )
  }
  
  copy(content){
    const clipboard = document.getElementById('result-clipboard');
    clipboard.value = content;
    clipboard.select();
    const r = document.execCommand('copy');

    console.log(r, clipboard.value);
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
		const onToggleShow = this.onClick.bind(this)

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

    const now = new Date()
		const id = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`
		let filename = ""
		if ( queryConfig.select ){
			filename = queryConfig.select.from[0].table + "." + id
		} else {
      filename = "Result." + id
    }

    let rowID = 0
    let data = result.data;
    
    for( let i = data.length; data.length > 0 && i < 4; i++ ){
      data.push(false);
    }

    const emptyRow = rowID => <tr key={rowID}><td colSpan={result.schema.length}><span>&nbsp;</span></td></tr>;

		const rows = result.data.map( row => {
      const columns = []
      rowID++

      if ( !row ) return emptyRow(rowID);

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

			
			return <tr key={rowID}>{columns}</tr>
		}, '')

		const exportBtnProps = {
			title: <Glyphicon glyph="floppy-disk" />,
			key: "exportBtn",
			id: "exportBtn",
			bsSize: "small",
			bsStyle: "primary"
    }
    
    const sqlButtonProps = {
      id: 'sqlButton',
      drop: 'right',
      title: 'As SQL',
      bsSize: 'small'
    }

		const exportBtn = <DropdownButton {...exportBtnProps}>
      {sql ? <MenuItem header>Copy SQL to</MenuItem> : ''}
      {sql ? <MenuItem eventKey="1.1" onClick={() => this.copy(sql)}>in clipboard</MenuItem> : ''}
      {sql ? <MenuItem eventKey="1.2" onClick={() => this.newTab(sql, filename)}>in new tab</MenuItem> : ''}
      <MenuItem header>Download</MenuItem>
      {sql ? <MenuItem eventKey="2" onClick={() => this.download('sql')}>as SQL</MenuItem> : ''}
      <MenuItem eventKey="3" onClick={() => this.download('csv')}>as CSV</MenuItem>
			<MenuItem eventKey="4" onClick={() => this.download('xls')}>as XLS</MenuItem>
			<MenuItem divider />
			{/*<MenuItem eventKey="4" onClick={() => this.newVar(voltTable)}>as a VoltTable variable</MenuItem>*/}
		</DropdownButton>

		const glyph = expanded ? "collapse-up" : "collapse-down"

		let title = (queryConfig.name || (queryConfig.select && queryConfig.select.original) || queryConfig.query)
		title = title.substring(0, 100) +  (title.length < 200 ? '' : '...')
		title = <div className="text-left panel-success result-bar">
			<div className="result-title" onClick={onToggleShow}>
				<Glyphicon glyph={glyph} />
				<span>{title}</span>
			</div>
		</div>

    if ( queryConfig.loadClasses ) return title;

		const paginateBtns = [<Button onClick={() => more(queryConfig)} title="more" bsSize="small" bsStyle="primary" key="more">
			<Glyphicon glyph="forward" />
		</Button>,
		<Button onClick={() => all(queryConfig)} title="all" bsSize="small" bsStyle="primary" key="all">
			<Glyphicon glyph="fast-forward" />
		</Button>];

		return <div>
			{title}
			<Collapse in={expanded} className="result-collapse">
				<div>
					<Table striped hover bordered responsive style={{ clear: "both" }}>
							<thead>
									<tr><th colSpan={headers.length}>
										<ButtonGroup className="pull-left">
											{exportBtn}
											{queryConfig.paginable ? paginateBtns : ""}
										</ButtonGroup>
									</th></tr>
									<tr>{headers}</tr>
									</thead>
							<tbody>{rows}</tbody>
					</Table>
				</div>
			</Collapse>
			
			<Download content={csv} name={filename+ ".csv"} download={this.state.download.csv}/>
			<Download content={xls} name={filename+ ".xls"} download={this.state.download.xls}/>
			<Download content={sql} name={filename+ ".sql"} download={this.state.download.sql}/>
			<hr />
		</div> 
	}
}