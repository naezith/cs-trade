import { combineReducers } from 'redux'
import steamReducer from './steamReducer'

let passiveReducer = function(state = {}, action) { return state; }

const rootReducer = combineReducers({
  user_id: passiveReducer,
  steam: steamReducer
})

export default rootReducer
