import React from 'react';
import { connect } from 'react-redux';
import { Col, Row } from 'react-bootstrap';

import * as actions from '../../Actions.js';
import { executeQuery } from '../../api/query.js';

import Result from './Result.js';
import ResultError from './ResultError.js';
import Describe from './Describe.js';
import Analysis from './Analysis.js';
import Explain from './Explain';
import TableInfo from './TableInfo';
import ProcedureInfo from './ProcedureInfo';

class Results extends React.Component {
	render() {
		const { results, updateResult, addTab, changeTab, showVars, addVar, serverConfig, schema } = this.props;

		const handlers = {
			more( queryConfig ){
				queryConfig.offset += queryConfig.limit;
				executeQuery(queryConfig, serverConfig, schema).then( result => {
					if ( result.error ){
						console.log(result.error);
						return;
					}
					
					const { queryConfig } = result;
					updateResult({ queryConfig, result: result.results[0]});
				});
			},

			all( queryConfig ){
				queryConfig.offset += queryConfig.limit;
				queryConfig.limit = undefined;

				executeQuery(queryConfig, serverConfig, schema).then( result => {
					if ( result.error ){
						console.log(result.error);
						return;
					}

					const { queryConfig } = result;
					updateResult({ queryConfig, result: result.results[0]});
				});
			},

			addTab,
			changeTab,
			addVar,
			showVars
		};

		const retry = () => console.log('retry');

		const sortF = (a,b) => (a.queryConfig.id - b.queryConfig.id);
		const resultPanels = results.sort(sortF).map( (result, i) => {

			if ( result.analysis ) return <Analysis key={i} analysis={result.analysis} expanded={i === 0}/>;
			else if ( result.describe ) return <Describe key={i} table={result.table} name={result.queryConfig.table} expanded={i === 0}/>;
			else if ( result.explain ) return <Explain key={i} queries={result.queries} name={result.queryConfig.object} expanded={i === 0}/>;
			else if ( result.tableInfo ) return <TableInfo key={i} tableInfo={result.tableInfo}/>;
			else if ( result.procedureInfo ) return <ProcedureInfo key={i} procedureInfo={result.procedureInfo}/>;
			

			if ( result.error || !result.result ) return <ResultError {...result} key={i} retry={retry} expanded={i === 0}/>; 

			return <Result {...result} key={i} {...handlers} config={serverConfig} expanded={i === 0}/>;
		});

		return <Row className="section">
			<Col xs={12}>
				{resultPanels}
			</Col>
		</Row>;
	}
}

const mapStateToProps = ({ results, config, schema }) => ({ results, serverConfig: config, schema });
const mapDispatchToProps = dispatch => ({
	updateResult: result => dispatch(actions.updateResult(result)),
	addTab: tab => dispatch(actions.addTab(tab)),
	changeTab: id => dispatch(actions.changeTab(id)),
	addVar: variable => dispatch(actions.addVariable(variable)),
	showVars: () => dispatch(actions.toggleShowVars)
});

export default connect(mapStateToProps, mapDispatchToProps)(Results);
