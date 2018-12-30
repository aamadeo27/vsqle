import React from 'react'
import { Table, Collapse, Glyphicon } from 'react-bootstrap'

class Explain extends React.Component {
	constructor(props){
		super(props)
		this.state = { expanded: this.props.expanded }
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	render(){
		const { queries, name } = this.props
		const { expanded } = this.state
		const style = { textAlign: 'left' }

		const query = queries.map( column => <tr key={column.name}>
			<td>{column.name}</td>
			<td>{column.sql}</td>
			<td>{column.executionPlan}</td>
		</tr>)

		const glyph = expanded ? "collapse-up" : "collapse-down"
		let title = <div className="text-left panel-success result-bar">
			<div className="result-title" onClick={() => this.onClick()}>
				<Glyphicon glyph={glyph} />
				<span>Explain {name}</span>
			</div>
		</div>

		return <div>
			{title}
			<Collapse in={expanded} className="result-collapse">
				<div>
					<Table style={style} striped hover bordered responsive>
						<thead>
							<tr>
								<td>Name</td>
								<td>SQL</td>
								<td>Execution Plan</td>
							</tr>
						</thead>
						<tbody>
							{query}
						</tbody>
					</Table>
				</div>
			</Collapse>

			<hr />
		</div> 
	}
}

export default Explain