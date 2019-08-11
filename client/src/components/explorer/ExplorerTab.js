import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Row, Col, Button, Glyphicon, Nav, NavItem } from 'react-bootstrap';

import ObjectList from './ObjectList';

import * as actions from '../../Actions.js';
import * as api from '../../api/api';
import * as schema from '../../api/schema';

import CreateTableDialog from '../dialogs/CreateTableDialog';
import CreateProcedureDialog from '../dialogs/CreateProcedureDialog';

class ExplorerTab extends Component {
	constructor(props){
		super(props);
		this.state = { activeKey: 1 };
	}

	changeObjectView(activeKey){
		this.setState({ activeKey });
		this.props.clearResults();
	}

	onChange( newValue ){
		const { changeTabContent, id } = this.props;

		changeTabContent(id, newValue);
	}

	getRelativeTab(d){
		const { tabs, file } = this.props;

		const idx = tabs.findIndex( t => t.id === file.id );

		return tabs[ (tabs.length + idx + d) % tabs.length ];
	}
  
	tableDesc({ remarks }){

		if ( remarks ){
			let dr = remarks.drEnabled ? ' DR enabled' : '';
			
			if ( remarks.partitionColumn ){
				return <span>Partitioned on <b>{remarks.partitionColumn.toLowerCase()}</b>{dr}</span>;
			} else {
				return <span>Not Partitioned {dr}</span>;
			}
		}

		return <span>Not Partitioned</span>;
	}

	selectTable(table){
		console.log('Selected Table', table);
		this.props.clearResults();
		this.props.addResult({
			queryConfig: { id: 0 },
			tableInfo: table
		});
	}

	selectProcedure(procedure){
		this.props.clearResults();

		api.execStoreProcedure({ procedure: '@ExplainProc', args: [`'${procedure}'`] })
			.then ( results => {
				this.props.addResult({
					queryConfig: { id: 0 },
					procedureInfo: results[0],
				});
			} )
			.catch ( err => console.error('Error in select procedure', err ));
	}

	executeDDL = object => (ddl, handleError) => {
		const { updateSchema } = this.props;
		
		const schemaFunctions = {
			load: () => schema.load(),
			update: schema => updateSchema(schema)
		};

		api.executeDDL(ddl, handleError, schemaFunctions)
			.then( response => {
				if ( !response.error ) this.close(object);
			})
			.catch( err => console.error('Error al ejecutar DDL ', err));
	}

	close(object){
		if ( object === 'table' ){
			this.setState({ createTableDialog: false, createStreamDialog: false });
		} else {
			this.setState({ createProcedureDialog: false });
		}
	}

	render(){
		const { schema } = this.props;

		const tables = [];
		const streams = [];
		const procedures = [];

		for( let name in schema.tables ){
			const t = schema.tables[name];

			if ( t.type === 'table' ){
				tables.push({ header: t.name, description: this.tableDesc(t), action: () => this.selectTable(t) });
			} else {
				streams.push({ header: t.name, description: this.tableDesc(t), action: () => this.selectTable(t) });
			}
		}

		for( let name in schema.procedures ){
			const p = schema.procedures[name];

			const description = p.reduce( (sig,param, i) => sig + (i > 1 ? ',' : '') + param.type, '(') + ')';
			const item = { header: name, description, action: () => this.selectProcedure(name)};
			const partitionIdx = p.findIndex( param => param && param.partitionParameter );

			if ( partitionIdx >= 0 ) item.description += ' Partition on param ' + partitionIdx;

			procedures.push(item);
		}

		const createTableDialogProps = {
			schema,
			stream: !!this.state.createStreamDialog,
			show: !!this.state.createTableDialog || !!this.state.createStreamDialog,
			save: object => this.saveTable(object),
			executeDDL: this.executeDDL('table'),
			close: () => this.close('table')
		};

		const createProcedureDialogProps = {
			schema,
			show: !!this.state.createProcedureDialog,
			executeDDL: this.executeDDL('procedure'),
			close: () => this.close('procedure')
		};

		return <div className="ExplorerTab">
			<div className="container-fluid">
				<Row>
					<Col xs={12}>
						<Row>
							<Button bsSize="xsmall" title="close tab" bsStyle="default" onClick={this.props.close} className="pull-right">
								<Glyphicon glyph="remove"/>
							</Button>
						</Row>
						<Row style={{ height: '35vh', marginTop : '1vh' }}>
							<Col xs={2}>
								<Nav bsStyle="pills" stacked activeKey={this.state.activeKey} onSelect={activeKey => this.changeObjectView(activeKey)}>
									<NavItem eventKey={1}>
										Tables
									</NavItem>
									<NavItem eventKey={2}>
										Streams
									</NavItem>
									<NavItem eventKey={3}>
										Procedures
									</NavItem>
								</Nav>
							</Col>
							<Col xs={10}>
								{this.state.activeKey === 1 ? <ObjectList items={tables} create={() => this.setState({ createTableDialog: true })}/> : null}
								{this.state.activeKey === 2 ? <ObjectList items={streams} create={() => this.setState({ createStreamDialog: true })}/> : null}
								{this.state.activeKey === 3 ? <ObjectList items={procedures} create={() => this.setState({ createProcedureDialog: true })} /> : null}
							</Col>
						</Row>
					</Col>
				</Row>
			</div>
			<CreateTableDialog {...createTableDialogProps} />
			<CreateProcedureDialog {...createProcedureDialogProps} />
		</div>;
	}
}

const mapDispatchToProps = dispatch => ({
	changeTab: id => dispatch(actions.changeTab(id)),
	addResult: result => dispatch(actions.addResult(result)),
	updateSchema: schema => dispatch(actions.updateSchema(schema)),
	clearResults: () => dispatch(actions.clearResults),
	updateLogoSpeed: speed => dispatch(actions.updateLogoSpeed(speed))
});

const mapStateToProps = ({ activeTab, tabs, config, project, schema, vars, queue }, props) => ({
	activeTab,
	file: tabs.find( t => t.id === props.id),
	tabs, 
	config,
	projectName: project.name,
	schema,
	vars,
	queue
});

export default connect(mapStateToProps, mapDispatchToProps)(ExplorerTab);