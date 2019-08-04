import React from 'react'

import { Col, Button, Modal, FormControl, FormGroup, ControlLabel, Glyphicon, Form, ButtonGroup } from 'react-bootstrap'

function FieldGroup({ id, label, help, ...props }) {
  const labelSize = props.labelSize || 2;
  const controlSize = props.controlSize || 10;

  return (
    <FormGroup>
      <Col xs={2} componentClass={ControlLabel}>{label}</Col>
      <Col xs={10}>
        <FormControl {...props} />
      </Col>
    </FormGroup>
  );
}

export default class CreateProcedure extends React.Component {
	constructor(props){
		super(props)

		this.state = { 
      error: null,
      name: '',
      type: 'sql',
      class: '',
      sql: '',
      partitioned: 'true',
      partitionTable:'',
      partitionColumn:''
    };
  }

	save(){
    
    const { save, close, schema } = this.props;

    if ( ! schema || ! schema.procedures ) return this.setState({ error: 'Not logged in'});

    const procedure = {...this.state};
    delete procedure.error;

    procedure.name = procedure.type === 'sql' ? procedure.name : procedure.class.split('.').pop();

    if ( procedure.name.length === 0 ) return this.setState({ error : 'Name must not be empty' });
    if ( schema.procedures[procedure.name] ) return this.setState({ error: 'Procedure ' + procedure.name + ' already exists'});

    if ( procedure.type === 'sql' && !procedure.sql ) return this.setState({ error: 'SQL is empty'});
    if ( procedure.type === 'class' && !procedure.class ) return this.setState({ error: 'Class is empty'});
    if ( procedure.partitioned === 'true' && ( !procedure.partitionColumn || !procedure.partitionTable ) ){
      return this.setState({ error: 'Partition info is incomplete' });
    }

    const partitionedSQL = ` partition on ${procedure.partitionTable} column ${procedure.partitionColumn}`;
    let sql = null;
    if ( procedure.type === 'sql' ){

      sql = `create procedure ${procedure.name} ${procedure.partitioned === 'true' ? partitionedSQL :''} as ${procedure.sql}`;
    } else {
      sql = `create procedure ${procedure.partitioned === 'true' ? partitionedSQL :''} from class ${procedure.class}`;
    }

    console.log({ sql });

		close();
  }

  onChange(field, value){
    this.setState({ [field] : value });
  }

	render(){
    const procedure = this.state;
    const types = [<option value={'sql'} key={'sql'}>as sql</option>,<option value={'class'} key={'fc'}>from class</option>];
    const booleans = ['NO','YES'].map( t => <option value={t === 'YES'} key={t}>{t}</option>);
    
    const select = (value, options, onChange) => 
      <FormControl componentClass="select" value={value} onChange={onChange} xs={2}>
        {options}
      </FormControl>;    

    const onChange = field => e => this.onChange(field, e.target.value);
    
    const typeItem = select(procedure.type, types, onChange('type'));
    const partitionedItem = select(procedure.partitioned, booleans, onChange('partitioned'));
    const partitionTableItem = <FormControl type='text' value={procedure.partitionTable} onChange={onChange('partitionTable')} />;
    const partitionColumnItem = <FormControl type='text' value={procedure.partitionColumn} onChange={onChange('partitionColumn')} />;

		return <Modal show={this.props.show} onHide={() => {}} bsSize="large">
			<Modal.Header closeButton>
				<Modal.Title>Create Procedure</Modal.Title>
			</Modal.Header>
			<Modal.Body>
        <Form horizontal>
          <FormGroup>
            <Col componentClass={ControlLabel} xs={2}>Procedure type</Col>
            <Col xs={2}>
              {typeItem}
            </Col>
            <Col componentClass={ControlLabel} xs={2}>Partitioned</Col>
            <Col xs={2}>
              {partitionedItem}
            </Col>
          </FormGroup>
          { 
            procedure.partitioned === 'true'
                ? <FormGroup>
                    <Col componentClass={ControlLabel} xs={2}>Partition on</Col>
                    <Col xs={2}>
                      {partitionTableItem}
                    </Col>
                    <Col componentClass={ControlLabel} xs={2}>Column</Col>
                    <Col xs={2}>
                      {partitionColumnItem}
                    </Col>
                  </FormGroup>
                : null
          }
          { 
            procedure.type === 'class'
                ? <FieldGroup type="text" onChange={onChange('class')} value={procedure.class} label='From class'/>
                : [
                  <FieldGroup key='name' type="text" onChange={onChange('name')} value={procedure.name } label='Procedure Name'/>,
                  <FieldGroup key='sql' componentClass="textarea" onChange={onChange('sql')} value={procedure.sql} label='As SQL'/>
                ]
          }
        </Form>        
			</Modal.Body>
			<Modal.Footer>
				{ !!this.state.error ? <span className="text-danger pull-left">{this.state.error}</span> : ""}
				<ButtonGroup>
					<Button bsStyle="success" onClick={() => this.save()}>Save</Button>
					<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
				</ButtonGroup>
			</Modal.Footer>
		</Modal>
	}
}