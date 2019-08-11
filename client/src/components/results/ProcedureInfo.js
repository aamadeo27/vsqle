import React, { Component } from 'react';
import { ListGroup, ListGroupItem, Grid, FormControl, Checkbox, Row, Col } from 'react-bootstrap';
import * as api from '../../api/api';

class Queries extends Component {
	constructor(props) {
		super(props);
	
		this.state = {
			queries: props.queries || [],
			filter: '',
			activeFilter: ''
		};
	}

	componentWillReceiveProps(nextProps) {
		this.setState({ indexes: nextProps.querie || [] });
	}

	render() {

		const activeFilter = this.state.activeFilter;
		const { caseSensitive } = this.state;

		const filter = ({ name, sql }) => {
			if ( caseSensitive ) return name.match(activeFilter) || sql.match(activeFilter);

			return name.toLowerCase().match(activeFilter.toLowerCase()) || sql.toLowerCase().match(activeFilter.toLowerCase());
		};

		const queries = this.state.queries
			.filter( filter )
			.map( query => <ListGroupItem listItem={true} key={query.name} header={query.name}>
				<b>SQL</b> : {query.sql}
				<br />
				<b>Plan</b> :{query.plan}
			</ListGroupItem>);

		const onKeyDown = e => {
			if ( e.keyCode === 13 ){
				this.setState({ activeFilter: this.state.filter });
			}
		};

		const onFilterChange = e => {
			this.setState({ filter: e.target.value });
		};

		const onCSChange = e => this.setState({ caseSensitive : e.target.checked });

		return <div>
			<Grid>
				<Row>
					<Col xs={1}>
						<h4>Filter</h4>
					</Col>
					<Col xs={5}>
						<FormControl placeholder='Regular Expresion' value={this.state.filter} onChange={onFilterChange} onKeyDown={onKeyDown}/>
					</Col>
					<Col xs={2}>
						<Checkbox checked={!!this.state.caseSensitive} onChange={onCSChange}>
							Case Sensitive
						</Checkbox>
					</Col>
				</Row>
				<Row><Col>&nbsp;</Col></Row>
			</Grid>
			
			<ListGroup style={{ textAlign: 'left' }}>
				{queries}
			</ListGroup>
		</div>;
	}
	
}

export default class ProcedureInfo extends Component {
	constructor(props){
		super(props);

		this.state = {
			activeKey: 1
		};
	}

	render(){
		const { procedureInfo } = this.props;

		let newVersion = true;
		if ( procedureInfo.data.length ){
			newVersion = procedureInfo.data[0].length === 3;
		}

		const queries = procedureInfo.data.map( (query, i) => ({
			name: newVersion ? query[0] : `sql${i}`,
			sql: newVersion ? query[1] : query[0],
			plan: newVersion ? query[2] : query[1]
		}));

		return <Queries queries={queries}/>; 
	}
}