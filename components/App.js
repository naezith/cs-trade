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
import { Image, Navbar, Nav, NavItem, NavDropdown, MenuItem,
	Button, Checkbox, Form, FormGroup, ControlLabel, FormControl, Well, Grid, Row, Col } from 'react-bootstrap';

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
					assets[i].price_info.lowest_price = parseFloat(price * common.getPriceRate(this.props.steam[user_id].displayName, assets[i].market_hash_name, assets[i].type, rate_type)).toFixed(2);
					if(assets[i].price_info.lowest_price <= 0) assets[i].price_info.valid = false;
					
					if(price > max) max = price;
					
					// Find stickers
					var item = assets[i];
					var desc_imgs = '';
					if(item.descriptions) {
						item.descriptions.map((desc) => {
							if(desc.type === "html" && desc.value.indexOf('sticker_info') !== -1){
								var imgs = utils.getHTMLtags(desc.value, 'img');
								for(var i in imgs) desc_imgs += imgs[i];
							}
						});
						if(desc_imgs !== ''){
							item.stickers_html = desc_imgs;
							item.stickers_small_html = utils.replaceAll(desc_imgs, "img width=64 height=48", "img width=20 height=15");
						}
					}
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
		document.body.style.backgroundColor = "black";
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
		var well_bg_color = 'rgba(255, 255, 255, .65)';
		var well_bg_color_thick = 'rgba(255, 255, 255, .85)';
		
		// User div
		let steam_user = this.props.steam[this.props.user_id];
		
		// Backpacks
		var stash_div = [undefined, undefined];
		var inventory_div = [undefined, undefined];
		
		var ids = [this.props.user_id, bot_id];
		for(var i = 0; i < 2; ++i) {
			var id = ids[i];
			var user = this.props.steam[id];
			
			stash_div[i] = ( <p>0 items worth $0.00</p> ); 
			if((i !== 0 && !this.state.user[id]) || (this.state.user[id] && this.state.user[id].loadingInventory && 
			(!user || !user.inventory || !user.inventory.assets || user.inventory.assets.length <= 0))) {
				inventory_div[i] = ( <p>Loading the inventory...</p> ); 
			}
			else if(utils.isEmpty(user)) {
				inventory_div[i] = i == 0 ? ( <p>Please sign in via Steam.</p> ) : ( <p>Failed to fetch the bot's inventory.</p> ); 
			}
			else {
				utils.backpackUpdated(user.stash);
				
				stash_div[i] = (<Backpack handleClick={this.handleClick.bind(this, 1, id)} user_id={id} inventory={user.stash}/>);
				inventory_div[i] = (<Backpack handleClick={this.handleClick.bind(this, 0, id)} user_id={id} inventory={this.filterItems(id, user.inventory)} />);
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
		
		// Navbar
		let navbar_user = undefined;
		if(steam_user) {
			navbar_user = (
				<div style={{padding:'10px 0 0 0'}} >
					<Form inline>
						<a target="_blank" href='https://steamcommunity.com/id/me/tradeoffers/privacy'>Trade URL:</a>&nbsp; 
						<FormControl type="text" value={this.state.trade_url} size="70" onChange={this.handleChange.bind(this)} disabled={!this.state.editing_url}/>
						<Button  bsStyle={this.state.editing_url ? "primary" : "default"} onClick={this.handleUpdateURL.bind(this)}>
							{this.state.editing_url ? 'Save' : 'Edit'}
						</Button>
				  <Navbar.Text pullRight>
						<NavItem eventKey={1} href="logout">Logout</NavItem>
				  </Navbar.Text>
				  <Navbar.Text pullRight>
						{steam_user.displayName}
						&nbsp;&nbsp;<Image style={{width:20, borderWidth:2}} src={steam_user.photos[0].value} />
				  </Navbar.Text>
					</Form>
				</div>
			);
		}
		else {
			navbar_user = (
				<div>
					<SteamLogin actions={this.props.actions}/>
				</div>
			);
		}
		const navbarInstance = (
		  <Navbar style={{background: well_bg_color_thick}} collapseOnSelect>
			<Navbar.Header>
			  <Navbar.Brand>
				<a href="#">CS Trade</a>
			  </Navbar.Brand>
			  <Navbar.Toggle />
			</Navbar.Header>
			
			<Navbar.Collapse>
				{navbar_user}
			</Navbar.Collapse>
		  </Navbar>
		);
		
		const footer_div = (
		  <Navbar style={{background: well_bg_color_thick, margin:'0',  width:'100%', height:'50px', bottom:'0'}} collapseOnSelect>
			<p>Add "CS TRADE" to your nickname for 2% bonus! Rates: </p>
		  </Navbar>
		);

		// Render
		var trade_r = this.state.trade_result;
		
		var filter_div = [undefined, undefined];
		var offer_div = [undefined, undefined];
		
		var mid_width = 300;
		ids.map((id) => {
			var is_bot = id === bot_id;
			var whos = is_bot ? "Bot's" : "Your";
			var idx = is_bot ? 1 : 0;
			var st = this.state.user[id];

			if(st){
				filter_div[idx] = (
					<Well style={{background: well_bg_color, padding:'0px 10px 10px 10px'}}>
						<h3>{whos} Filter</h3>
						<Form inline>
							StatTrak™:&nbsp;
							<Checkbox type="checkbox" checked={st.filter_stattrak} name='stattrak' onChange={this.handleFilterChange.bind(this, id)}/>
							
							&nbsp;
							
							Name Tag:&nbsp;
							<Checkbox type="checkbox" checked={st.filter_nametag} name='nametag' onChange={this.handleFilterChange.bind(this, id)}/>
						</Form>

						<p/>

						<p><FormControl type="text" placeholder="Enter the item name" value={st.filter_name} size="30" name='name' onChange={this.handleFilterChange.bind(this, id)}/></p>

						<Form inline>
							Type:&nbsp;
							<FormControl componentClass="select" value={st.filter_type} name='type' onChange={this.handleFilterChange.bind(this, id)}>
								{item_types.map((type) => { return <option key={type} value={type}>{type}</option> })}
							</FormControl>
						</Form>
						
						<p/>
							
						<Form inline>
							Exterior:&nbsp;
							<FormControl componentClass="select" value={st.filter_exterior} name='exterior' onChange={this.handleFilterChange.bind(this, id)}>
								{item_exteriors.map((type) => { return <option key={type} value={type}>{type}</option> })}
							</FormControl>
						</Form>

						<p/>

						<Form inline>
							Highest first:&nbsp;
							<Checkbox type="checkbox" checked={st.filter_sort_price} name='sort_price' onChange={this.handleFilterChange.bind(this, id)}/>
							
							<div style={{float:'right'}}>${st.price_range[0]} - ${st.price_range[1]}</div>
						</Form>
						<Range min={0} max={st.max_price} allowCross={false} value={st.price_range} onChange={this.handleRangeChange.bind(this, id)} />
							
					</Well>
				);
					  
				offer_div[idx] = (
					<Well key={id} className="center-block" style={{width:'100%', maxWidth:('calc((100% - '+ (mid_width+20) +'px)/2'), 
								background: well_bg_color, padding:'10px 10px 0px 10px', float:(is_bot ? 'right' : 'left'),
								marginLeft:(is_bot ? '10px' : '0px'), marginRight:(!is_bot ? '10px' : '0px')}}>
						<Button className="center-block"  bsStyle={!st || st.loadingInventory ? "info" : "primary"} 
									onClick={!st || st.loadingInventory ? null : this.handleRefresh.bind(this, id)} disabled={!st || st.loadingInventory} block>
									{!st || st.loadingInventory ?  'Refreshing...' : 'Refresh'}
						</Button>
						
						<Well style={{marginTop:10, padding:'0px 10px 0px 10px', background: well_bg_color}}>
							<h2>{whos} Stash</h2>
							{stash_div[idx]}
						</Well>

						<Well style={{background: well_bg_color, padding:'0px 10px 0px 10px'}}>
							<h2>{whos} Inventory</h2>
							{inventory_div[idx]}
						</Well>
					</Well>
				);
			}
		});
				
				
				
				
		const mid_div = (
			<Well style={{width:mid_width, background: well_bg_color, padding:'10px 10px 0px 10px', overflow: 'auto'}}>
				<Button bsStyle={tradable ? "success" : "danger"} bsSize="large" onClick={this.handleTrade.bind(this)} disabled={!tradable} block>TRADE</Button>
				<p>{trade_r.status === -1 ? (<font color='#008000'>Preparing the offer, please wait...</font>) :
					trade_r.status === 0 ? (<font color='#008000'>Offer sent, <a target="_blank" href={'https://steamcommunity.com/tradeoffer/' + trade_r.offer_id}>here is the trade link!</a></font>) : 
					trade_r.status === 1 ? (<font color='#DC143C'>{trade_r.msg}</font>) :
					''}</p>
				{filter_div[1]}
				{filter_div[0]}
			</Well>
		);
				
		return (
			<div style={{position:'relative', width:'100%', height:'100%'}}>
				{navbarInstance}
				
				<div style={{margin: '5px 20px', overflow: 'auto', minHeight:('calc(100% + '+ (50) +'px')}}>
					{offer_div[0]}
					{offer_div[1]}
					{mid_div}
				</div>
				
				{footer_div}
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
