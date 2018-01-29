import React, { Component } from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import reducer from './reducer'
import { Navbar, Row, Col } from 'react-bootstrap'
import logo from './logo.svg'

import Tools from './components/tools/Tools.js'
import Editor from './components/editor/Editor.js'
import Results from './components/results/Results.js'
import Navigator from './components/navigator/Navigator.js'
import Dialogs from './components/dialogs/Dialogs.js'
import Vars from './components/Vars.js'

import * as api from './api/api.js'

let project = api.getActiveProject()
let config = api.getConfig()
let list = api.getVars()

let store = createStore(reducer, { project, config, vars: { show: false, list } })

if ( project === undefined ){
  project = store.getState().project

  console.log("New Project", project)

  api.setProject(project)
}

class App extends Component {
  render() {
    return (
      <Provider store={store} >
        <div className="App">
          <Vars>
            <Row>
              <Col xs={12}>
              <Navbar>
                  <Navbar.Header>
                      <Navbar.Brand>
                          <span>vsqle2</span>
                          <a href="#index">
                              <img src={logo} className="App-logo" alt="logo" />
                          </a>
                      </Navbar.Brand>
                  </Navbar.Header>
              </Navbar>
              </Col>
            </Row>
            <Row >
              <Col xsHidden sm={3} md={3} lg={3}>
                <Navigator />
              </Col>
              <Col xs={12} sm={9} md={9} lg={9}>
                <Tools />
                <Editor />
                <Results />
              </Col>
            </Row>
            <Dialogs />
          </Vars>
        </div>
      </Provider>
    )
  }
}

export default App;
