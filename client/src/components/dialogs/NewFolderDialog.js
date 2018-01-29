import React from 'react'
import { 
	Modal,	
	InputGroup, FormControl,
	Button
} from 'react-bootstrap'

import * as api from '../../api/api.js'

export default class NewFolderDialog extends React.Component {
	constructor(props){
		super(props)

		let path = this.props.project.activePath
		path = path.replace("/" + this.props.project.name, "")

		this.state = { 
			filename: "Untitled",
			path,
		}
	}

	componentWillReceiveProps(props){
		let path = props.project.activePath
		path = path.replace("/" + this.props.project.name, "")

		this.setState({ path })
	}

	onChange(e){
		const { id: field, value } = e.target

		this.setState({ [field] : value })
	}

	save(){
		/*new file in fullpath*/
		const { save: saveFolder, close, project } = this.props
		let { filename, path } = this.state
		path = path.replace(/\/$/,"")

    const folder = {
      filepath: path + "/" + filename,
      name: this.state.filename,
      children: []
    }

		api.addFolder(project.name, folder, () => saveFolder(folder))
		close()
	}

	render(){
		return <Modal show={this.props.show} onHide={this.props.close}>
			<Modal.Header closeButton>
				<Modal.Title>Create Folder</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<InputGroup>
					<InputGroup.Addon>name</InputGroup.Addon>
					<FormControl type="text" id="filename" onChange={this.onChange.bind(this)} value={this.state.filename}/>
				</InputGroup>
				<InputGroup>
					<InputGroup.Addon>path</InputGroup.Addon>
					<FormControl type="text" id="path" onChange={this.onChange.bind(this)} value={this.state.path}/>
				</InputGroup>
			</Modal.Body>
			<Modal.Footer>
				<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
				<Button bsStyle="success" onClick={this.save.bind(this)}>Save</Button>
			</Modal.Footer>
		</Modal>
	}
}