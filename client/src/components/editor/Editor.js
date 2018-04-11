import React from 'react'
import { Row, Tab, Tabs, Glyphicon } from 'react-bootstrap'
import { connect } from 'react-redux'

import EditorTab from './EditorTab.js'
import * as actions from '../../Actions'
import * as api from '../../api/api.js'
import * as schema from '../../api/schema.js'

import 'brace/mode/mysql'
import 'brace/theme/monokai'
import 'brace/ext/language_tools'

const ColumnsCompleter = {
		tables: {},

		getCompletions(editor, session, pos, prefix, callback) {
			const curLine = editor.session.getLine(pos.row)
			let start = pos.column - 1 
			for(; start >= 0 && curLine.charAt(start) !== ' '; start --);
			
			const prevString = curLine.substring(start, pos.column)
			
			if ( prevString.indexOf(".") < 0 ){
				return callback(null, [])
			}

			const table = prevString.split(".")[0].toLowerCase().split(" ").join("")

			if ( ! ColumnsCompleter.tables[table] ){
				console.log("No table loaded with name : <"+table+">")
				return callback(null, [])
			}

			const wordList = ColumnsCompleter.tables[table].filter( column =>
				column.name.match('^'+prefix)
			).map( column => 
				({ caption: table + "." + column.name,	value: column.name, meta: "Column" })
			)

			callback(null, wordList)
		}
}

const StaticWordCompleter = {
	procedures: [],
	columns: [],
	tables: [],
	variables: [],
	getCompletions(editor, session, pos, prefix, callback){
		const filter = word => word.toLowerCase().match(new RegExp("^" + prefix.toLowerCase()))

		let wordList = StaticWordCompleter.procedures.filter( filter ).map( word => 
			({ caption: word, value: word, meta: "Procedure" }) 
		)
		
		wordList.push({ caption: "exec", value: "exec", meta: "keyword"})

		wordList = wordList.concat( StaticWordCompleter.tables.filter( filter ).map( word =>
			({ caption: word.toLowerCase(), value: word.toLowerCase(), meta: "Table" }) 
		))

		wordList = wordList.concat( StaticWordCompleter.columns.filter( filter ).map( word =>
			({ caption: word.toLowerCase(), value: word.toLowerCase(), meta: "Column" })
		))

		wordList = wordList.concat( StaticWordCompleter.variables.filter( filter ).map( word =>
			({ caption: word, value: '${'+word+'}', meta: "Variable" })
		))
		
		callback(null, wordList)
	}
}

const setCompleters = editor => {
	editor.completers.push(StaticWordCompleter)

	editor.completers.forEach( completer => { 
		var getCompletions = completer.getCompletions
		completer.getCompletions = function(editor, session, pos, prefix, callback){
			let curLine = editor.session.getLine(pos.row)
			let start = pos.column-1

			for(; start >= 0 && curLine.charAt(start) !== ' '; start --); 
			
			const prevString = curLine.substring(start, pos.column)
			
			if ( prevString.indexOf(".") >= 0 ){
				return callback(null, [] )
			}
		
			getCompletions(editor, session, pos, prefix, callback)
		}
	})

	editor.completers.push(ColumnsCompleter)
}

const updateCompleters = schema => {
	StaticWordCompleter.procedures = Object.keys(schema.procedures).filter( p => ! p.match(/.+\.+/) )
	StaticWordCompleter.tables = Object.keys(schema.tables).map(s => s.toLowerCase())
	StaticWordCompleter.columns = schema.columns || []
	ColumnsCompleter.tables = schema.tables || []
}

const updateSWCompleter = variables => {
	StaticWordCompleter.variables = variables.map( v => v.name )
}

class Editor extends React.Component {

	addTab(){
		const { addTab } = this.props

		const newTab = api.newTab()
		addTab(newTab)

		this.setState({ activeKey: newTab.id })
	}

	checkTabs(){
		if ( this.props.tabs.length === 0 ){
			this.addTab()
		}
	}

	loadSchema(){
		const { updateSchema, addResult, connection } = this.props
		const handleError = err => addResult( { error: err.error, queryConfig: { query: "Load Schema" } })

		if ( connection.user ){
			schema.load( ).then( response => {
				if ( response ){
					const {tables, procedures, columns, pks} = response
					updateSchema(tables, procedures, columns, pks)
				} else {
					handleError({ error: "No response from back end" })
				}
			}).catch ( e => {
				handleError(e)
			})
		}
	}

	componentDidMount(){
		this.checkTabs()
		this.loadSchema()
	}

	componentDidUpdate(prevProps){
		this.checkTabs()

		if ( prevProps.connection !== this.props.connection ){
			this.loadSchema()
		}

		const { schema, vars } = this.props
		if ( prevProps.schema !== schema && schema.procedures && schema.tables ){
			updateCompleters(schema)
		}

		if ( prevProps.vars !== vars ){
			updateSWCompleter(vars.list)
		}
	}

  render() {
		const { activeTab: activeKey, changeTab, closeTab } = this.props
		
		const editorTabs = this.props.tabs.map( tab => {
			const title = <span>{tab.filepath.split("/").pop()}</span>
			const _closeTab = () => {

				let nextActive = this.props.tabs.find( t => t.id !== tab.id ) 
				nextActive = (nextActive && nextActive.id) || -1

				closeTab(tab.id, nextActive)
			}

			const addTab = this.addTab.bind(this)

			return <Tab eventKey={tab.id} title={title} key={"editor.tab."+tab.id}>
					<EditorTab id={tab.id} close={_closeTab} newTab={addTab} setCompleters={setCompleters}/>
			</Tab>
		})

		const selectKey = ( key ) => {
			if ( key === "newtab" ) this.addTab()
			else changeTab(key)
		}
		
		const props = {
			onSelect: selectKey,
			id: "editor-tabs",
			className: "editor-tabs",
			animation: false,
			activeKey
		}

    return (
		<Row className="section">
			<div className="Editor">
			<Tabs {...props} >
				{editorTabs}
				<Tab eventKey="newtab" title={<Glyphicon glyph="plus"/>} key="newtab" bsStyle="info"/>
			</Tabs>
			</div>
		</Row>
    )
  }
}

const mapStateToProps = ({ tabs, activeTab, config, schema, vars, connection }) => ({ 
	tabs,
	activeTab,
	config,
	schema,
	vars,
	connection
})

const mapDispatchToProps =  dispatch => ({
	closeTab: (id, nextActive) => dispatch(actions.closeTab(id, nextActive)),
	addTab: tab => dispatch(actions.addTab(tab)),
	changeTab: id => dispatch(actions.changeTab(id)),

	addResult: result => dispatch(actions.addResult(result)),

	updateSchema: (tables, procedures, columns, pks) => dispatch(actions.updateSchema(tables, procedures, columns, pks))
})

export default connect(mapStateToProps, mapDispatchToProps)(Editor)
