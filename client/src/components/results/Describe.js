import React from 'react'
import { Table, Panel, Glyphicon } from 'react-bootstrap'

class Describe extends React.Component {
	constructor(props){
		super(props)
		this.state = { expanded: true }
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	render(){
		const { table: {columns, pk}, name } = this.props
		const { expanded } = this.state
		const style = { textAlign: 'left' }
		const glyph = expanded ? "expand" : "collapse-down"

		const description = columns.map( column => <tr key={column.name}>
			<td>{column.name}</td>
			<td>{column.type}</td>
			<td>{column.size}</td>
			<td>{column.nullable ? "YES" : "NO" }</td>
			<td>{column.partitionKey ? "YES" : ""}</td>
		</tr>)

		const title = <div className="text-left" style={style}  onClick={this.onClick.bind(this)} >
			<Glyphicon glyph={glyph} />
			{name}
		</div>

		let primaryKey = ""
		if ( pk && pk.length > 0) {
			primaryKey = pk.join(", ").substring(1)
			primaryKey = <span>PrimaryKey : {primaryKey}</span>
		}

		return <Panel expanded={expanded} bsStyle="success" onToggle={() =>{}}>
			<Panel.Heading>{title}</Panel.Heading>
			<Panel.Body>
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
			</Panel.Body>
		</Panel>
	}
}

export default Describe