import React, { Component } from 'react'
import AceEditor from 'react-ace'
import { connect } from 'react-redux'
import { Row, Col, Button, Glyphicon } from 'react-bootstrap'

import * as api from '../../api/api.js'
import * as query from '../../api/query.js'
import * as actions from '../../Actions.js'
import { IGNORE_PATTERN } from '../../Constants.js'

class EditorTab extends Component {
	/*shouldComponentUpdate({ activeTab	}){
		return activeTab === this.props.id
	}*/

  onChange( newValue ){
    const { changeTabContent, id } = this.props
		const ignorePattern = new RegExp("^" + IGNORE_PATTERN + ".*")
		
		if ( newValue.match(ignorePattern) || newValue === "" ) {
			return
		}

		changeTabContent(id, newValue)
  }

	getRelativeTab(d){
		const { tabs, file } = this.props

		const idx = tabs.findIndex( t => t.id === file.id )

		return tabs[ (tabs.length + idx + d) % tabs.length ]
	}

	gotoTab(d){
		this.props.changeTab( this.getRelativeTab(d).id )
	}

	getProps(){
		return this.props
	}

	execute(asyncExecution){
    const {
      vars,
      addResult, clearResults, updateQueue,
			schema,
			logout
    } = this.props

    const editor = this.refs.AceEditor.editor
		
		if ( asyncExecution ){
			clearResults()

			query.execute(editor, vars.list, schema, asyncExecution).forEach( promise => {
				promise.then( response => {
					if ( response.error === 'Not logged in' ){
						logout()
					}
	
					addResult(response)
				}).catch( err => console.log(err))
			})

			return
		}
		
		if ( this.props.queue.length === 0 ){
			clearResults()
			const queue = query.execute(editor, vars.list, schema, asyncExecution)
			updateQueue(queue)
		} else {
			updateQueue([])
		}
	}

	executeLine(){
    const {
      vars,
      addResult, clearResults,
			schema,
			logout
    } = this.props

  	const editor = this.refs.AceEditor.editor

		clearResults()

		query.executeLine(editor, vars.list, schema).then( response => {
			if ( response.error === 'Not logged in' ){
				logout()
			}

			addResult(response)
		}).catch( err => console.log(err))
	}

  componentDidMount(){
    const {
      file, close,
			updateTab, changeDialog, toggleVars,
			updateFile,
			newTab
    } = this.props

    const tab = Object.assign({}, file)
    tab.editor = this.refs.AceEditor.editor

    tab.editor.setOptions({
    	enableBasicAutocompletion: true,
			enableLiveAutocompletion: true
    })

		const getRelativeTab = this.getRelativeTab.bind(this)
		const gotoTab = this.gotoTab.bind(this)
		const getProps = this.getProps.bind(this)

		const thisTab = () => getRelativeTab(0)
		const rightTab = () => gotoTab(+1)
		const leftTab = () => gotoTab(-1)

		const save = () => {
			const { projectName } = getProps()

			const tab = thisTab()
			
      if ( tab.newTab ){
        changeDialog("NewFile")
      } else {
        api.updateFile(projectName, tab, () => updateFile(tab))
      }
		}

		this.addCommand("executeLine","F4", "Cmd+L", () => this.executeLine() )
		this.addCommand("async execute","F5", "Cmd+Enter", () => this.execute(true) )
		this.addCommand("sync execute","F6", "Ctrl+Cmd+Enter", () => this.execute(false) )
		this.addCommand("save","Ctrl+S", "Cmd+S", save )
		this.addCommand("rightTab","Ctrl+Right", "", rightTab )
		this.addCommand("leftTab","Ctrl+Left", "", leftTab )
		this.addCommand("newTab","Alt+T", "Cmd+T", newTab )
		this.addCommand("closeTab","Alt+W", "Cmd+W", close )
		this.addCommand("variables","F3", "F3", toggleVars )

		updateTab( tab )
		this.props.setCompleters(tab.editor)
	}
	
	addCommand(name,win,mac,action){
    const editor = this.refs.AceEditor.editor

		editor.commands.addCommand({
			name: name,
			bindKey: {
				win: win,
				mac: mac,
				sender: 'editor|cli'
			},
			exec: action
		})
	}

  render(){
    const { file } = this.props

    const AceEditorProps = {
      value: file.content,
      onChange: this.onChange.bind(this),
      mode: "mysql",
      theme: "textmate",
      name: "EditorTab." + file.id,
      height: "35vh",
			width: "100%",
			showGutter: false,
			fontFamily: "tahoma",
			fontSize: "10pt",
      editorProps: { 
				$blockScrolling: true,
			}
    }

    return <div className="EditorTab">
			<div className="container-fluid">
				<Row>
					<Col xs={12}>
						<Row>
							<Button bsSize="xsmall" title="close tab" bsStyle="default" onClick={this.props.close} className="pull-right">
								<Glyphicon glyph="remove"/>
							</Button>
						</Row>
						<Row>
							<AceEditor {...AceEditorProps}	ref={"AceEditor"}/>
						</Row>
						<Row>
							<span className="tab-footer pull-left">{file.filepath}</span>
						</Row>
					</Col>
				</Row>
			</div>
    </div>
  }
}

const mapDispatchToProps = dispatch => ({
	createFile: file => dispatch(actions.createFile(file)),
	updateFile: file => dispatch(actions.updateFile(file)), 

	addResult: result => dispatch(actions.addResult(result)),
	clearResults: () => dispatch(actions.clearResults),

	logout: () => dispatch(actions.updateConnection({})),

  changeTabContent: (id,content) => dispatch(actions.changeTabContent(id,content)),
  updateTab: tab => dispatch(actions.updateTab(tab)),
	changeTab: id => dispatch(actions.changeTab(id)),

	updateQueue: queue => dispatch(actions.updateQueue(queue)),

  changeDialog: dialog => dispatch(actions.changeDialog(dialog)),

	toggleVars: () => dispatch(actions.toggleShowVars)
})

const mapStateToProps = ({ activeTab, tabs, config, project, schema, vars, queue }, props) => ({
	activeTab,
	file: tabs.find( t => t.id === props.id),
  tabs, 
	config,
	projectName: project.name,
	schema,
	vars,
	queue
})

export default connect(mapStateToProps, mapDispatchToProps)(EditorTab)
