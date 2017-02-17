var _ = require('lodash');
const utils = require('../../custom_utils.js');

let steamReducer = function(state = {}, action) {
  switch (action.type) {
	case 'STEAM_INVENTORY_LOAD':
		return _.merge(state, { [action.steam_user_id]: { inventory: action.inventory } } );
	case 'CHANGE_BACKPACK': {
		const item_key = utils.getKeyOfItem(action.item);
		const user = state[action.user_id];
		
		return Object.assign({}, state, { 
			[action.user_id]: Object.assign({}, state[action.user_id], { 
				stash: utils[action.from_stash ? 'removeItemFromBackpack' : 'addItemToBackpack'](user.stash, action.item), 
				inventory: utils[!action.from_stash ? 'removeItemFromBackpack' : 'addItemToBackpack'](user.inventory, action.item)
			})
		});
	}
  }
  return state;
}

export default steamReducer
