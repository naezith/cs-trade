import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import actions from '../redux/actions'
import SteamLogin from './SteamLogin'
import Backpack from './Backpack'
import utils from '../custom_utils'
import common, { bot_id } from '../common'
import Range from 'rc-slider/lib/Range'
import ReactTooltip from 'react-tooltip'
		
var _ = require('lodash');
var item_types = ['All', 'Key', 'Knife', 'Rifle', 'Sniper Rifle', 'Pistol', 'SMG', 'Shotgun', 'Machinegun', 'Collectible', 'Sticker', 'Music Kit', 'Tool'];
var item_exteriors = ['All', 'Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
class App extends Component {
	constructor() {
		super();
		this.state = { 
			trade_url : '',
			last_url : '',
			editing_url : false,
			
			user : {}, 
			trade_result: { status: -2 }
		};
	}
	
	getNewUser() {
		return {
			loadingInventory : true,
			filter_name : '',
			filter_type : item_types[0],
			filter_exterior : item_exteriors[0],
			filter_nametag : false,
			filter_stattrak : false,
			filter_sort_price : true,
			price_range: [0, 2000],
			max_price: 5000
		};
	} 
	
	handleRefresh(user_id){
		var obj = this.state.user;
		if(!obj[user_id]) obj[user_id] = this.getNewUser();
		obj[user_id].loadingInventory = user_id === bot_id ? true : !utils.isEmpty(this.props.steam[user_id]);
		
		this.setState({ user : obj });
		
		this.props.actions.steam_fetch_inventory(user_id).then( () => {
			this.props.steam[user_id].stash = { assets : [], success : 1, worth : 0 };
			obj = this.state.user;
			if(!obj[user_id]) obj[user_id] = this.getNewUser();
			obj[user_id].loadingInventory = false;
			
		
			// Set max price in the search range
			var assets = this.props.steam[user_id].inventory.assets;
			if(assets) {
				var max = 0;
				var rate_type = user_id === bot_id ? 'bot' : 'user';
				for(var i = 0; i < assets.length; ++i){
					var price = assets[i].price_info.lowest_price;
					
					// Set rate
					assets[i].price_info.lowest_price = parseFloat(price * common.getPriceRate(assets[i].market_hash_name, assets[i].type, rate_type)).toFixed(2);
					if(assets[i].price_info.lowest_price <= 0) assets[i].price_info.valid = false;
					
					if(price > max) max = price;
				}
				max = Math.ceil(max);
				
				obj[user_id].max_price = max;
				if(obj[user_id].price_range[1] > max) obj[user_id].price_range[1] = max;
			}
			this.setState({ user : obj });
		});
	}
	
	resetFilters(user_id){
		var obj = this.state.user;
		if(!obj[user_id]) {
			obj[user_id] = this.getNewUser();
			
			this.setState({ user : obj });
		}
	}
	
	componentDidUpdate() {
		ReactTooltip.hide();
		ReactTooltip.rebuild();
	}
	
	componentWillMount() {
		this.resetFilters[bot_id];
		if(!utils.isEmpty(this.props.steam[this.props.user_id])) this.resetFilters[this.props.user_id];
	}
	componentDidMount() {
		this.handleRefresh(bot_id);
		
		// Get player inventory
		if(!utils.isEmpty(this.props.steam[this.props.user_id])) {
			// Fill the trade URL if empty
			var steam_user = this.props.steam[this.props.user_id];
			
			if(utils.isEmpty(steam_user.trade_url)) {
				var that = this;
				fetch("http://localhost:3000/user/getTradeURL",{
					method: "get",
					credentials: 'include'
				}) .then(function(res){ return res.json(); })
				   .then(function(data){ 
					this.setState( { 
						trade_url : data.trade_url, 
						last_url : data.trade_url,
						editing_url : data.trade_url === ''
					} );
				}.bind(this));
			}
			
			// Fetch the inventory
			this.handleRefresh(this.props.user_id);
		}
	}
	handleChange(event) {
		this.setState( { trade_url: event.target.value} );
	}
	
	handleClick(is_stash, user_id, item){
		this.setState( { trade_result: { status: -2 } } );
		this.props.actions.change_backpack(is_stash, user_id, item);
	}

	handleTrade(){
		var trade_info = {
			user_items : this.props.steam[this.props.user_id].stash.assets.map( function(a) { return a.assetid; } ),
			bot_items : this.props.steam[bot_id].stash.assets.map( function(a) { return a.assetid; } )
		};
		
		var that = this;
		that.setState( { trade_result: { status: -1 } } );
		fetch("http://localhost:3000/user/sendOffer",
		{
			method: "post",
			credentials: "include",
			body: JSON.stringify(trade_info),
			headers: {
				"Content-Type": "application/json"
			},
		})
		.then(function(res){ return res.json(); })
		.then(function(data){ 
			if(data.msg && data.msg.eresult) data.msg = "Couldn't send the offer, probably someone already took the item."; 
			that.setState( { trade_result: data } );
		});
	}

	handleUpdateURL(){
		// Save
		if(this.state.editing_url) {
			if(this.state.last_url !== this.state.trade_url) {
				this.setState( { last_url : this.state.trade_url, editing_url: false } );
				fetch("http://localhost:3000/user/setTradeURL",
				{
					method: "post",
					credentials: "include",
					body: JSON.stringify({ trade_url : this.state.trade_url }),
					headers: {
						"Content-Type": "application/json"
					},
				})
				.then(function(res){ return res.json(); })
				.then(function(data){ });
			}
			else this.setState( { editing_url: false } );
		}
		// Type
		else this.setState( { editing_url: true } );
	}
	
	filterName(st, it){ 
		return it.market_hash_name.toUpperCase().includes(st.filter_name.toUpperCase());
	}
	filterStatTrak(st, it){ 
		return !st.filter_stattrak || it.type.includes('StatTrak');
	}
	filterNameTag(st, it){ 
		return !st.filter_nametag || (it.fraudwarnings && it.fraudwarnings.length > 0);
	}
	filterPrice(st, it){ 
		return it.price_info.lowest_price > 0.0 && 
				it.price_info.lowest_price >= st.price_range[0] &&
				it.price_info.lowest_price <= st.price_range[1];
	}
	filterType(st, it){ 
		if(st.filter_type === 'All') return true;
		var tag_idx = it.tags.findIndex((tag) => tag.category === 'Type');
		if(tag_idx === -1 || it.tags[tag_idx].localized_tag_name === st.filter_type) return true;
		return false;
	}
	filterExterior(st, it){ 
		if(st.filter_exterior === 'All') return true;
		var tag_idx = it.tags.findIndex((tag) => tag.category === 'Exterior');
		if(tag_idx !== -1 && it.tags[tag_idx].localized_tag_name === st.filter_exterior) return true;
		return false;
	}
	
	filterItems(user_id, inv) {
		if(!inv || !inv.assets) return inv;
		var st = this.state.user[user_id];
		if(!st) return inv;
		
		var inventory = Object.assign({}, inv);
		
		// Filter
		inventory.assets = inventory.assets.filter((it) => 
			this.filterPrice(st, it) && this.filterName(st, it) && this.filterType(st, it) && 
			this.filterStatTrak(st, it) && this.filterExterior(st, it) && this.filterNameTag(st, it)
		);
		
		utils.backpackUpdated(inventory, st.filter_sort_price ? -1 : 1);
		
		return inventory;
	}
	
	handleFilterChange(user_id, event) {
		const target = event.target;
		const value = target.type === 'checkbox' ? target.checked : target.value;
		const name = 'filter_' + target.name;

		var obj = this.state.user;
		obj[user_id][name] = value;
		this.setState({ user : obj });
	}
	handleRangeChange(user_id, value) {
		var obj = this.state.user;
		obj[user_id].price_range = value;
		this.setState({ user : obj });
	}
	
	render() {
		// User div
		let user_div;
		let steam_user = this.props.steam[this.props.user_id];
		
		if(utils.isEmpty(steam_user)) {
			user_div = (
				<div>
					<h2>Welcome! Please log in.</h2>
					<SteamLogin actions={this.props.actions}/>
				</div>
			)
		}
		else {
			user_div = (
				<div>
					<h2>Hello, {steam_user.displayName}. - <a href='logout'>Logout</a></h2>
					<p><img src={steam_user.photos[2].value} alt='Your Avatar Image' /></p>
					<p>Trade Offer URL (<a target="_blank" href='https://steamcommunity.com/id/me/tradeoffers/privacy'>Help</a>): <br/>
						<input type="text" value={this.state.trade_url} size="70" onChange={this.handleChange.bind(this)} disabled={!this.state.editing_url}/>
						<button onClick={this.handleUpdateURL.bind(this)}>{this.state.editing_url ? 'Save' : 'Edit'}</button>
					</p> 
				</div>
			)
		}
		
		
		// Backpacks
		var stash_div = [undefined, undefined];
		var inventory_div = [undefined, undefined];
		
		var ids = [this.props.user_id, bot_id];
		for(var i = 0; i < 2; ++i) {
			var id = ids[i];
			var user = this.props.steam[id];
			
			if((i !== 0 && !this.state.user[id]) || 
				(this.state.user[id] && this.state.user[id].loadingInventory)) inventory_div[i] = ( <p>Loading the inventory...</p> ); 
			else if(utils.isEmpty(user)) {
				inventory_div[i] = i == 0 ? ( <p>Please sign in via Steam.</p> ) : ( <p>Failed to fetch the bot's inventory.</p> ); 
			}
			else {
				utils.backpackUpdated(user.stash);
				
				stash_div[i] = (<div>{!utils.isEmpty(user.stash) && <Backpack handleClick={this.handleClick.bind(this, 1, id)} user_id={id} inventory={user.stash}/>}</div>);
				inventory_div[i] = (<div>{!utils.isEmpty(user.inventory) && <Backpack handleClick={this.handleClick.bind(this, 0, id)} 
					user_id={id} inventory={this.filterItems(id, user.inventory)}
				/>}</div>);
			}
		}
		
		// Price check
		var tradable = false;
		let steam_bot = this.props.steam[bot_id];
		if(!utils.isEmpty(steam_user) &&!utils.isEmpty(steam_bot) &&
			!utils.isEmpty(steam_user.stash) && !utils.isEmpty(steam_bot.stash) && 
			steam_user.stash.worth && steam_bot.stash.worth &&
			steam_user.stash.assets.length > 0 && parseFloat(steam_user.stash.worth) >= parseFloat(steam_bot.stash.worth)) {
			
			tradable = true;
		}
		
		// Render
		var trade_r = this.state.trade_result;
		return (
			<div style={{width: '850px', margin: '0 auto'}}>
				{user_div} 
				<br/><hr/><br/><center>
					<button onClick={this.handleTrade.bind(this)} disabled={!tradable} >TRADE</button>
					<p>{trade_r.status === -1 ? (<font color='#008000'>Preparing the offer, please wait...</font>) :
						trade_r.status === 0 ? (<font color='#008000'>Offer sent, <a target="_blank" href={'https://steamcommunity.com/tradeoffer/' + trade_r.offer_id}>here is the trade link!</a></font>) : 
					    trade_r.status === 1 ? (<font color='#DC143C'>{trade_r.msg}</font>) :
						''}</p>
				</center><br/><hr/><br/>
				{
				  ids.map((id) => {
					  var is_bot = id === bot_id;
					  var idx = is_bot ? 1 : 0;
					  var st = this.state.user[id];
					  var user_area = undefined;
					  
					  if(st) {
						  user_area = (
							  <div>
								<h2>Stash</h2>
								{stash_div[idx]}
								<h3>Filter Inventory</h3>
								<button onClick={this.handleRefresh.bind(this, id)} disabled={!st || st.loadingInventory}>Refresh</button>
								<p>Search: <input type="text" placeholder="Enter the item name" value={st.filter_name} size="30" name='name' onChange={this.handleFilterChange.bind(this, id)}/></p>
								<p>Type: <select value={st.filter_type} name='type' onChange={this.handleFilterChange.bind(this, id)}>
											{item_types.map((type) => { return <option key={type} value={type}>{type}</option> })}</select>
								&nbsp;&nbsp;&nbsp;
								   Exterior: <select value={st.filter_exterior} name='exterior' onChange={this.handleFilterChange.bind(this, id)}>
											{item_exteriors.map((type) => { return <option key={type} value={type}>{type}</option> })}</select></p>
								<p>StatTrak™: <input type="checkbox" checked={st.filter_stattrak} name='stattrak' onChange={this.handleFilterChange.bind(this, id)}/>
								&nbsp;&nbsp;&nbsp;
								   Name Tag: <input type="checkbox" checked={st.filter_nametag} name='nametag' onChange={this.handleFilterChange.bind(this, id)}/></p>
									<center>${st.price_range[0]} - ${st.price_range[1]}</center> 
									<Range min={0} max={st.max_price} allowCross={false} value={st.price_range} onChange={this.handleRangeChange.bind(this, id)} />
								<p>Highest first: <input type="checkbox" checked={st.filter_sort_price} name='sort_price' onChange={this.handleFilterChange.bind(this, id)}/></p>
							  </div>
						  );
					  }
					return ( 
						<div key={id} style={{width: '400px', float: is_bot ? 'right' : 'left'}}>
							<center><h1>{id == bot_id ? 'BOT' : 'YOU'}</h1></center>
							{user_area}
							<h2>Inventory</h2>
							{inventory_div[idx]}
						</div>
					)
				  })
				}
				
			  <ReactTooltip html={true} />
			</div>
		);
	  }

}

function mapStateToProps(state) {
  return state
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
