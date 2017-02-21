import React, { Component } from 'react'
import utils from '../custom_utils'
import Item from './Item'
import { Well, Panel } from 'react-bootstrap';

class Backpack extends Component {
	
	constructor() {
		super();
		this.state = {};
	}
	
	render() {
		const content = this.props.content;
		let inventory_div;
		let inventory = this.props.inventory;
		
		if(!this.props.is_stash && this.props.loading) {
			if(this.props.not_logged && this.props.is_user) inventory_div = ( <h2>{content.not_logged_in}</h2> );
			else inventory_div = ( <h2>{content.loading}</h2> );
		}
		else {
			if(!inventory || !inventory.success){
				if(this.props.is_stash) inventory_div = undefined;
				else inventory_div = ( <h2>{content.loading}</h2> );
			}
			else if(inventory.success === 1){
				inventory_div = (
				  <div style={{height:'100%', minHeight:'100%', overflow:'auto'}} >
						{
						  inventory.assets.map((item) => {
							var id = utils.getKeyOfItem(item);
							return <Item content={content.item} key={id} id={id} user_id={this.props.user_id} item={item} click={this.props.handleClick} />
						  })
						}
				  </div>
				)
			}
			else {
				if(this.props.is_stash) inventory_div = undefined;
				else inventory_div = ( <h2>{content.couldnt_fetch}</h2> );
			}
		}
		
		var tit = this.props.is_user ? 
					(this.props.is_stash ? content.user.stash : content.user.inventory) : 
					(this.props.is_stash ? content.bot.stash : content.bot.inventory);
		return (
			<Panel header={(<h2>{tit}</h2>)} bsStyle="primary" 
				style={{height:(this.props.is_stash ? 265 : 445), background: utils.well_bg_color, marginBottom:'10px'}}>
				{(inventory && inventory.assets ? inventory.assets.length : 0) || 0} {content.item_count}, ${parseFloat(inventory && inventory.worth ? inventory.worth : 0).toFixed(2)}
				{inventory_div}
			</Panel>
		);	
	}
}

export default Backpack
