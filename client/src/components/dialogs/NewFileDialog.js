import React from 'react'

import { Button, ControlLabel, Modal, InputGroup, FormControl } from 'react-bootstrap'

export default class NewFileDialog extends React.Component {
	constructor(props){
		super(props)

		this.state = { 
			filename: "Untitled",
			path: "/"
		}
	}

	componentWillReceiveProps(props){
    const { getDir } = this.props;
		let path = props.project.activePath

    path = path.replace("/" + props.project.name, "")
    
    if ( path.length === 0 ) path = "/";
    if ( getDir ) path = getDir(props.project.name, path);

		this.setState({ path, filename: "Untitled" })
	}

	onChange(e){
		const field = e.target.id
		const value = e.target.value
		this.setState({ [field] : value })
	}

	save(){
		/*new file in fullpath*/
		const { save: saveFile, close } = this.props

		let { filename, path } = this.state
		path = path.replace(/\/$/,"")

		saveFile(path + "/" + filename)
		close()
	}

	render(){
		const onSubmit = e => {
			e.preventDefault()
			this.save()

			return false
    }
    
    let path = this.state.path;
    if ( !path.match(/\/$/) ) path += "/";

		return <Modal show={this.props.show} onHide={this.props.close}>
			<form onSubmit={onSubmit}>
				<Modal.Header closeButton>
					<Modal.Title>Create File</Modal.Title>
				</Modal.Header>
				<Modal.Body>
          <ControlLabel>Path </ControlLabel>
          <InputGroup>            
            <InputGroup.Addon>{path}</InputGroup.Addon>
            <FormControl type="text" id="filename" onChange={this.onChange.bind(this)} value={this.state.filename}/>
          </InputGroup>
					{/*<InputGroup>
						<InputGroup.Addon>path</InputGroup.Addon>
						<FormControl type="text" id="path" onChange={this.onChange.bind(this)} value={this.state.path}/>
					</InputGroup>*/}
				</Modal.Body>
				<Modal.Footer>
					<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
					<Button bsStyle="success" type="submit">Save</Button>
				</Modal.Footer>
			</form>
		</Modal>
	}
}