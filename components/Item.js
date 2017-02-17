import React, { Component } from 'react'
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import utils from '../custom_utils'
import { Button } from 'react-bootstrap';

class Item extends Component {

	constructor() {
		super();
		this.state = {};
	}
	
	handleClick(e, data){
		e.stopPropagation();
		window.location = data.link.replace("%assetid%", data.assetid).replace("%owner_steamid%", data.user_id);
	}
	render() {
		let item = this.props.item;
		var tip_html = "<center><img width=" + 200 + " src="+'https://steamcommunity-a.akamaihd.net/economy/image/' + item.icon_url + " alt=" + item.market_hash_name + " />";
		tip_html += "<p><font color=" + item.name_color + ">" + item.market_hash_name + "</font><p>";
		if(item.fraudwarnings && item.fraudwarnings.length > 0) {
			tip_html += "<p>" + item.fraudwarnings[0] + "</p>";
		}
		tip_html += "</center>"
		
		return (
			<Button onClick={() => this.props.click(item)} data-tip={tip_html} >
				<ContextMenuTrigger id={this.props.id}>
					<img width="70" src={'https://steamcommunity-a.akamaihd.net/economy/image/' + item.icon_url} alt={item.market_hash_name} /> 
					<br/>
					{item.price_info.valid === true ? ((item.price_info.currency ? item.price_info.currency : '') + item.price_info.lowest_price) : 'No Price'}
					<font style={{float:'right'}} color="#0000CD">{utils.getItemWear(item.market_hash_name)}</font>
				</ContextMenuTrigger>
				<ContextMenu id={this.props.id}>
					{item.actions && item.actions.length > 0 && item.actions[0].name.toUpperCase().includes('INSPECT') &&
					(<MenuItem data={{assetid : item.assetid, user_id : this.props.user_id, link : item.actions[0].link}} onClick={this.handleClick}>
						Inspect
					</MenuItem>)}
				</ContextMenu>
			</Button>
		);
	}
}

export default Item
