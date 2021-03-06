import React, { Component } from 'react'
import { Collapse, Table, Grid, Row, Col, Glyphicon, Nav, NavItem } from 'react-bootstrap'

/*
const pad = x => x.length === 1 ? "0" + x : x
const getUTCString = date => {
	let value = date.getUTCFullYear() + "-"
	value += pad("" + (date.getUTCMonth()+1)) + "-"
	value += pad("" + date.getUTCDate()) + " "
	value += pad("" + date.getUTCHours()) + ":"
	value += pad("" + date.getUTCMinutes()) + ":"
	value += pad("" + date.getUTCSeconds())

	return value
}
*/

const toMillis = t => ((Math.round( t / 1000 ) / 1000 ) + "ms")

const StatementStatistics = ({ data }) => ({
	render(){
		console.log("Statements", data)
		const view = this.props.data.map( (statistics, key) => 
			<Summary key={key} summary={statistics.summary} name={`${statistics.summary.name}`}/>
		)

		return <div>
			{view}
		</div>
	}
})

const GroupStatistics = ({ data, type }) => ({
	render(){
		const view = this.props.data.map( (statistics, key) => 
			<Summary key={key} summary={statistics.summary} name={`${this.props.type} ${key}`}/>
		)

		return <div>
			{view}
		</div>
	}
})

const Summary = ({ summary, name }) => ({
	render(){
		const time = {...this.props.summary.time}

		time.min = toMillis(time.min)
		time.avg = toMillis(time.avg)
		time.max = toMillis(time.max)

		return <Table className="analysis" striped>
			<tbody>
				<tr>
					<th colSpan={4}>{this.props.name} ({this.props.summary.sample})</th>
				</tr>
				<tr>
					<td>Min: {time.min}</td>
					<td>Average: {time.avg} <br/></td>
					<td>Max:{time.max}</td>
				</tr>
			</tbody>
		</Table>
	}
})

const StatisticsDetail = ({ data }) => ({
	render(){
		const detail = (row, key) => <tr key={key}>
			<td>{row.node}</td>
			<td>{row.partition}</td>
			<td>{row.statement}</td>
			<td>{row.sample}</td>
			<td>{toMillis(row.time.min)}</td>
			<td>{toMillis(row.time.avg)}</td>
			<td>{toMillis(row.time.max)}</td>
		</tr>

		const detailList = data.map( detail )

		return <Table className="analysis-detail" striped>
			<tbody>
				<tr>
					<th>Node</th>
					<th>Partition</th>
					<th>Statement</th>
					<th>Sample</th>
					<th>Min</th>
					<th>Avg</th>
					<th>Max</th>
				</tr>
				{detailList}
			</tbody>
		</Table>
	}
})

const views = {
	GENERAL: 1,
	PER_NODE: 2,
	PER_PARTITION: 3,
	PER_STATEMENT: 4,
	ALL: 5
}
const viewNames = ["","General","Node","Partition", "Statement", "All"]

export default class extends Component {
	constructor(props){
		super(props)
		this.state = { 
			expanded: props.expanded,
			view: 1,
			data: props.analysis.summary
		}
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	handleSelect(view){
		const { analysis } = this.props
		let data = null

		switch(view){
			case views.GENERAL:
				data = analysis.summary
				break
			case views.PER_NODE:
				data = analysis.node
				break
			case views.PER_PARTITION:
				data = analysis.partition
				break
			case views.PER_STATEMENT:
				data = analysis.statement
				break
			case views.ALL:
				data = analysis.all
				break
			default:
				data = undefined
		}

		this.setState({ view, data })
	}

	render(){
		const { analysis } = this.props
		const { expanded, view, data } = this.state

		const glyph = expanded ? "collapse-up" : "collapse-down"
		let title = <div className="text-left panel-success result-bar">
		<div className="result-title" onClick={() => this.onClick()}>
			<Glyphicon glyph={glyph} />
			<span>{analysis.procedure}</span>
		</div>
		</div>

		let viewData = <br />
		if ( view === views.GENERAL ){
			viewData = <Summary summary={data} name="General" />
		} else if ( view === views.PER_STATEMENT ){
			viewData = <StatementStatistics data={data} />
		} else if ( view !== views.ALL) {
			viewData = <GroupStatistics data={data} type={viewNames[view]} />
		} else {
			viewData = <StatisticsDetail data={data} />
		}

		return <div>
			{title}
			<Collapse in={expanded} className="result-collapse">
				<Grid fluid={true}>
					<Row>
						<Col xs={2}>
							<Nav bsStyle="pills" stacked activeKey={view} onSelect={this.handleSelect.bind(this)}>
								<NavItem eventKey={views.GENERAL}>
									General
								</NavItem>
								<NavItem eventKey={views.PER_NODE}>
									Per Node
								</NavItem>
								<NavItem eventKey={views.PER_PARTITION}>
									Per Partition
								</NavItem>
								<NavItem eventKey={views.PER_STATEMENT}>
									Per Statement
								</NavItem>
								<NavItem eventKey={views.ALL}>
									Detail
								</NavItem>
							</Nav>
						</Col>
						<Col xs={10}>
							 {viewData}
						</Col>
					</Row>
				</Grid>
			</Collapse>
			<hr />
		</div> 
	}
}