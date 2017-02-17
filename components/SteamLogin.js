import React, { Component } from 'react'

class SteamLogin extends Component {

	constructor() {
		super();
		this.state = {};
	}

	render() {
		return (
			<div>
				<a href="/auth/steam"> <img src="http://cdn.steamcommunity.com/public/images/signinthroughsteam/sits_small.png"/> </a>
			</div>
		)
	}
}

SteamLogin.contextTypes = {
	router: React.PropTypes.object.isRequired
}

export default SteamLogin
