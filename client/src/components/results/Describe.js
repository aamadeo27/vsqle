import React from 'react';
import { Collapse, Glyphicon } from 'react-bootstrap';

class Describe extends React.Component {
	constructor(props){
		super(props)
		this.state = { expanded: this.props.expanded }
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	render(){
		const { table: { columns, pks, type, name }} = this.props
		const { expanded } = this.state

    const nn = column => column.nullable ? '' : 'not null';
    const size = column => column.type === 'varchar' ? `(${column.size})` : '';
    const sep = i =>  i+1 < columns.length || pks.length > 0 ? ',' :'' 

    let partitionKey = columns.find( c => c.partitionKey );
    partitionKey = partitionKey ? partitionKey.name : null;

    const ddl = columns
      .map( (column, i) => 
        <p key={column.name}>&nbsp;&nbsp;&nbsp;{column.name} {column.type}{size(column)} {nn(column)}{sep(i)}</p>
      );

		const glyph = expanded ? "collapse-up" : "collapse-down"
		let title = <div className="text-left panel-success result-bar">
			<div className="result-title" onClick={() => this.onClick()}>
				<Glyphicon glyph={glyph} />
				<span>Describe {name}</span>
			</div>
		</div>

		return <div>
			{title}
			<Collapse in={expanded} className="result-collapse">
				<div className="ddl">
          <p>create {type} {name + " ("}</p>
          {ddl}
          {pks.length > 0 ? <p>&nbsp;&nbsp;&nbsp;primary key ({pks.join(",")})</p> : ''}
          <p>{");"}</p>
          <p>{ partitionKey ? 'partition table ' + name + ' on column ' + partitionKey  + ';' : ''}</p>
        </div>
			</Collapse>

			<hr />
		</div> 
	}
}

export default Describe