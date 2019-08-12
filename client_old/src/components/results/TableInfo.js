import React, { Component } from 'react';
import { Grid, Col, Nav, NavItem, Table, ListGroup, ListGroupItem, Panel } from 'react-bootstrap';
import * as api from '../../api/api';

class Columns extends Component {
	constructor(props){
		super(props);

		this.state = {
			columns: props.columns || []
		};
	}

	componentWillReceiveProps(props){
		this.setState({ columns: props.columns });
	}

	render(){
		const { pk } = this.props;

		let pkColumns = 'No PK';
		if ( pk && pk.length > 0 ){
			pkColumns = pk.join(', ');
		}

		const addColumn = null;

		let ptkColumn =  'No Partition Key';
		const columns = this.state.columns.map( (col, idx) => {
			ptkColumn = col.partitionKey ? col.name : ptkColumn;

			return <tr key={col.name}>
				<td>{col.name}</td>
				<td>{col.type.toUpperCase()}</td>
				<td>{col.size ? col.size : 'N/A'}</td>
				<td>{col.nullable ? 'YES' : 'NO'}</td>
			</tr>;
		});

		const remarks = <Panel key='pk' >
			<Panel.Body>
				Primary Key: <b>{pkColumns}</b> <br/>
				Partition Key: <b>{ptkColumn}</b>
			</Panel.Body>
		</Panel>;

		return [
			<Table key='table' condensed hover>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Length</th>
						<th>Nullable</th>
					</tr>
				</thead>
				<tbody>
					{columns}
				</tbody>
			</Table>,
			addColumn,
			remarks
		];
	}
}

class Indexes extends Component {
	constructor(props) {
		super(props);
	
		this.state = {
			indexes: props.indexes || []
		};
	}

	componentWillReceiveProps(nextProps) {
		this.setState({ indexes: nextProps.indexes || [] });
	}

	render() {
		const indexes = this.state.indexes.map( index => <ListGroupItem key={index.name} header={index.name}>
			{index.columns.join(', ')}
		</ListGroupItem>);

		return <ListGroup>
			{indexes}
		</ListGroup>;
	}
	
}

export default class TableInfo extends Component {
	constructor(props){
		super(props);

		this.state = {
			activeKey: 1
		};
	}

	/**
	 * Todo:
	 * 	Acciones
	 * 		Alters
	 * 		Drops
	 * 		Partition Object
	 */

	render(){
		const { tableInfo } = this.props;

		return <Grid className='TableInfo'>
			<Col xs={2}>
				<Nav bsStyle="pills" stacked activeKey={this.state.activeKey} onSelect={activeKey => this.setState({ activeKey })}>
					<NavItem eventKey={1}>
						Columns
					</NavItem>
					{
						tableInfo.type !== 'export' 
							? <NavItem eventKey={2}> Indexes </NavItem>
							: null
					}
					<NavItem key='procedures' disabled eventKey={3}>
						Procedures
					</NavItem>
				</Nav>
			</Col>
			<Col xs={10}>
				{this.state.activeKey === 1 ? <Columns columns={tableInfo.columns} pk={tableInfo.pks}/> : null}
				{this.state.activeKey === 2 ? <Indexes indexes={tableInfo.indexes} /> : null}
				{this.state.activeKey === 3 ? 'Procedures' : null}
			</Col>
		</Grid>; 
	}
}