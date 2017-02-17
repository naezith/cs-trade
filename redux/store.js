import { applyMiddleware, compose, createStore } from 'redux'
import rootReducer from './reducers'
import logger from 'redux-logger'
import thunk from 'redux-thunk'

let finalCreateStore = compose(
  applyMiddleware(thunk, logger())
)(createStore)


export default function configureStore(initialState) {
  return finalCreateStore(rootReducer, initialState)
}
