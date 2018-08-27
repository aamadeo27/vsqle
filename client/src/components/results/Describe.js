import React from 'react'
import { Table, Collapse, Glyphicon } from 'react-bootstrap'

class Describe extends React.Component {
	constructor(props){
		super(props)
		this.state = { expanded: this.props.expanded }
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	render(){
		const { table: {columns, pk}, name } = this.props
		const { expanded } = this.state
		const style = { textAlign: 'left' }

		const description = columns.map( column => <tr key={column.name}>
			<td>{column.name}</td>
			<td>{column.type}</td>
			<td>{column.size}</td>
			<td>{column.nullable ? "YES" : "NO" }</td>
			<td>{column.partitionKey ? "YES" : ""}</td>
		</tr>)

		const glyph = expanded ? "collapse-up" : "collapse-down"
		let title = <div className="text-left panel-success result-bar">
			<div className="result-title" onClick={() => this.onClick()}>
				<Glyphicon glyph={glyph} />
				<span>Describe {name}</span>
			</div>
		</div>

		let primaryKey = ""
		if ( pk && pk.length > 0) {
			primaryKey = pk.join(", ").substring(1)
			primaryKey = <span>PrimaryKey : {primaryKey}</span>
		}

		return <div>
			{title}
			<Collapse in={expanded} className="result-collapse">
				<div>
					<Table style={style} striped hover bordered responsive>
						<thead>
							<tr>
								<td>Column</td>
								<td>DataType</td>
								<td>Size</td>
								<td>Nullable</td>
								<td>PartitionKey</td>
							</tr>
						</thead>
						<tbody>
							{description}
						</tbody>
					</Table>
					{primaryKey}
				</div>
			</Collapse>

			<hr />
		</div> 
	}
}

export default Describe