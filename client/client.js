import React from 'react'
import { render } from 'react-dom'
import App from '../components/App'
import configureStore from '../redux/store'
import { Provider } from 'react-redux'
import { Router, Route, IndexRoute, hashHistory } from 'react-router'

var initialState = json_state ? json_state : {}

let store = configureStore(initialState)

render(
  <Provider store={store}>
    <Router history= {hashHistory}> 
		<Route path="/" component={App}></Route>
	</Router>
  </Provider>,
  document.getElementById('app')
)
