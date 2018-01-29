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
		const { updateSchema } = this.props

		schema.load( this.props.config ).then( ({tables, procedures, columns, pks}) => {
			updateSchema(tables, procedures, columns, pks)
		})
	}

	execute(){
		const { tabs, addResult, clearResults, config, variables, schema } = this.props
		const activeTab = tabs[this.props.activeTab]

		clearResults()

		query.execute(activeTab.editor, config, variables, schema).forEach( promise => {
			promise.then( result => {
				addResult(result)
			})
		})
	}

	upload(e){
		const { addTab } = this.props
		const target = {
			name: e.target.value.replaceAll("\\","/").split("/").pop(),
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
		const { tabs, project, changeDialog } = this.props
		const activeTab = tabs[this.props.activeTab] || { filepath: "", content: "" }
		const tabName = activeTab.filepath.split("/").pop() + ".sql"
		
		const existsInProject = activeTab && getFileFromProject(project, activeTab.filepath)

		const reload = this.reload.bind(this)
		const loadSchema = this.loadSchema.bind(this)

		const openWikiPage = window.open("http://aamadeo27.github.com/vsqle/wiki","_blank")
		
    return (
      <Row><Col xsOffset={0} xs={12}>
        <ButtonToolbar>
          <ButtonGroup>
            <Button bsSize="small" title="configuration" bsStyle="warning" onClick={() => changeDialog("Config")}>
              <Glyphicon glyph="cog"/>
            </Button>
						<Button bsSize="small" title="reload schema" bsStyle="warning" onClick={loadSchema}>
							<Glyphicon glyph="refresh"/>
						</Button>
            <Button bsSize="small" title="execute" bsStyle="warning" onClick={this.execute.bind(this)}>
              <Glyphicon glyph="play"/>
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button bsSize="small" title="save" bsStyle="warning" onClick={this.save.bind(this)}>
              <Glyphicon glyph="floppy-disk"/>
						</Button>
            <Button bsSize="small" title="reload" bsStyle="warning" onClick={reload} disabled={!existsInProject}>
							<Glyphicon glyph="repeat"/>
						</Button>
            <Button bsSize="small" title="download" bsStyle="warning" onClick={this.download.bind(this)}>
							<Glyphicon glyph="save"/>
						</Button>
            <Button bsSize="small" title="upload" bsStyle="warning">
							<div className='fileUpload'>
								<Glyphicon glyph="open"/>
								<input type='file' id='file' onChange={this.upload.bind(this)}/>
							</div>
						</Button>
					</ButtonGroup>
					<ButtonGroup>
						<Button title="variables" bsStyle="info" onClick={this.props.toggleShowVars} bsSize='small'>
							{"${vars}"}
						</Button>
						<Button title="help" bsStyle="info" onClick={openWikiPage} bsSize="small">
							<Glyphicon glyph="question-sign"/>
						</Button>
					</ButtonGroup>
					
        </ButtonToolbar>
      </Col>
			<Download content={activeTab.content} name={tabName} download={this.state.download}/>
			</Row>
    )
  }
}

const mapStateToProps = ({ tabs, activeTab, project, config, vars, schema }) => ({ 
	activeTab: tabs.findIndex( t => t.id === activeTab ),
	tabs,
	project,
	config,
	variables: vars.list,
	schema
})

const mapDispatchToProps = dispatch => ({
	addTab: tab => dispatch(actions.addTab(tab)),

	updateFile: file => dispatch(actions.updateFile(file)),
	changeTabContent: file => dispatch(actions.changeTabContent(file.id, file.content)),

	addResult: result => dispatch(actions.addResult(result)),
	clearResults: () => dispatch(actions.clearResults),

	changeDialog: dialog => dispatch(actions.changeDialog(dialog)),
	toggleShowVars: () => dispatch(actions.toggleShowVars),

	updateSchema: (tables, procedures, columns, pks) => dispatch(actions.updateSchema(tables, procedures, columns, pks))
})

export default connect(mapStateToProps, mapDispatchToProps)(Tools)
