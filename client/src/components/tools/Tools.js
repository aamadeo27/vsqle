import React from 'react';
import { connect } from 'react-redux';
import { 
	Col, Row, 
	ButtonToolbar, ButtonGroup, Button, Glyphicon
} from 'react-bootstrap';

import { getFileFromProject } from '../../api/Project.js';
import { readFile } from '../../api/File.js';
import * as api from '../../api/api.js';
import * as actions from '../../Actions.js';
import * as query from '../../api/query.js';

import Download from '../common/Download.js';
import * as schema from '../../api/schema.js';

class Tools extends React.Component {
	constructor(props){
		super(props);

		this.state = { download: false, queryResult: '', downloadQR: false };
	}

	loadSchema(){
		const { updateSchema, addResult } = this.props;
		const handleError = err => {
			console.error(err);
			addResult( { error: err.toString(), queryConfig: { query: 'Load Schema' } });
		};

		schema.load( this.props.config ).then( response => {
			if (! response ){
				handleError({ error : 'No response from back end' });
			}
      
			updateSchema(response);
		}).catch( handleError );
	}

	executeBatch(){
		const { 
			tabs, 
			addResult, clearResults,
			variables, 
			schema, 
			logout,
			updateLogoSpeed } = this.props;
		const activeTab = tabs[this.props.activeTab];
	
		if ( this.props.queue.length === 0 ){
			clearResults();
			updateLogoSpeed(0.35);
			query.executeBatch(activeTab.editor, variables, schema)
				.then( response => {
					query.handleResponse(response, logout, addResult);
					updateLogoSpeed(60);
				});
		}
	}

	execute(asyncExec){
		const { 
			tabs, 
			addResult, clearResults, updateQueue,
			variables, 
			schema, 
			logout,
			updateLogoSpeed
		} = this.props;
		const activeTab = tabs[this.props.activeTab];

		if (asyncExec){
			clearResults();
			updateLogoSpeed(0.35);

			const promises = query.execute(activeTab.editor, variables, schema);
			let resolved = 0;
			promises.forEach( promise => {
				promise.then( response => {
					query.handleResponse(response, logout, addResult);
					resolved++;

					if ( resolved === promises.length ) updateLogoSpeed(60);
				});
			});

			return;
		}
		
		if ( this.props.queue.length === 0 ){
			updateLogoSpeed(0.35);
			clearResults();
			const queue = query.execute(activeTab.editor, variables, schema, false);
			updateQueue(queue);
		} else {
			updateLogoSpeed(60);
			updateQueue([]);
		}
	}

	upload(e){
		const { addTab } = this.props;
		const target = {
			name: e.target.value.split('\\').pop(),
			file: e.target.files[0]
		};

		const load = content => {
			const file = api.newTab();
			file.content = content;
			file.filepath = '/' + target.name;
			file.name = target.name;

			addTab(file);
		};

		readFile(target, load, console.error );
	}

	loadClasses(e){
		const name = e.target.value.split('\\').join('/').split('/').pop();

		console.log('Load Classes ', name);
		const { addResult, clearResults, logout, updateLogoSpeed } = this.props;

		clearResults();
		updateLogoSpeed(0.35);

		api.loadClasses(e.target.files[0])
			.then( response => {
				if ( response.error ){
					if ( response.error === 'Not logged in' ) logout();

					return addResult({
						error: response.error,
						queryConfig: {
							id: 0,
							loadClasses: true,
							query: 'Load Classes ' + name,
						}
					});
				}

				addResult({
					queryConfig: {
						id: 0,
						loadClasses: true,
						query: 'Load Classes ' + name + ' exitoso'
					},
					result: response
				});

				updateLogoSpeed(60);
			})
			.catch ( error => {
				console.log({ error });

				addResult({
					error: error.toString(),
					queryConfig: {
						id: 0,
						loadClasses: true,
						query: 'Load Classes ' + name,
					}
				});
			});
	}

	download(){
		this.setState({ download: false });
		this.setState({ download: true });
	}

	save(){
		const { project, tabs, updateFile } = this.props;
		const activeTab = tabs[this.props.activeTab];

		if ( ! activeTab.newTab ){
			api.updateFile(project.name, activeTab, () => updateFile(activeTab));
		} else {
			this.props.changeDialog('NewFile');
		}
	}

	reload(){
		const { project, tabs, changeTabContent, activeTab } = this.props;
		const path = tabs[activeTab].filepath;
		const file = getFileFromProject( project, path );
		changeTabContent(file);
	}
  
	openExploreTab(){
		const { addTab } = this.props;

		const newTab = api.exploreTab();
		addTab(newTab);

		this.setState({ activeKey: newTab.id });
	}

	queryToFile(){
		const { 
			tabs, 
			variables, 
			schema, 
			logout,
			updateLogoSpeed
		} = this.props;
		const activeTab = tabs[this.props.activeTab];

		updateLogoSpeed(0.45);
		this.props.clearResults();
			
		const promises = query.execute(activeTab.editor, variables, schema);
		let resolved = 0;

		let queryResult = '';

		const addResult = r => {
			if ( r.error ){
				this.props.addResult(r);
				return;
			}

			queryResult += r.result.schema.map( c => c.name ).join(',') + '\n';
			const lines = r.result.data.map( r => r.join(','));
			queryResult += lines.join('\n') + '\n';
		};

		promises.forEach( promise => {
			promise.then( response => {
				query.handleResponse(response, logout, addResult);
				resolved++;

				if ( resolved === promises.length ) {

					console.log('Filesize: ' + queryResult.length + ' Bytes');
					console.debug('File:\n', queryResult);

					if ( queryResult.length > 0 ){
						this.setState({ downloadQR: false });
						this.setState({ queryResult, downloadQR: true });
					}
					
					updateLogoSpeed(60);
				}
			});
		});

		return;
	}

	render() {
		const { tabs, project, changeDialog, queue } = this.props;
		const activeTab = tabs[this.props.activeTab] || { filepath: '', content: '' };
		const { queryResult, downloadQR, download } = this.state;
		const tabName = activeTab.exploreTab ? 'Explore': activeTab.filepath.split('/').pop() + '.sql';
		
		const existsInProject = activeTab && getFileFromProject(project, activeTab.filepath);

		const reload = this.reload.bind(this);
		const loadSchema = this.loadSchema.bind(this);
		const openExploreTab = this.openExploreTab.bind(this);

		const openWikiPage = () => window.open('https://github.com/aamadeo27/vsqle/wiki/Guide','_blank');
		const executing = queue.length > 0;
		const syncExecGlyph = executing ? 'remove-circle' : 'play-circle';

		const resultName = 'result.' + new Date().getTime() + '.csv'; 
		
		return (
			<div className="Tools">
				<Row><Col xsOffset={0} xs={12}>
					<ButtonToolbar>
						<ButtonGroup bsSize="small">
							<Button title="configuration" bsStyle="warning" onClick={() => changeDialog('Config')} disabled={executing}>
								<Glyphicon glyph="cog"/>
							</Button>
							<Button title="reload schema" bsStyle="warning" onClick={loadSchema} disabled={executing}>
								<Glyphicon glyph="refresh"/>
							</Button>
							<Button title="Open Explore Tab" bsStyle="warning" onClick={openExploreTab} >
								<Glyphicon glyph="search"/>
							</Button>
						</ButtonGroup>
						
						<ButtonGroup bsSize="small">
							<Button title="save" bsStyle="warning" onClick={this.save.bind(this)}>
								<Glyphicon glyph="floppy-disk"/>
							</Button>
							<Button title="reload" bsStyle="warning" onClick={reload} disabled={!existsInProject}>
								<Glyphicon glyph="repeat"/>
							</Button>
							<Button title="download" bsStyle="warning" onClick={this.download.bind(this)}>
								<Glyphicon glyph="save-file"/>
							</Button>
							<Button title="upload" bsStyle="warning" disabled={executing}>
								<div className='fileUpload'>
									<Glyphicon glyph="open-file"/>
									<input type='file' id='file' onChange={this.upload.bind(this)}/>
								</div>
							</Button>
						</ButtonGroup>

						<ButtonGroup bsSize="small">
							<Button title="async execute" bsStyle="success" onClick={() => this.execute(true)} disabled={executing}>
								<Glyphicon glyph="play"/>
							</Button>
							<Button title="sync execute" bsStyle="success" onClick={() => this.execute(false)} >
								<Glyphicon glyph={syncExecGlyph}/>
							</Button>
							<Button title="batch execute" bsStyle="success" onClick={() => this.executeBatch()} >
								<Glyphicon glyph="list-alt"/>
							</Button>
							<Button title="Query to File" bsStyle="success" onClick={() => this.queryToFile()} >
								<Glyphicon glyph="arrow-down"/>
							</Button>
						</ButtonGroup>

						<ButtonGroup bsSize="small">
							<Button bsStyle="info" onClick={this.props.toggleShowVars} disabled={executing}>
								<Glyphicon glyph="usd"/>
							</Button>
							<Button bsStyle="info" onClick={this.props.loadClasses} disabled={executing}>
								<div className='fileUpload'>
									<Glyphicon glyph="export"/>
									<input type='file' id='jarfile' onChange={this.loadClasses.bind(this)} onClick={ e => e.target.value = null}/>
								</div>
							</Button>
							<Button title="help" bsStyle="info" onClick={openWikiPage}>
								<Glyphicon glyph="question-sign"/>
							</Button>
						</ButtonGroup>
						
					</ButtonToolbar>
				</Col>
				<Download content={activeTab.content} name={tabName} download={download}/>
				<Download content={queryResult} name={resultName} download={downloadQR}/>
				</Row>
			</div>
		);
	}
}

const mapStateToProps = ({ tabs, activeTab, project, config, vars, schema, queue }) => ({
	activeTab: tabs.findIndex( t => t.id === activeTab ),
	tabs,
	project,
	config,
	variables: vars.list,
	schema,
	queue
});

const mapDispatchToProps = dispatch => ({
	addTab: tab => dispatch(actions.addTab(tab)),

	updateFile: file => dispatch(actions.updateFile(file)),
	changeTabContent: file => dispatch(actions.changeTabContent(file.id, file.content)),

	addResult: result => dispatch(actions.addResult(result)),
	clearResults: () => dispatch(actions.clearResults),
	logout: () => dispatch(actions.updateConnection({})),

	updateQueue: queue => dispatch(actions.updateQueue(queue)),

	changeDialog: dialog => dispatch(actions.changeDialog(dialog)),
	toggleShowVars: () => dispatch(actions.toggleShowVars),

	updateSchema: (tables, procedures, columns, pks) => dispatch(actions.updateSchema(tables, procedures, columns, pks)),

	updateLogoSpeed: speed => dispatch(actions.updateLogoSpeed(speed))
});

export default connect(mapStateToProps, mapDispatchToProps)(Tools);