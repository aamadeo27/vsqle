import React from 'react'
import { Button, Modal, InputGroup, FormControl, Fade } from 'react-bootstrap'
import * as api from '../../api/api'

export default class LoginDialog extends React.Component {
	constructor(props){
		super(props)

		const { connections } = props

		this.state = { user: "", password: "", connection: (connections[0] && connections[0].name) || "" }
	}

	componentWillReceiveProps(props){
		const { connections } = props

		this.setState({ user: "", password: "", connection: (connections[0] && connections[0].name) || "" })
	}

	onChange(e){
		const field = e.target.id
		const value = e.target.value
		this.setState({ [field] : value })
	}

	login(){
		const { updateConnection, close, connections } = this.props
		const { user, connection: name, password } = this.state

		let nodes = []
		if ( connections ){
			console.log({ connections, name })
			nodes = connections.find(c=>c.name === name).nodes
		} else {
			return this.setState({ error: "No connections found" })
		}

		const userConfig = { 
			user,
			password,
			nodes,
			name
		}

		api.login(userConfig).then( r => {
			if ( r.status === 0 ){
				updateConnection({ user, name })
				this.setState({ loading: false })
				close()
			} else {
				updateConnection({})

				this.setState({ error : "User & Password don't match", loading: false })
			}
		}).catch( error => {
			console.error("Server error", error)
			this.setState({ error : "Server error", loading: false })
		})
	}

	render(){
		const connections = this.props.connections || []
		const { connection, error } = this.state
		const connectionsMenu = connections.map( c => <option key={c.name} value={c.name}>{c.name}</option> )
		const onSubmit = e => {
			e.preventDefault();
			this.setState({ error: undefined, loading: true })
			this.login()

			return true
		}

		let errorMessage = ""
		if ( error ){
			errorMessage = <Fade in={!!error} timeout={800}>
				<span className="text-danger pull-left">{error}</span>
			</Fade>
		}

		return <Modal show={this.props.show} onHide={this.props.close}>
			<form onSubmit={onSubmit} id="loginForm">
				<Modal.Header closeButton>
					<Modal.Title>Login</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<InputGroup>
						<InputGroup.Addon>Connection</InputGroup.Addon>
						<FormControl componentClass="select" id="connection" onChange={e => this.onChange(e)} value={connection}>
							{connectionsMenu}
						</FormControl>
					</InputGroup>
					<InputGroup>
						<InputGroup.Addon>User</InputGroup.Addon>
						<FormControl type="text" id="user"  onChange={e => this.onChange(e)} value={this.state.user}/>
					</InputGroup>
					<InputGroup>
						<InputGroup.Addon>Password</InputGroup.Addon>
						<FormControl type="password" id="password" onChange={e => this.onChange(e)} value={this.state.password}/>
					</InputGroup>
				</Modal.Body>
				<Modal.Footer>
					{errorMessage}
					<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
					<Button bsStyle="success" type="submit">Log in</Button>
				</Modal.Footer>
			</form>
		</Modal>
	}
}