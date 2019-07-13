import React, { Component } from 'react'
import { connect } from 'react-redux'

import * as api from '../../api/api.js'
import * as actions from '../../Actions.js'

import LoginDialog from './LoginDialog.js'
import NewFileDialog from './NewFileDialog.js'
import ConfigDialog from './ConfigDialog.js'
import RenameDialog from './RenameDialog.js'
import NewFolderDialog from './NewFolderDialog.js'

class Dialogs extends Component {

	getCreateFile(){
		const { tabs, project } = this.props
		const activeTab = tabs[this.props.activeTab] || { filepath: "", content: "" }

		const { createFile, updateTab }  = this.props

		return filepath => {
			const newFile = Object.assign({}, activeTab)
			newFile.filepath = filepath
			delete newFile.newTab

			api.addFile(project.name, newFile, () => {
				createFile(newFile)
				updateTab(newFile)
			})

			console.log("Saving File", newFile)
		}
	}

	saveConfig(){
		const { updateConfig } = this.props

		return config => { 
			api.saveConfig(config, () => {
				updateConfig(config)
			})

			console.log("Saving Config", config)
		}	
	}

	render(){
		const { updateConnection, showDialog, changeDialog, tabs, config, project } = this.props
		const activeTab = tabs[this.props.activeTab] || { filepath: "", content: "" }

		const closeDialog = () => changeDialog("")

		const login = connection => {
			this.props.updateConnection(connection)
			console.log("UpdateConnection", connection)
		}

		const createFolder = folder => {
			this.props.createFolder(folder)
			console.log("Creating", folder)
		}

		const rename = (activePath, name) => {
			this.props.renameNode(activePath, name)
			console.log("Renaming", activePath, name)
		}

		return <div>
			<LoginDialog
				show={showDialog === 'Login'}
				close={closeDialog}
				save={login}
				updateConnection={updateConnection}
				connections={config.connections}
			/>
			<NewFileDialog
				show={showDialog === 'NewFile'}
				close={closeDialog}
        save={this.getCreateFile()}
        getDir={api.getDir}
				activeTab={activeTab} project={project}
			/>
			<ConfigDialog
				show={showDialog === 'Config'}
				close={closeDialog}
				save={this.saveConfig()}
				config={config}
			/>
			<NewFolderDialog
				show={showDialog === 'NewFolder'}
				close={closeDialog}
				save={createFolder}
				project={project}
			/>
			<RenameDialog
				show={showDialog === 'Rename'}
				close={closeDialog}
				save={rename}
				project={project}
			/>
		</div>
	}
}

const mapStateToProps = ({ tabs, activeTab, showDialog, project, config }) => ({
	showDialog,
	activeTab: tabs.findIndex( t => t.id === activeTab ),
	tabs,
	project,
	config
})

const mapDispatchToProps = dispatch => ({
	addTab: tab => dispatch(actions.addTab(tab)),
	createFile: file => dispatch(actions.createFile(file)),
	updateFile: file => dispatch(actions.updateFile(file)), 
	updateTab: tab => dispatch(actions.updateTab(tab)),
	changeTabContent: file => dispatch(actions.changeTabContent(file.id, file.content)),

	createFolder: folder => dispatch(actions.createFolder(folder)),
	changeActivePath: path => dispatch(actions.changeActivePath(path)),
	deleteNode: node => dispatch(actions.deleteNode(node)),
	renameNode: (path, newName) => dispatch(actions.renameNode(path,newName)),
	updateProject: project => dispatch(actions.updateProject(project)),

	updateConfig: config => dispatch(actions.updateConfig(config)),
	updateConnection: connection => dispatch(actions.updateConnection(connection)),

	changeDialog: dialog => dispatch(actions.changeDialog(dialog)),
})


export default connect(mapStateToProps, mapDispatchToProps)(Dialogs)