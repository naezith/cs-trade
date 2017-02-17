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
		var desc_imgs = '';
		if(item.descriptions) {
			item.descriptions.map((desc) => {
				if(desc.type === "html" && desc.value.indexOf('sticker_info') !== -1){
					var imgs = utils.getHTMLtags(desc.value, 'img');
					for(var i in imgs) desc_imgs += imgs[i];
					tip_html += desc_imgs;
					desc_imgs = utils.replaceAll(desc_imgs, "img width=64 height=48", "img width=20 height=15");
				}
			});
		}
		
		var sticker_div = (<div className="content" style={{position:'absolute'}} dangerouslySetInnerHTML={{__html: desc_imgs}}></div>);
		
		return (
			<Button onClick={() => this.props.click(item)} data-tip={tip_html} style={{width:'100px', height:'100px'}}>
				{sticker_div}
				<ContextMenuTrigger id={this.props.id} >
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
