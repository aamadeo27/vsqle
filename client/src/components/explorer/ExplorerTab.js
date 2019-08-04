import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Row, Col, Button, Glyphicon, Nav, NavItem } from 'react-bootstrap'

import ObjectList from './ObjectList';

import * as actions from '../../Actions.js'
import { IGNORE_PATTERN } from '../../Constants.js'

import CreateTableDialog from '../dialogs/CreateTableDialog';
import CreateProcedureDialog from '../dialogs/CreateProcedureDialog';

class ExplorerTab extends Component {
  constructor(props){
    super(props);
    this.state = { activeKey: 1 };
  }

  onChange( newValue ){
    const { changeTabContent, id } = this.props
		const ignorePattern = new RegExp("^" + IGNORE_PATTERN + ".*")
		
		if ( newValue.match(ignorePattern) || newValue === "" ) {
			return
		}

		changeTabContent(id, newValue)
  }

	getRelativeTab(d){
		const { tabs, file } = this.props

		const idx = tabs.findIndex( t => t.id === file.id )

		return tabs[ (tabs.length + idx + d) % tabs.length ]
	}
  
  tableDesc({ remarks }){
    let desc = 'Not partitioned';

    if (!remarks) return desc;

    if ( remarks.partitionColumn ){
      desc = `Partitioned on ${remarks.partitionColumn}`;
    }

    if ( remarks.drEnabled ){
      desc += " / DR ";
    }

    return desc;
  }

  render(){
    const { schema } = this.props;

    const tables = [];
    const streams = [];
    const procedures = [];

    for( let name in schema.tables ){
      const t = schema.tables[name];

      if ( t.type === "table" ){
        tables.push({ header: t.name, description: this.tableDesc(t), action: () => console.log("View table ", t) })
      } else {
        streams.push({ header: t.name, description: this.tableDesc(t), action: () => console.log("View table ", t) })
      }
    }

    for( let name in schema.procedures ){
      const p = schema.procedures[name];

      const description = p.reduce( (sig,param, i) => sig + (i > 1 ? ',' : '') + param.type, '(') + ')';
      const item = { header: name, description, action: () => console.log("View Proc", p) };
      const partitionIdx = p.findIndex( param => param && param.partitionParameter );

      if ( partitionIdx >= 0 ) item.description += ' Partition on param ' + partitionIdx;

      procedures.push(item);
    }

    const createTableDialogProps = {
      schema,
      stream: !!this.state.createStreamDialog,
      show: !!this.state.createTableDialog || !!this.state.createStreamDialog,
      save: object => this.saveTable(object),
      close: () => this.setState({ createTableDialog: false, createStreamDialog: false })
    };

    const createProcedureDialogProps = {
      schema,
      show: !!this.state.createProcedureDialog,
      close: () => this.setState({ createProcedureDialog: false })
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
              <Row style={{ height: "35vh", marginTop : "1vh" }}>
                <Col xs={2}>
                  <Nav bsStyle="pills" stacked activeKey={this.state.activeKey} onSelect={activeKey => this.setState({ activeKey })}>
                    <NavItem eventKey={1}>
                      Tables
                    </NavItem>
                    <NavItem eventKey={2}>
                      Streams
                    </NavItem>
                    <NavItem eventKey={3}>
                      Procedures
                    </NavItem>
                    <NavItem eventKey={5}>
                      Indexes
                    </NavItem>
                  </Nav>
                </Col>
                <Col xs={10}>
                  {this.state.activeKey === 1 ? <ObjectList items={tables} create={() => this.setState({ createTableDialog: true })}/> : null}
                  {this.state.activeKey === 2 ? <ObjectList items={streams} create={() => this.setState({ createStreamDialog: true })}/> : null}
                  {this.state.activeKey === 3 ? <ObjectList items={procedures} create={() => this.setState({ createProcedureDialog: true })} /> : null}
                  {this.state.activeKey === 4 ? <ObjectList items={tables} create={false} /> : null}
                </Col>
              </Row>
          </Col>
        </Row>
			</div>
      <CreateTableDialog {...createTableDialogProps} />
      <CreateProcedureDialog {...createProcedureDialogProps} />
    </div>
  }
}

const mapDispatchToProps = dispatch => ({
	changeTab: id => dispatch(actions.changeTab(id)),

  updateLogoSpeed: speed => dispatch(actions.updateLogoSpeed(speed))
})

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

export default connect(mapStateToProps, mapDispatchToProps)(ExplorerTab)