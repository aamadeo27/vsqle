import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './css/bootstrap-cerulean.min.css'
import 'fetch-jsonp'

//import 'bootstrap/dist/css/bootstrap-theme.min.css'
import './App.css'

const rootEl = document.getElementById('root')

ReactDOM.render(
  <App />,
  rootEl
);

if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    ReactDOM.render(
      <NextApp />,
      rootEl
    );
  });
}