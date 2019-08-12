import React from 'react'
import { 
	Modal,	
	InputGroup, FormControl,
	Button
} from 'react-bootstrap'

import * as api from '../../api/api.js'

export default class RenameDialog extends React.Component {
	constructor(props){
		super(props)

		const path = this.props.project.activePath
		const name = path.split("/").pop()

		this.state = { name, path }
	}

	componentWillReceiveProps(props){
		const path = this.props.project.activePath
		const name = path.split("/").pop()

		this.setState({ path, name })
	}

	onChange(e){
		this.setState({ name : e.target.value })
	}

	save(){
		/*new file in fullpath*/
		const { save: rename, close, project } = this.props

		console.log({ activePath: project.activePath, name: this.state.name })

		const callback = () => rename(project.activePath, this.state.name)

		api.renameNode(project.name, project.activePath, this.state.name, callback)
		close()
	}

	render(){
		const onSubmit = e => {
			e.preventDefault()
			this.save()
			return false
		}

		return <Modal show={this.props.show} onHide={this.props.close}>
			<form onSubmit={onSubmit}>
				<Modal.Header closeButton>
					<Modal.Title>Rename</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<InputGroup>
						<InputGroup.Addon>name</InputGroup.Addon>
						<FormControl type="text" id="filename" onChange={this.onChange.bind(this)} value={this.state.name}/>
					</InputGroup>
				</Modal.Body>
				<Modal.Footer>
					<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
					<Button bsStyle="success" type="submit">Save</Button>
				</Modal.Footer>
			</form>
		</Modal>
	}
}