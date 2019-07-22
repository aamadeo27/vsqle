import React from 'react'

import { Button, Checkbox, Modal, FormControl, FormGroup, ControlLabel, Glyphicon, Table, ButtonGroup } from 'react-bootstrap'

function FieldGroup({ id, label, help, ...props }) {
  return (
    <FormGroup>
      <ControlLabel>{label}</ControlLabel>
      <FormControl {...props} />
    </FormGroup>
  );
}

export default class CreateObjectDialog extends React.Component {
	constructor(props){
		super(props)

		this.state = { fields: {} };
	}

	save(){
		const { save, close } = this.props
		const { fields } = this.state;

		save(fields);
		close();
  }
  
  onChange(name, type){
    return e => {
      const fields = {... this.state.fields };

      if ( type === 'cb' ) fields[name] = e.target.checked;
      else fields[name] = e.target.value;

      this.setState({ fields })
    }
  }

	render(){

    const fields = this.props.fields.map( ({ name, label, type }, i) => {
      let element = null;
      if ( type === 'cb' ){
        element = <Checkbox key={i} onChange={this.onChange(name,type)} checked={!!this.state.fields[name]}>
          {label}
        </Checkbox>;
      }

      if ( type === 'i' ){
        element = <FieldGroup key={i} type="text" onChange={this.onChange(name,type)} value={this.state.fields[name]} label={label}/>;
      }

      return element;
    });

		return <Modal show={this.props.show} onHide={this.props.close} bsSize="large">
			<Modal.Header closeButton>
				<Modal.Title>{this.props.title}</Modal.Title>
			</Modal.Header>
			<Modal.Body>
        <form>
          {fields}
        </form>
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