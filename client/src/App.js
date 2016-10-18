import React, { Component } from 'react'
import logo from './logo.svg'
import './App.css'
import 

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h3>VoltDB SQL Editor 2</h3>
        </div>
        <p className="App-intro">
          Editor
        </p>
      </div>
    );
  }
}

export default App;
