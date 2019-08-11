import React from 'react';

import { 
	Table, 
	Button, ButtonGroup,
	Modal, FormControl, FormGroup, ControlLabel, 
	Glyphicon
} from 'react-bootstrap';

function FieldGroup({ id, label, help, ...props }) {
	return (
		<FormGroup>
			<ControlLabel>{label}</ControlLabel>
			<FormControl {...props} />
		</FormGroup>
	);
}

export default class CreateTableDialog extends React.Component {
	constructor(props){
		super(props);

		this.state = { 
			error: null,
			name: '',
			columns: [],
			exportTo: '',
			stream: props.stream
		};
	}
  
	componentWillReceiveProps(props){
		this.setState({ stream : props.stream });
	}
  
	onChange(name, type){
		return e => {
			const fields = {...this.state.fields};

			if ( type === 'cb' ) fields[name] = e.target.checked;
			else fields[name] = e.target.value;

			this.setState({ fields });
		};
	}

	onChangeCol(col, field, value){
		const hasPK = this.state.columns.reduce( (r,c) => r || c.primaryKey === 'true', false);
		const column = { ...this.state.columns[col] };

		if ( field === 'type' && value !== column.type ) {
			if ( value.match(/^VAR/) ) column.length = 20;
			else column.length = 0;
		}

		column[field] = value;

		let columns = this.state.columns.map(c => c.id === col ? column : c);
		if ( field === 'partitionKey' ){
			const oldPtkCol = this.state.columns.find( c => c.id !== col && c.partitionKey );

			if (oldPtkCol){
				columns = columns.map( c => oldPtkCol.id !== c.id ? c : {...oldPtkCol, partitionKey: false } );
			}

			column.nullable = 'false';

			if ( hasPK ) column.primaryKey = true;
		}

		if ( field === 'primaryKey' ){
			column.nullable = 'false';
		}

		const nowHasPK = !hasPK && columns.reduce( (r,c) => r || c.primaryKey === 'true', false);
		if ( nowHasPK ){
			console.log({ hasPK, nowHasPK });
			columns = columns.map( c => !c.partitionKey ? c : {...c, primaryKey: c.partitionKey });
		}

		this.setState({ columns });
	}

	newColumn(){
		const column = {
			id: this.state.columns.length,
			name: 'Col'+(this.state.columns.length+1),
			type: 'VARCHAR',
			length: 20,
			nullable: true,
			partitionKey: false,
			primaryKey: false
		};

		this.setState({ columns: [...this.state.columns, column ]});
	}

	save(){
		const { schema } = this.props;
		const { name, columns } = this.state;

		if ( ! schema || ! schema.tables ) return this.setState({ error: 'Not logged in'});
		if ( name.length === 0 ) return this.setState({ error : 'Name must not be empty' });
		if ( columns.length === 0 ) return this.setState({ error: 'No Columns defined'});

		if ( schema.tables[name] ) return this.setState({ error: 'Object ' + name + ' already exists'});

		const object = this.state;
  
		const type = object.stream ? 'Stream' : 'Table';
		let ptk = false;
		const pk = [];

		let cols = '';
		object.columns.forEach( c => {
			const length = c.type.match(/^VAR/) ? '(' + c.length + ')': '';
			const nullable = c.nullable !== 'false' ? '' : ' not null';

			cols += ` ${c.name} ${c.type}${length}${nullable},`;

			if ( c.partitionKey ) ptk = c.name;
      
			if ( c.primaryKey ){
				pk.push(c.name);
			}
		});

		let ddl = 'Create ' + type + ' ' + object.name;
		if ( object.stream ) {
			if ( ptk ) ddl += ' partition on column ' + ptk;
			if ( object.exportTo.length > 0 ) ddl += ' export to target ' + object.exportTo;
		}

		ddl += ' (' + cols;

		//Primary Key
		if ( pk.length > 0 ){
			ddl += ` primary key (${pk.join(',')})`;
		} else ddl = ddl.substring(0, ddl.length - 1);

		ddl += ');';

		if ( ptk && !object.stream ) ddl += ` partition table ${object.name} on column ${ptk};`;

		this.props.executeDDL(ddl, error => this.setState({ error }) );
	}

	render(){
		const tableType = this.props.stream ? 'Stream' : 'Table';

		const types = ['VARCHAR','INTEGER','BIGINT','FLOAT','TIMESTAMP','VARBINARY'].map( t => <option value={t} key={t}>{t}</option>);
		const boolean = ['NO','YES'].map( t => <option value={t === 'YES'} key={t}>{t}</option>);
    
		const select = (value, options, onChange) => 
			<FormControl componentClass="select" value={value} onChange={onChange}>
				{options}
			</FormControl>;

		const oc = (id, field, event) => {
			let value = event.target.value;

			this.onChangeCol(id, field, value);
		};

		const columns = this.state.columns.map( c =>
			<tr key={c.id}>
				<td>
					<FormControl componentClass='input' value={c.name} onChange={e => oc(c.id,'name',e)} />
				</td>
				<td>
					{select(c.type, types, e => oc(c.id,'type',e))}
				</td>
				<td>
					<FormControl componentClass='input' type='number' value={c.length} onChange={e => oc(c.id,'length',e)} disabled={!c.type.match(/^VAR/)}/>
				</td>
				<td>
					{select(c.nullable, boolean, e => oc(c.id,'nullable',e))}
				</td>
				<td>
					{select(c.partitionKey, boolean, e => oc(c.id,'partitionKey',e))}
				</td>

				{
					!this.props.stream ?
						<td>
							{select(c.primaryKey, boolean, e => oc(c.id,'primaryKey',e))}
						</td> : null
				}
        
			</tr>
		);

		const addColumn = <Button label='Add Column' onClick={() => this.newColumn()}>
			<Glyphicon glyph='add'/>
      Add Column
		</Button>;

		const exportTo = this.props.stream
			? <FieldGroup type="text" onChange={e => this.setState({ exportTo: e.target.value })} value={this.state.exportTo } label='Export to'/>
			: null;

		return <Modal show={this.props.show} onHide={() => {}} bsSize="large">
			<Modal.Header closeButton>
				<Modal.Title>Create {tableType}</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<form>
					<FieldGroup type="text" onChange={e => this.setState({ name: e.target.value })} value={this.state.name } label={tableType + ' Name'}/>
				</form>
				<Table condensed hover>
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Length</th>
							<th>Nullable</th>
							<th>Partition Key</th>
              
							{
								!this.props.stream 
									? <th>Primary Key</th> 
									: null
							}
						</tr>
					</thead>
					<tbody>
						{columns}
					</tbody>
				</Table>
				{addColumn}
				{exportTo}
			</Modal.Body>
			<Modal.Footer>
				{ this.state.error ? <span className="text-danger pull-left">{this.state.error}</span> : ''}
				<ButtonGroup>
					<Button bsStyle="success" onClick={() => this.save()}>Save</Button>
					<Button bsStyle="danger" onClick={this.props.close}>Close</Button>
				</ButtonGroup>
			</Modal.Footer>
		</Modal>;
	}
}