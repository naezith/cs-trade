var fetch = require('isomorphic-fetch');
var utils = require('../custom_utils.js');

let actions = {
  steam_load_inventory: function(steam_user_id, inventory){
	  return {
		  type: 'STEAM_INVENTORY_LOAD',
		  inventory,
		  steam_user_id
	  };
  },
  change_backpack: function(is_stash, user_id, item){
	  return {
		  type: 'CHANGE_BACKPACK',
		  from_stash: is_stash,
		  item,
		  user_id
	  };
  },
  steam_fetch_inventory: function(steam_user_id){
	  return (dispatch) => {
		  return fetch('http://localhost:3000/user/inventory?user_id=' + steam_user_id, { method: 'POST', credentials: 'include' })
			.then(function(res) {
				return res.json();
			}).then(function(json) {
				return dispatch(actions.steam_load_inventory(steam_user_id, json));
			});
	  };
  }
  
}

export default actions
