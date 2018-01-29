import React from 'react'

import { Button,	Modal, InputGroup, FormControl } from 'react-bootstrap'

export default class ConfigDialog extends React.Component {
	constructor(props){
		super(props)

		const { host, user, password, timeout } = props.config

		this.state = { host, user, password, timeout }
	}

	componentWillReceiveProps(props){
		const { host, user, password, timeout } = props.config
		this.setState({ host, user, password, timeout })
	}

	onChange(e){
		const field = e.target.id
		const value = e.target.value
		this.setState({ [field] : value })
	}

	save(){
		const { save, close } = this.props

		save(Object.assign({},this.state))
		close()
	}

	render(){
		return <Modal show={this.props.show} onHide={this.props.close}>
			<Modal.Header closeButton>
				<Modal.Title>Configuration</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<InputGroup>
					<InputGroup.Addon>Host</InputGroup.Addon>
					<FormControl type="text" id="host" onChange={this.onChange.bind(this)} value={this.state.host}/>
				</InputGroup>
				<InputGroup>
					<InputGroup.Addon>User</InputGroup.Addon>
					<FormControl type="text" id="user"  onChange={this.onChange.bind(this)} value={this.state.user}/>
				</InputGroup>
				<InputGroup>
					<InputGroup.Addon>Password</InputGroup.Addon>
					<FormControl type="password" id="password" onChange={this.onChange.bind(this)} value={this.state.password}/>
				</InputGroup>
				<InputGroup>
					<InputGroup.Addon>Timeout</InputGroup.Addon>
					<FormControl type="number" id="timeout" onChange={this.onChange.bind(this)} value={this.state.timeout}/>
					<InputGroup.Addon>ms</InputGroup.Addon>
				</InputGroup>
			</Modal.Body>
			<Modal.Footer>
				<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
				<Button bsStyle="success" onClick={this.save.bind(this)}>Save</Button>
			</Modal.Footer>
		</Modal>
	}
}