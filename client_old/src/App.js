import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducer from './reducer';
import { Row, Col } from 'react-bootstrap';

import Tools from './components/tools/Tools';
import Editor from './components/editor/Editor';
import Results from './components/results/Results';
import Navigator from './components/navigator/Navigator';
import Dialogs from './components/dialogs/Dialogs';
import Vars from './components/Vars';
import Navbar from './components/Navbar';

import * as api from './api/api.js';

let project = api.getActiveProject();
let config = api.getConfig();
let list = api.getVars();

let store = createStore(reducer, { project, config, vars: { show: false, list } });

if ( project === undefined ){
	project = store.getState().project;

	console.log('New Project', project);

	api.setProject(project);
}

class App extends Component {
	render() {
		return (
			<Provider store={store} >
				<Vars>
					<div className="App container-fluid">
						<Row>
							<Col xs={12}>
								<Navbar />
							</Col>
						</Row>
						<Row >
							<Col xsHidden sm={2} md={2} lg={2} >
								<Navigator />
							</Col>
							<Col xs={12} sm={10} md={10} lg={10}>
								<Tools />
								<Editor />
								<Results />
							</Col>
						</Row>
						<Dialogs />
					</div>
					<textarea id="result-clipboard" style={{ position: 'absolute', left: -1000 }}/>
				</Vars>
			</Provider>
		);
	}
}

export default App;
