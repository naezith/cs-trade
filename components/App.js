import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import actions from '../redux/actions'
import Backpack from './Backpack'
import utils from '../custom_utils'
import common, { bot_id } from '../common'
import Range from 'rc-slider/lib/Range'
import ReactTooltip from 'react-tooltip'
import Media from 'react-media'
import { Panel, ListGroupItem, ListGroup, Modal, Image, Navbar, Nav, NavItem, NavDropdown, MenuItem,
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
			trade_result: { status: -2 },
			
			show_modal_trade_url: false,
			show_modal_giveaway: false,
			show_modal_faq: false
		};
	}
	setModalState(name, on) {
		name = 'show_modal_' + name;
		var obj = this.state;
		obj[name] = on;
		this.setState(obj);
	}
	
	getNewUser() {
		return {
			loadingInventory : true,
			filter_name : '',
			filter_type : item_types[0],
			filter_exterior : item_exteriors[0],
			filter_nametag : false,
			filter_stattrak : false,
			filter_sticker : false,
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
				var is_user = user_id === this.props.user_id;
				
				for(var i = 0; i < assets.length; ++i){
					var price = assets[i].price_info.price;
					
					// Set rate
					assets[i].price_info.price = parseFloat(parseFloat(price * common.getPriceRate(this.props.steam[user_id].displayName, assets[i].market_hash_name, assets[i].type, rate_type)).toFixed(2));
					
					// Set Valid
					assets[i].price_info.valid = common.isValid(is_user, assets[i].price_info.price);
					
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
						if(desc_imgs !== '') {
							item.stickers_html = desc_imgs;
							item.stickers_small_html = utils.replaceAll(desc_imgs, "img width=64 height=48", "img width=20 height=15");
							item.stickers_small_html = utils.replaceAll(item.stickers_small_html, `.png">`, `.png"><br/>`);
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
	
	componentDidUpdate(prevProps, prevState) {
		ReactTooltip.hide();
		ReactTooltip.rebuild();
		
		if(this.state.show_modal_giveaway) {
			var node = document.createElement('script');
			node.src = 'https://js.gleam.io/e.js';
			document.body.appendChild(node);  
		}
	}
	
	componentWillMount() {
		document.body.style.backgroundColor = "black";
		this.resetFilters[bot_id];
		if(!utils.isEmpty(this.props.steam[this.props.user_id])) this.resetFilters[this.props.user_id];
	}
	componentDidMount() {
		document.title = common.site_tag;
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
	filterSticker(st, it){ 
		return !st.filter_sticker || it.stickers_html;
	}
	filterNameTag(st, it){ 
		return !st.filter_nametag || (it.fraudwarnings && it.fraudwarnings.length > 0);
	}
	filterPrice(st, it){ 
		return it.price_info.price > 0.0 && 
				it.price_info.price >= st.price_range[0] &&
				it.price_info.price <= st.price_range[1];
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
			this.filterStatTrak(st, it) && this.filterExterior(st, it) && this.filterNameTag(st, it) && this.filterSticker(st, it)
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
		var well_bg_color = utils.well_bg_color;
		var well_bg_color_thick = utils.well_bg_color_thick;
		
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
				
				var is_user = id === this.props.user_id;
				stash_div[i] = (<Backpack handleClick={this.handleClick.bind(this, 1, id)} is_user={is_user} is_stash={true} user_id={id} inventory={user.stash}/>);
				inventory_div[i] = (<Backpack handleClick={this.handleClick.bind(this, 0, id)} is_user={is_user} is_stash={false} user_id={id} inventory={this.filterItems(id, user.inventory)} />);
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
		const navbarInstance = (
		  <Navbar style={{background: well_bg_color_thick}} collapseOnSelect>
			<Navbar.Header>
			  <Navbar.Brand>
			  {common.site_tag}
			  </Navbar.Brand>
			  <Navbar.Toggle />
			</Navbar.Header>
			
			<Navbar.Collapse>
				<Nav>
					<NavItem eventKey={1} onClick={this.setModalState.bind(this, 'trade_url', true)} >Trade URL</NavItem>
					<NavItem eventKey={2} onClick={this.setModalState.bind(this, 'giveaway', true)} >Giveaway</NavItem>
					<NavItem eventKey={3} onClick={this.setModalState.bind(this, 'faq', true)} >FAQ</NavItem>
				</Nav>
				
				{steam_user ? (
				<div>
					<Navbar.Text pullRight>
						<NavItem eventKey={5} href="logout">Logout</NavItem>
					</Navbar.Text>
					<Navbar.Text pullRight>
						<Image style={{width:20, borderWidth:2}} src={steam_user.photos[0].value} />
						&nbsp;&nbsp;{steam_user.displayName}
					</Navbar.Text>
				</div>
				) : (
					<Navbar.Text pullRight>
						<Navbar.Link href="/auth/steam"> <Image src="http://cdn.steamcommunity.com/public/images/signinthroughsteam/sits_small.png"/> </Navbar.Link>
					</Navbar.Text>
				)}
			</Navbar.Collapse>
		  </Navbar>
		);

		// Render
		var trade_r = this.state.trade_result;
		
		var filter_div = [undefined, undefined];
		var offer_div = [() => undefined, () => undefined];
		
		var mid_width = 300;
		ids.map((id) => {
			var is_bot = id === bot_id;
			var whos = is_bot ? "Bot's" : "Your";
			var idx = is_bot ? 1 : 0;
			var st = this.state.user[id];

			if(st){
				filter_div[idx] = (
					<Panel header={(<h3>{whos} Filter</h3>)} bsStyle="warning" style={{float:!is_bot ? 'left' : 'right', width:mid_width, background: well_bg_color}}>
						<p>
							StatTrak™&nbsp;
							<input type="checkbox" checked={st.filter_stattrak} name='stattrak' onChange={this.handleFilterChange.bind(this, id)}/>
							
							&nbsp;
							
							Name Tag&nbsp;
							<input type="checkbox" checked={st.filter_nametag} name='nametag' onChange={this.handleFilterChange.bind(this, id)}/>
							
							&nbsp;
							
							Sticker&nbsp;
							<input type="checkbox" checked={st.filter_sticker} name='sticker' onChange={this.handleFilterChange.bind(this, id)}/>
						</p>

						<p/>

						<p><FormControl type="text" placeholder="Enter the item name" value={st.filter_name} size="30" name='name' onChange={this.handleFilterChange.bind(this, id)}/></p>

						
						<p/>
							
						
						Exterior <div style={{float:'right'}}>Type</div>
						<p>
							<FormControl style={{float:'left', width:'50%'}} componentClass="select" value={st.filter_type} name='type' onChange={this.handleFilterChange.bind(this, id)}>
								{item_types.map((type) => { return <option key={type} value={type}>{type}</option> })}
							</FormControl>
							
							<FormControl style={{float:'left', width:'50%'}} componentClass="select" value={st.filter_exterior} name='exterior' onChange={this.handleFilterChange.bind(this, id)}>
								{item_exteriors.map((type) => { return <option key={type} value={type}>{type}</option> })}
							</FormControl>
						</p>
						
						&nbsp;
						<p/>

						<div style={{float:'right'}}>${st.price_range[0]} - ${st.price_range[1]}</div>
						<p>
							Highest first:&nbsp;
							<input type="checkbox" checked={st.filter_sort_price} name='sort_price' onChange={this.handleFilterChange.bind(this, id)}/>
							
						</p>
						<Range min={0} max={st.max_price} allowCross={false} value={st.price_range} onChange={this.handleRangeChange.bind(this, id)} />
					</Panel>
				);
					  
				offer_div[idx] = (sc_size) => {
				return (
					<Well key={id} style={{width:'100%', maxWidth:(sc_size === 'sm' ? '100%' : 'calc((100% - '+ (sc_size === 'mid' ? 20 : (mid_width+42)) +'px)/2'), 
								background: well_bg_color, padding:'10px 10px 0px 10px', float:(sc_size === 'mid' ? 'left' : (is_bot ? 'right' : 'left') ),
								marginLeft:(sc_size !== 'sm' && is_bot ? '10px' : '0'), marginRight:(sc_size !== 'sm' && !is_bot ? '10px' : '0')}}>
						<Button style={{marginBottom:10}} 
									onClick={!st || st.loadingInventory ? null : this.handleRefresh.bind(this, id)} disabled={!st || st.loadingInventory} block>
									{!st || st.loadingInventory ?  'Refreshing...' : 'Refresh'}
						</Button>
						
						{stash_div[idx]}
						{inventory_div[idx]}
					</Well>
				)};
			}
		});
				
				
				
				
		const mid_div = (draw_filters = true) => (
			<Well style={{background: well_bg_color, padding:'10px 10px 0px 10px', overflow: 'hidden'}}>
				<Button bsStyle={tradable ? "success" : "danger"} bsSize="large" onClick={this.handleTrade.bind(this)} disabled={trade_r.status === -1 || !tradable} block>TRADE</Button>
				
				<ListGroup style={{margin:'0 0 10px 0'}}>
					<ListGroupItem bsStyle={
							(trade_r.status === -1 ? "warning" :
							 trade_r.status === 0 ? "success" :
							 trade_r.status === 1 ? "danger" : "info")}>
						<center>{trade_r.status === -1 ? 'Preparing, please wait...' :
						trade_r.status === 0 ? (<div>Offer sent, <a target="_blank" href={'https://steamcommunity.com/tradeoffer/' + trade_r.offer_id}>here is the trade link!</a></div>) : 
						trade_r.status === 1 ? trade_r.msg : 'Fill stashes to trade'}</center>
					</ListGroupItem>
				</ListGroup>
				
				{draw_filters && filter_div[0]}
				{draw_filters && filter_div[1]}
			</Well>
		);
				
		let trade_url_modal = undefined;
		let giveaway_modal = (
			<Modal show={this.state.show_modal_giveaway} onHide={this.setModalState.bind(this, 'giveaway', false)}>
			  <Modal.Header closeButton>
				<Modal.Title>Giveaway</Modal.Title>
			  </Modal.Header>
			  <Modal.Body>
				<a className="e-widget" href="https://gleam.io/B5OhY/cs-trade-test-competition" rel="nofollow">{common.site_tag} Test Competition</a>
			  </Modal.Body>
			</Modal>
		);
		
		var rates_div = (
			<center>
				<h4>Rates</h4>
				<p><ControlLabel>Keys:</ControlLabel> {common.rates.user.key*100}% <ControlLabel> | </ControlLabel> {common.rates.bot.key*100}% 
					&nbsp;&nbsp;&nbsp;<ControlLabel>Knives:</ControlLabel> {common.rates.user.knife*100}% <ControlLabel> | </ControlLabel> {common.rates.bot.knife*100}%
					&nbsp;&nbsp;&nbsp;<ControlLabel>Rare weapons:</ControlLabel> {common.rates.user.rare_skin*100}% <ControlLabel> | </ControlLabel> {common.rates.bot.rare_skin*100}%</p>
				<p><ControlLabel>Weapons:</ControlLabel> {common.rates.user.weapon*100}% <ControlLabel> | </ControlLabel> {common.rates.bot.weapon*100}%
				&nbsp;&nbsp;&nbsp;<ControlLabel>Misc:</ControlLabel> {common.rates.user.misc*100}% <ControlLabel> | </ControlLabel> {common.rates.bot.misc*100}%</p>
			</center>
		);
		
		let faq_modal = (
			<Modal show={this.state.show_modal_faq} onHide={this.setModalState.bind(this, 'faq', false)}>
			  <Modal.Header closeButton>
				<Modal.Title>Frequently Asked Questions</Modal.Title>
			  </Modal.Header>
			  <Modal.Body>
				<ControlLabel>IS IT POSSIBLE TO LOWER THE WEBSITE COMMISSION?</ControlLabel>
				<p>OF COURSE, YOU NEED TO ADD <ControlLabel>"{common.site_tag}"</ControlLabel> TO YOUR STEAM PLAYER NICKNAME, AND THEN REPEATEDLY LOG IN TO THE WEBSITE. YOU COMMISSION WILL BE AUTOMATICALLY REDUCED BY 2%.</p>
				
				<ControlLabel>WHY I DON'T SEE SOME OF THE CS:GO ITEMS IN MY INVENTORY ON THE WEBSITE?</ControlLabel>
				<p>YOU NEED TO REFRESH YOUR INVENTORY. IF THE PROBLEM IS NOT SOLVE – PLEASE WAIT A LITTLE. MOST LIKELY, YOU HAVE MADE A PURCHASE ON THE MARKET LESS THAN 7 DAYS AGO. ITEMS APPEAR ONLY AFTER SEVEN DAYS FROM THE PURCHASE.</p>
				
				<ControlLabel>WHY ARE SOME ITEMS UNAVAILABLE FOR TRADING?</ControlLabel>
				<p>WE DO NOT TRADE THESE ITEMS, BECAUSE IF WE PROCESS SUCH TRADES OUR ACCOUNTS WOULD BE FULL OF CHEAP AND LOW-GRADE SKINS, AND WE WILL NO LONGER HAVE UNIQUE ITEMS.</p>
				
				<ControlLabel>IS THERE ANY RISK DURING TRADING?</ControlLabel>
				<p>AS ALL THE BOTS SEND YOU, TRADE OFFERS THROUGH STEAM, YOU ARE ELIGIBLE TO CHECK ALL ITEMS TO BE TRADED ON YOUR OWN RIGHT BEFORE ACCEPTING THE OFFER. NO ONE WILL FORCE YOU TO TRADE ITEMS. IF YOU ARE NOT SATISFIED WITH THE PROPOSED OFFER, YOU CAN FREELY REJECT IT AND SELECT ANY OTHER ONE.</p>
				<hr/>
				{rates_div}
			  </Modal.Body>
			</Modal>
		);
		if(steam_user) {
			trade_url_modal = (
				<Modal show={this.state.show_modal_trade_url} onHide={this.setModalState.bind(this, 'trade_url', false)}>
				  <Modal.Header closeButton>
					<Modal.Title>Trade URL</Modal.Title>
				  </Modal.Header>
				  <Modal.Body>
					<center>
						{!steam_user && <p>Please sign in with Steam.</p>}
						<Form inline>
							<FormControl type="text" value={this.state.trade_url} onChange={this.handleChange.bind(this)} disabled={steam_user || !this.state.editing_url}/>
							<Button  bsStyle={this.state.editing_url ? "primary" : "default"} onClick={this.handleUpdateURL.bind(this)}>
								{this.state.editing_url ? 'Save' : 'Edit'}
							</Button>
						</Form>
						<a target="_blank" href='https://steamcommunity.com/id/me/tradeoffers/privacy'><h2>FIND YOUR TRADE URL</h2></a>
					</center>
					<hr/>
					<h4>What is it for?</h4>
					<p>By adding your Steam Trade URL you make it possible for our bots to send you a trade offer without 
					the need of adding you as a friend on Steam. This is totally safe and no items can be traded before you
					have inspected and accepted the offer from your Steam page.</p>
					
				  </Modal.Body>
				</Modal>
			);
		}
		
		return (
			<div style={{width:'100%'}}>
				{navbarInstance} {trade_url_modal}{giveaway_modal}{faq_modal}
					<Media query="(max-width: 1200px)">
					  {matches => matches ? (
						<Media query="(max-width: 767px)">
						  {matches => matches ? (
							<div style={{margin: '20px', minWidth:(mid_width + 22)}}>
								{mid_div(false)}
								{offer_div[0]('sm')}
								{offer_div[1]('sm')}
								{filter_div[0]}
								{filter_div[1]}
							</div>
						  ) : (	
							<div style={{margin: '20px', overflow: 'hidden'}}>
								{mid_div(false)}
								{offer_div[0]('mid')}
								{offer_div[1]('mid')}
								{filter_div[0]}
								{filter_div[1]}
							</div>
						  )}
						</Media>
					  ) : (
						<div style={{margin: '20px', overflow: 'hidden'}}>
							{offer_div[0]('lg')}
							{offer_div[1]('lg')}
							{mid_div()}
						</div>
					  )}
					</Media>
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
