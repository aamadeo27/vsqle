import React from 'react';

import { Button, Checkbox, Modal, FormControl, Glyphicon, Table, ButtonGroup } from 'react-bootstrap';
import Download from '../common/Download';

class Connection extends React.Component {
	constructor(props){
		super(props);

		const { name, nodes, index } = props.connection;
		this.state = { name, nodes, index };
	}
	
	onChange({ target }){
		const field = target.id;
		const value = target.value;

		target.focus();
		this.setState({ [field] : value });
	}

	save(){
		console.log({ index: this.props.index, ...this.state });
		this.props.onChange({...this.state, editable: false });
	}

	close(){
		const{ name, nodes, index } = this.props.connection;
		this.props.onChange({ name, nodes, index, editable: false });
	}

	render(){
		const { name, nodes } = this.state;
		const { connection } = this.props;

		const onSubmit = e => {
			e.preventDefault();
			this.save();
			return false;
		};

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
			</tr>;
		}

		return <tr>
			<td className="connection-name">{name}</td>
			<td className="connection-nodes">{nodes.substr(0,100) + (nodes.length > 100 ? '...' : '')}</td>
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
		</tr>;
	}
}

export default class ConfigDialog extends React.Component {
	constructor(props){
		super(props);

		const { connections, useLocalTime, debugMode, fullColumn } = props.config;

		this.state = { connections, useLocalTime, debugMode, fullColumn, new: { name: '', nodes: ''}, download: false };
	}

	shouldComponentUpdate(props){
		return props.config !== this.props.config;
	}

	componentWillReceiveProps(props){
		const { connections, useLocalTime, fullColumn, debugMode } = props.config;
		this.setState({ connections, useLocalTime, fullColumn, debugMode, download: false });
	}

	onChange(e){
		const field = e.target.id;
		const value = e.target.value;
		this.setState({ [field] : value });
	}

	onChangeConnection(conn){
		const connections = this.state.connections.map( (c,i) => c.index !== conn.index ? c : conn);

		this.setState({ connections });
	}

	add(){
		const connections = [ ...(this.state.connections || [])];
		const index = new Date().getTime();
		const conn = { name: 'NewConnection' + connections.length , nodes: 'Node1,Node2,Node3', editable:true, index };

		if ( connections.find(c => c.name === conn.name) ){
			return this.setState({ error : 'Duplicate connection name' });
		}

		connections.push(conn);

		this.setState({ connections });
	}

	save(){
		const { save, close } = this.props;
		const { connections, useLocalTime, debugMode, fullColumn, useUpsert } = this.state;

		save({ connections, useLocalTime, debugMode, fullColumn, useUpsert });
		close();
	}

	export(){
		this.setState({ download: true });

		setTimeout(() => this.setState({ download: false }), 1500 );
	}

	edit(index){
		const connections = this.state.connections.map( c => 
			c.index === index ? {...c, editable: true } : c
		);

		this.setState({ connections });
	}

	remove(index){
		const connections = this.state.connections.filter( c => c.index !== index );

		this.setState({ connections });
	}

	render(){
		const toggleCM = attr => e => this.setState({ [attr] : !this.state[attr] });

		const connections = this.state.connections || [];

		const connectionsMenu = connections.map( (c,i) => {
			return <Connection 
				connection={c}
				key={c.index}
				edit={() => this.edit(c.index)} onChange={conn => this.onChangeConnection(conn)}
				remove={() => this.remove(c.index)}
			/>;
		});

		const config = JSON.stringify({...this.state, download: undefined });

		return <Modal show={this.props.show} onHide={this.props.close} bsSize="large">
			<Modal.Header closeButton>
				<Modal.Title>Configuration</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Checkbox onChange={toggleCM('fullCollumn')} checked={!!this.state.fullColumn}>
					Show full value of columns
				</Checkbox>
				<Checkbox onChange={toggleCM('useUpsert')} checked={!!this.state.useUpsert}>
					Use upserts in generated SQL
				</Checkbox>
				<Checkbox onChange={toggleCM('useLocalTime')} checked={!!this.state.useLocalTime}>
					Use local time
				</Checkbox>
				<Checkbox onChange={toggleCM('debugMode')} checked={!!this.state.debugMode}>
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
				<Download name='vsqle.json' content={config} download={this.state.download}/>
			</Modal.Body>
			<Modal.Footer>
				{ this.state.error ? <span className="text-danger pull-left">{this.state.error}</span> : ''}
				<ButtonGroup style={{ float: 'left' }}>
					<Button bsStyle="success" onClick={() => this.save()}>Save</Button>
					<Button bsStyle="primary" onClick={() => this.export()}>Export</Button>
				</ButtonGroup>
				<ButtonGroup>
					<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
				</ButtonGroup>
			</Modal.Footer>
		</Modal>;
	}
}