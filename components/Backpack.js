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
		let inventory_div;
		let inventory = this.props.inventory;
		
		if(!utils.isEmpty(inventory)) {
			if(inventory.success === 1){
				inventory_div = (
				  <div>
						{
						  inventory.assets.map((item) => {
							var id = utils.getKeyOfItem(item);
							return <Item key={id} id={id} user_id={this.props.user_id} item={item} click={this.props.handleClick} />
						  })
						}
				  </div>
				)
			}
			else {
				inventory_div = ( <h2>Could not fetch the inventory.</h2> )
			}
		} else {
			inventory_div = ( <h2>Could not fetch the inventory, maybe your profile is private.</h2> )
		}
		
		var whos = this.props.is_user ? "Your" : "Bot's";
		return (
			<Panel header={(<h2>{whos + " " + (this.props.is_stash ? "Stash" : "Inventory")}</h2>)} bsStyle="primary" style={{background: utils.well_bg_color}}>
				{(inventory.assets ? inventory.assets.length : 0) || 0} items worth ${parseFloat(inventory.worth || 0).toFixed(2)}
				{inventory_div}
			</Panel>
		);	
	}
}

export default Backpack
