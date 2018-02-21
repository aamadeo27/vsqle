import React from 'react'

import { Button, Checkbox, Modal, FormControl, Glyphicon, Table, ButtonGroup } from 'react-bootstrap'

class Connection extends React.Component {
	constructor(props){
		super(props)

		const { name, nodes, index } = props.connection
		this.state = { name, nodes, index }
	}
	
	onChange({ target }){
		const field = target.id
		const value = target.value

		target.focus()
		this.setState({ [field] : value })
	}

	save(){
		console.log({ index: this.props.index, ...this.state })
		this.props.onChange({...this.state, editable: false })
	}

	close(){
		const{ name, nodes, index } = this.props.connection
		this.props.onChange({ name, nodes, index, editable: false })
	}

	render(){
		const { name, nodes } = this.state
		const { connection } = this.props

		const onSubmit = e => {
			e.preventDefault();
			this.save()
			return false
		}

		if ( connection.editable ) {
			return <tr>
				<td className="connection-name">
					<form id="name-f" onSubmit={onSubmit}>
						<FormControl id="name" type="text" size={10} value={name} onChange={e => this.onChange(e)}/>
					</form>
				</td>		
				<td className="connection-nodes">
					<form id="nodes-f" onSubmit={onSubmit}>
						<FormControl id="nodes" type="text" size={30} value={nodes} onChange={e => this.onChange(e)}/>
					</form>
				</td>
				<td>
					<ButtonGroup>
						<Button bsSize="small" bsStyle="success" onClick={onSubmit}>
							save
						</Button>
						<Button  bsSize="small" bsStyle="danger" onClick={() => this.close()}>
							cancel
						</Button>
					</ButtonGroup>
				</td>
			</tr>
		}

		return <tr>
			<td className="connection-name">{name}</td>
			<td className="connection-nodes">{nodes.substr(0,100) + (nodes.length > 100 ? "..." : "")}</td>
			<td>
				<ButtonGroup>
					<Button bsSize="xsmall" bsStyle="primary" onClick={this.props.edit}>
						<Glyphicon glyph="edit"/>
					</Button>
					<Button bsSize="xsmall" bsStyle="danger" onClick={this.props.remove}>
						<Glyphicon glyph="trash"/>
					</Button>
				</ButtonGroup>
			</td>
		</tr>
	}
}

export default class ConfigDialog extends React.Component {
	constructor(props){
		super(props)

		const { connections, useLocalTime, debugMode } = props.config

		this.state = { connections, useLocalTime, debugMode, new: { name: "", nodes: ""} }
	}

	componentWillReceiveProps(props){
		const { connections, useLocalTime } = props.config
		this.setState({ connections, useLocalTime })
	}

	onChange(e){
		const field = e.target.id
		const value = e.target.value
		this.setState({ [field] : value })
	}

	onChangeConnection(conn){
		const connections = this.state.connections.map( (c,i) => c.index !== conn.index ? c : conn)

		this.setState({ connections })
	}

	add(){
		const connections = [ ...(this.state.connections || [])]
		const index = new Date().getTime()
		const conn = { name: "NewConnection" + connections.length , nodes: "Node1,Node2,Node3", editable:true, index }

		if ( connections.find(c => c.name === conn.name) ){
			return this.setState({ error : "Duplicate connection name"})
		}

		connections.push(conn)

		this.setState({ connections })
	}

	save(){
		const { save, close } = this.props
		const { connections, useLocalTime, debugMode } = this.state

		save({ connections, useLocalTime, debugMode })
		close()
	}

	edit(index){
		const connections = this.state.connections.map( c => 
			c.index === index ? {...c, editable: true } : c
		)

		this.setState({ connections })
	}

	remove(index){
		const connections = this.state.connections.filter( c => c.index !== index )

		this.setState({ connections })
	}

	render(){
		const toggleULT = e => this.setState({ useLocalTime: ! this.state.useLocalTime })
		const toggleDebugMode = e => this.setState({ debugMode: !this.state.debugMode })

		const connections = this.state.connections || []

		const connectionsMenu = connections.map( (c,i) => {
			return <Connection 
				connection={c}
				key={c.index}
				edit={() => this.edit(c.index)} onChange={conn => this.onChangeConnection(conn)}
				remove={() => this.remove(c.index)}
			/>
		})

		return <Modal show={this.props.show} onHide={this.props.close} bsSize="large">
			<Modal.Header closeButton>
				<Modal.Title>Configuration</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Checkbox onChange={toggleULT} checked={!!this.state.useLocalTime}>
					Use local time
				</Checkbox>
				<Checkbox onChange={toggleDebugMode} checked={!!this.state.debugMode}>
					Enable debug logging
				</Checkbox>
				<hr/>
				<h4>Connections</h4>
				<Table className="connections">
					<thead>
						<tr>
							<th className="connection-name">Connection Name</th>
							<th className="connection-nodes">Servers</th>
						</tr>
					</thead>
					<tbody>
						{connectionsMenu}
						<tr>
							<td colSpan="3">
								<Button bsStyle="primary" onClick={() => this.add()}>
									Add Connection
								</Button>
							</td>
						</tr>
					</tbody>
				</Table>
			</Modal.Body>
			<Modal.Footer>
				{ this.state.error ? <span className="text-danger pull-left">{this.state.error}</span> : ""}
				<ButtonGroup>
					<Button bsStyle="success" onClick={() => this.save()}>Save</Button>
					<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
				</ButtonGroup>
			</Modal.Footer>
		</Modal>
	}
}