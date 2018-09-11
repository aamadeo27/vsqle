import React from 'react'
import { connect } from 'react-redux'
import { 
	Col, Row, 
	ButtonToolbar, ButtonGroup, Button, Glyphicon
} from 'react-bootstrap'

import { getFileFromProject } from '../../api/Project.js'
import { readFile } from '../../api/File.js'
import * as api from '../../api/api.js'
import * as actions from '../../Actions.js'
import * as query from '../../api/query.js'

import Download from '../common/Download.js'
import * as schema from '../../api/schema.js'

/**
 * Depends on :
 * 	activeTab : {
 *		filepath,
 *		content
 *  }
 *  project : { ... }
 */
class Tools extends React.Component {
	constructor(props){
		super(props)

		this.state = { download: false }
	}

	loadSchema(){
		const { updateSchema, addResult } = this.props
		const handleError = err => addResult( { error: err.error , queryConfig: { query: "Load Schema" } })

		schema.load( this.props.config ).then( response => {
			if (! response ){
				handleError({ error : "No response from back end" })
			}

			const {tables, procedures, columns, pks} = response
			updateSchema(tables, procedures, columns, pks)
		}).catch( handleError )
	}

	execute(asyncExec){
		const { 
			tabs, 
			addResult, clearResults, updateQueue,
			variables, 
			schema, 
			logout } = this.props
		const activeTab = tabs[this.props.activeTab]

		if (asyncExec){
			clearResults()

			query.execute(activeTab.editor, variables, schema).forEach( promise => {
				promise.then( response => {
					console.log("r",response)
					if ( response.error === 'Not logged in' ){
						logout()
					}
	
					addResult(response)
				})
			})

			return
		}
		
		if ( this.props.queue.length === 0 ){
			clearResults()
			const queue = query.execute(activeTab.editor, variables, schema, false)
			updateQueue(queue)
		} else {
			updateQueue([])
		}
	}

	upload(e){
		const { addTab } = this.props
		const target = {
			name: e.target.value.split("\\").pop(),
			file: e.target.files[0]
		}

		const load = content => {
			const file = api.newTab()
			file.content = content
			file.filepath = "/" + target.name
			file.name = target.name

			addTab(file)
		}

		readFile(target, load, console.error )
	}

	loadClasses(e){
		const name = e.target.value.split("\\").join("/").split("/").pop()

		console.log("Load Classes ", name);
		const { addResult, clearResults, logout } = this.props;

		clearResults();

		api.loadClasses(e.target.files[0])
			.then( response => {
				console.log("r",response)
				if ( response.error === 'Not logged in' ){
					logout()
				}

				addResult({
					queryConfig: {
						id: 0,
						query: 'Load Classes ' + name
					},
					result: response
				})
			})
	}

	download(){
		this.setState({ download: true })
	}

  save(){
		const { project, tabs, updateFile } = this.props
		const activeTab = tabs[this.props.activeTab]

		if ( ! activeTab.newTab ){
			api.updateFile(project.name, activeTab, () => updateFile(activeTab))
		} else {
			this.props.changeDialog("NewFile")
		}
  }

	reload(){
		const { project, tabs, changeTabContent, activeTab } = this.props
		const path = tabs[activeTab].filepath
		const file = getFileFromProject( project, path )
		changeTabContent(file)
	}

  render() {
		const { tabs, project, changeDialog, queue } = this.props
		const activeTab = tabs[this.props.activeTab] || { filepath: "", content: "" }
		const tabName = activeTab.filepath.split("/").pop() + ".sql"
		
		const existsInProject = activeTab && getFileFromProject(project, activeTab.filepath)

		const reload = this.reload.bind(this)
		const loadSchema = this.loadSchema.bind(this)

		const openWikiPage = () => window.open("https://github.com/aamadeo27/vsqle/wiki/Guide","_blank")
		const executing = queue.length > 0;
		const syncExecGlyph = executing ? 'remove-circle' : 'play-circle'
		
    return (
			<div className="Tools">
				<Row><Col xsOffset={0} xs={12}>
					<ButtonToolbar>
						<ButtonGroup bsSize="small">
							<Button title="configuration" bsStyle="warning" onClick={() => changeDialog("Config")}>
								<Glyphicon glyph="cog"/>
							</Button>
							<Button title="reload schema" bsStyle="warning" onClick={loadSchema}>
								<Glyphicon glyph="refresh"/>
							</Button>
							<Button title="async execute" bsStyle="warning" onClick={() => this.execute(true)} disabled={executing}>
								<Glyphicon glyph="play"/>
							</Button>
							<Button title="sync execute" bsStyle="warning" onClick={() => this.execute(false)}>
								<Glyphicon glyph={syncExecGlyph}/>
							</Button>
						</ButtonGroup>
						<ButtonGroup bsSize="small">
							<Button title="save" bsStyle="warning" onClick={this.save.bind(this)}>
								<Glyphicon glyph="floppy-disk"/>
							</Button>
							<Button title="reload" bsStyle="warning" onClick={reload} disabled={!existsInProject}>
								<Glyphicon glyph="repeat"/>
							</Button>
							<Button title="download" bsStyle="warning" onClick={this.download.bind(this)}>
								<Glyphicon glyph="save"/>
							</Button>
							<Button title="upload" bsStyle="warning">
								<div className='fileUpload'>
									<Glyphicon glyph="open"/>
									<input type='file' id='file' onChange={this.upload.bind(this)}/>
								</div>
							</Button>
						</ButtonGroup>
						<ButtonGroup bsSize="small">
							<Button bsStyle="info" onClick={this.props.toggleShowVars}>
								<Glyphicon glyph="usd"/>
							</Button>
							<Button bsStyle="info" onClick={this.props.loadClasses}>
								<div className='fileUpload'>
									<Glyphicon glyph="export"/>
									<input type='file' id='jarfile' onChange={this.loadClasses.bind(this)} onClick={ e => e.target.value = null}/>
								</div>
							</Button>
							<Button title="help" bsStyle="info" onClick={openWikiPage}>
								<Glyphicon glyph="question-sign"/>
							</Button>
						</ButtonGroup>
						
					</ButtonToolbar>
				</Col>
				<Download content={activeTab.content} name={tabName} download={this.state.download}/>
				</Row>
			</div>
    )
  }
}

const mapStateToProps = ({ tabs, activeTab, project, config, vars, schema, queue }) => ({ 
	activeTab: tabs.findIndex( t => t.id === activeTab ),
	tabs,
	project,
	config,
	variables: vars.list,
	schema,
	queue
})

const mapDispatchToProps = dispatch => ({
	addTab: tab => dispatch(actions.addTab(tab)),

	updateFile: file => dispatch(actions.updateFile(file)),
	changeTabContent: file => dispatch(actions.changeTabContent(file.id, file.content)),

	addResult: result => dispatch(actions.addResult(result)),
	clearResults: () => dispatch(actions.clearResults),
	logout: () => dispatch(actions.updateConnection({})),

	updateQueue: queue => dispatch(actions.updateQueue(queue)),

	changeDialog: dialog => dispatch(actions.changeDialog(dialog)),
	toggleShowVars: () => dispatch(actions.toggleShowVars),

	updateSchema: (tables, procedures, columns, pks) => dispatch(actions.updateSchema(tables, procedures, columns, pks))
})

export default connect(mapStateToProps, mapDispatchToProps)(Tools)