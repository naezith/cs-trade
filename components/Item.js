import React, { Component } from 'react'
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import utils from '../custom_utils'
import { Button, Well } from 'react-bootstrap';

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
		if(item.float_value) {
			tip_html += "<p> Float: " + item.float_value + "</p>";
		}
		if(item.fraudwarnings && item.fraudwarnings.length > 0) {
			tip_html += "<p>" + item.fraudwarnings[0] + "</p>";
		}
		
		var sticker_div = undefined;
		if(item.stickers_html) {
			tip_html += item.stickers_html;
			sticker_div = (<div className="content" dangerouslySetInnerHTML={{__html: item.stickers_small_html}}></div>);
		}
		
		var item_wear = utils.getItemWear(item.market_hash_name);
		var item_wear_div = undefined;
		if(item_wear !== '') {
			item_wear_div = (
				<Well style={{background:'#EEEEEE', position:'absolute', padding:'0', float:'right', bottom:0}}>
					{is_st && <font style={{fontSize:'0.75em'}} color="#998100">ST</font>}{is_st && <br/>}
					<font style={{fontSize:'0.75em'}} color="#0000DF">{utils.getItemWear(item.market_hash_name)}</font>
				</Well>
			);
		}
		var is_st = item.type.includes('StatTrak');
		return (
			<div style={{float:'left'}}>
				<div style={{position:'relative'}}>
					<ContextMenuTrigger id={this.props.id}>
						<Button onClick={() => this.props.click(item)} data-tip={tip_html} style={{width:'100px', height:'80px', padding:'0'}}
							disabled={!item.price_info.valid}>
							<div style={{position:'absolute', marginLeft:'78px', padding:'0', float:'right'}}>
								{sticker_div}
							</div>
							{item_wear_div}
							
							<img width="75" src={'https://steamcommunity-a.akamaihd.net/economy/image/' + item.icon_url} alt={item.market_hash_name} /> 
							<br/>
							{item.price_info.valid === true ? ('$' + item.price_info.price) : 'Unavailable'}
						</Button>
					</ContextMenuTrigger>
				</div>
				
				{item.actions && item.actions.length > 0 && item.actions[0].name.toUpperCase().includes('INSPECT') && (
				<div style={{position:'absolute', zIndex:10}}>
					<ContextMenu id={this.props.id}><MenuItem data={{assetid : item.assetid, user_id : this.props.user_id, link : item.actions[0].link}} onClick={this.handleClick}>
								Inspect
							</MenuItem>
					</ContextMenu>
				</div>
				)}
			</div>
		);
	}
}

export default Item
