import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Row, Col, FormControl, ButtonGroup, Button, ListGroup, ListGroupItem } from 'react-bootstrap'

import * as actions from '../../Actions.js'

class ObjectList extends Component {
  constructor(props){
    super(props);
    this.state = { filterText: '', activeFilter: '' };
  }

  render(){
    const items = this.props.items
        .filter( i => i.header.match(this.state.activeFilter))
        .map( ({ header, description, action }, i) => 
          <ListGroupItem key={i} header={header} onClick={action}>{description}</ListGroupItem> 
        );
    
    const checkSubmit = e => {
      if ( e.keyCode === 13 ) this.setState({ activeFilter: this.state.filterText });
    };

    return <div className="container-fluid">
      <Row>
        <Col xs={8}>
          <FormControl type="text" placeholder="filter" value={this.state.filterText} onChange={e => this.setState({ filterText : e.target.value })} onKeyDown={checkSubmit}/>
        </Col>
        <Col xs={2}>
          <Button bsStyle="success" bsSize="small" onClick={this.props.create}>
            Create
          </Button>
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <div className="object-list">
            <ListGroup bsSize="small">
              {items}
            </ListGroup>
          </div>
        </Col>
      </Row>
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

export default connect(mapStateToProps, mapDispatchToProps)(ObjectList)