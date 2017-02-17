import React, { Component } from 'react'
import utils from '../custom_utils'
import Item from './Item'

var ReactGridLayout = require('react-grid-layout');

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
				// layout is an array of objects, see the demo for more complete usage
				var layout = [];
				
				var cols = Math.min(inventory.assets.length, 4);
				var rowHeight = 100;
				for(var n = 0; n < inventory.assets.length; ++n){
					layout.push({
						i: utils.getKeyOfItem(inventory.assets[n]),
						x: n%cols, y: Math.floor(n/cols), w: 1, h: 1, static: true
					});
				}
				
				inventory_div = (
				  <ReactGridLayout className="layout" layout={layout}
						cols={cols} rowHeight={rowHeight} width={cols*rowHeight}>
						{
						  inventory.assets.map((item) => {
							var id = utils.getKeyOfItem(item);
							return <Item key={id} id={id} user_id={this.props.user_id} item={item} click={this.props.handleClick} />
						  })
						}
				  </ReactGridLayout>
				)
			}
			else {
				inventory_div = ( <h2>Could not fetch the inventory.</h2> )
			}
		} else {
			inventory_div = ( <h2>Could not fetch the inventory, maybe your profile is private.</h2> )
		}
		
		return (
			<div>
				{inventory.assets.length || 0} items worth ${parseFloat(inventory.worth || 0).toFixed(2)}
				<div style={{height:200, overflowY:'auto'}}>
					{inventory_div}
				</div>
			</div>
		);	
	}
}

export default Backpack
