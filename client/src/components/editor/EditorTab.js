import React, { Component } from 'react'
import AceEditor from 'react-ace'
import { connect } from 'react-redux'
import { Row, Col, Button, Glyphicon } from 'react-bootstrap'

import * as api from '../../api/api.js'
import * as query from '../../api/query.js'
import * as actions from '../../Actions.js'
import { IGNORE_PATTERN } from '../../Constants.js'

const addCommand = (editor, command) => editor.commands.addCommand({
	name: command.name,
	bindKey: {
		win: command.win,
		mac: command.mac,
		sender: 'editor|cli'
	},
	exec: function(env, args, request) {
		//event.preventDefault()
		command.action()
	}
})

class EditorTab extends Component {
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

  componentDidMount(){
    const {
      file, config, vars, close,
      updateTab, addResult, clearResults, changeDialog, toggleVars,
			newTab,
			schema
    } = this.props

    const tab = Object.assign({}, file)
    tab.editor = this.refs.AceEditor.editor

    tab.editor.setOptions({
    	enableBasicAutocompletion: true,
			enableLiveAutocompletion: true
    })
		
		const execute = () => {
			clearResults()
			query.execute(tab.editor, config, vars.list, schema).forEach( promise => {
				promise.then( addResult )
			})
		}

		const executeLine = () => {
			clearResults()
			query.executeLine(tab.editor, config, vars.list, schema).then( addResult )
		}

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
        api.updateFile(projectName, tab)
      }
    }

		addCommand(tab.editor,{ name: "executeLine", win: "F4", mac: "Cmd+L", action: executeLine } )
		addCommand(tab.editor,{ name: "execute", win: "F5", mac: "Cmd+Enter", action: execute } )
		addCommand(tab.editor,{ name: "save", win: "Ctrl+S", mac: "Cmd+S", action: save } )
		addCommand(tab.editor,{ name: "rightTab", win: "Ctrl+Right", mac: "", action: rightTab } )
		addCommand(tab.editor,{ name: "leftTab", win: "Ctrl+Left", mac: "", action: leftTab } )
		addCommand(tab.editor,{ name: "newTab", win: "Alt+T", mac: "Cmd+T", action: newTab } )
		addCommand(tab.editor,{ name: "closeTab", win: "Alt+W", mac: "Cmd+W", action: close } )
		addCommand(tab.editor,{ name: "variables", win: "Alt+V", mac: "Alt+V", action: toggleVars } )

		updateTab( tab )
		this.props.setCompleters(tab.editor)
  }

	componentDidUpdate(prevProps){
		const { activeTab, file, vars, config, schema } = this.props

		if( activeTab === file.id && vars === prevProps.vars ){
			this.refs.AceEditor.editor.focus()
		}

		if ( prevProps.config === config && vars === prevProps.vars && prevProps.schema === schema ) return

		if ( prevProps.schema !== schema ) console.log("New Schema", schema )

    const { addResult, clearResults } = this.props

    const tab = Object.assign({}, file)
    tab.editor = this.refs.AceEditor.editor

		const execute = () => {
			clearResults()
			console.log("EditorTab.cdu.Execute", { schema })
			query.execute(tab.editor, config, vars.list, schema).forEach( promise => {
				promise.then( addResult )
			})
		}

		const executeLine = () => {
			clearResults()
			query.executeLine(tab.editor, config, vars.list, schema).then( addResult )
		}

		addCommand(tab.editor,{ name: "executeLine", win: "F4", mac: "Cmd+L", action: executeLine } )
		addCommand(tab.editor,{ name: "execute", win: "F5", mac: "Cmd+Enter", action: execute } )
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
      editorProps: { $blockScrolling: true }
    }

    return <div className="EditorTab">
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
    </div>
  }
}

const mapDispatchToProps = dispatch => ({
	createFile: file => dispatch(actions.createFile(file)),
	updateFile: file => dispatch(actions.updateFile(file)), 

	addResult: result => dispatch(actions.addResult(result)),
	clearResults: () => dispatch(actions.clearResults),

  changeTabContent: (id,content) => dispatch(actions.changeTabContent(id,content)),
  updateTab: tab => dispatch(actions.updateTab(tab)),
	changeTab: id => dispatch(actions.changeTab(id)),

  changeDialog: dialog => dispatch(actions.changeDialog(dialog)),

	toggleVars: () => dispatch(actions.toggleShowVars)
})

const mapStateToProps = ({ activeTab, tabs, config, project, schema, vars }, props) => ({
	activeTab,
	file: tabs.find( t => t.id === props.id),
  tabs, 
	config,
	projectName: project.name,
	schema,
	vars
})

export default connect(mapStateToProps, mapDispatchToProps)(EditorTab)
