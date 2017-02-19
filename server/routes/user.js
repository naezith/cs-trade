var express = require('express');
var router = express.Router();
var fetch = require('isomorphic-fetch');
var priv_info = require('../../priv_info');
var common = require('../../common');
 

var database = require('mysql').createConnection({
    host: 'localhost',
    user: 'root',
    password: priv_info.db_pwd,
    database: 'cs_trade'
});

function getPriceObject(price) {
	return { price : price }
}

function fetchPriceInfo(item) {
	return new Promise(function(resolve, reject) { // AND update_date >= date_sub(NOW(), interval 5 hour)
		database.query('SELECT price FROM prices WHERE name = ? LIMIT 1', [item.market_hash_name], function(err, results, fields){	
			if(err) { console.log(err); return; }
			
			// Found info
			if(results.length > 0){ 
				resolve( getPriceObject(results[0].price) );
				return;
			}
			else {
				// Database is old, fetch fresh data
				fetch('http://csgobackpack.net/api/GetItemPrice/?time=1&id=' + encodeURI(item.market_hash_name))
					.then(function(res) { return res.json(); })
					.then(function(json) {
						json = getPriceObject(json.lowest_price);
						
						// Save to database 
						database.query('INSERT INTO prices (name, price) VALUES (?, ?) ON DUPLICATE KEY UPDATE price = VALUES(price)', 
								[item.market_hash_name, json.price], function(err, results, fields){});
								
						resolve(json);
					})
					.catch(err => console.log(err));
			}
		});
	});
}

function setPriceInfo(item){ 
	return fetchPriceInfo(item).then((price) => Promise.resolve(Object.assign(item, { price_info: price }))); 
}
 
var _ = require('lodash');

function getInventory(steam_id) {
	return new Promise(function(resolve, reject) {
		fetch('http://steamcommunity.com/inventory/' + steam_id + '/730/2?l=english&count=5000')
		.then(function(res) { return res.json(); })
		.then(function(json) { 
			if(!json.error){
				// Set descriptions of assets
				var lookup = {};
				for (var i = 0, len = json.descriptions.length; i < len; i++) {
					lookup[json.descriptions[i].classid] = json.descriptions[i];
				}
				delete json.descriptions;
				
				for (var i = 0, len = json.assets.length; i < len; i++) {
					_.merge(json.assets[i], lookup[json.assets[i].classid]);
				}
				
				Promise.all(json.assets.filter((item) => {return item.tradable && item.marketable})
					// Get Prices
					.map(setPriceInfo)).then((items) => { 
						json.assets = items;
						delete json.total_inventory_count; 
						return resolve(json); 
					});
			}
			else return resolve(json); 
		});
	});
}

router.post('/inventory', function(req, res) {
	getInventory(req.query.user_id).then(function (json) { return res.json(json); });
});
  
function getTradeURL(steam_id) {
	return new Promise(function(resolve, reject) {
		database.query('SELECT trade_url FROM user WHERE steam_id = ? LIMIT 1', [steam_id], function(err, results, fields){	
			if(err) { console.log(err); return; }
			
			// Found info
			if(results.length > 0) {
				return resolve(results[0]);
			}
			return resolve( { trade_url : "" } );
		});
	});
}

router.get('/getTradeURL', function(req, res) {
	if(!req.user.id) { return res.json( { trade_url : "" } ); }
	getTradeURL(req.user.id).then(function (trade_url) { return res.json(trade_url); });
});

router.post('/setTradeURL', function(req, res) {
	if(!req.user.id) { return; }
	
	database.query('INSERT INTO user (steam_id, trade_url) VALUES(?, ?) ON DUPLICATE KEY UPDATE trade_url = VALUES(trade_url)', 
			[req.user.id, req.body.trade_url], function(err, results, fields){	
		if(err) { console.log(err); return  res.json( { status : 1 } ); }
		return res.json( { status : 0 } );
	});
});
  
  
  
  
  
  
  
  
  
  
  
  
  

// BOT ON/OFF
if(0) {

function validateOffer(user, bot, callback) {
    if(!user.items.length || user.items.length <= 0) return callback("User has no items in offer.");
	
	user.value = 0; user.alias = 'user';
	bot.value = 0; bot.alias = 'bot';
	
	var accs = [user, bot];
	
	Promise.all(accs.map((acc) => {
		return getInventory(acc.id).then((inventory) => {
			if(!inventory || !inventory.assets || inventory.assets.length <= 0) return Promise.reject("Couldn't fetch the " + user.alias + "'s inventory.");
			
			var is_user = user.alias === 'user';
			let count = 0;
			acc.items.map((assetid) => {
				for(var k in inventory.assets) {
					var item = inventory.assets[k];
					if(item.assetid === assetid && common.isValid(is_user, item.price_info.price)) {
						acc.value += parseFloat(parseFloat(item.price_info.price * common.getPriceRate(user.displayName, item.market_hash_name, item.type, acc.alias)).toFixed(2));
						count += 1;
						break;
					}
				}
			});
			
			if(count !== acc.items.length) return Promise.reject("Some items were not found in the " + user.alias + "'s inventory!");
		});
	})).then(() => { 
		if(parseFloat(user.value.toFixed(2)) < parseFloat(bot.value.toFixed(2))) return callback('You do not have enough value!');
		
		// Success!
		return callback(null, true);
	}).catch((err) => { return callback(err); });
};
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
// STEAM BOT
var steamguard_file = "node_modules/priv_info/steamguard.txt";
var polldata_file = "node_modules/priv_info/polldata.json";

var SteamCommunity = require('steamcommunity');
var TradeOfferManager = require('steam-tradeoffer-manager');
var fs = require('fs');

var steam = new SteamCommunity();
var manager = new TradeOfferManager({
	"domain": "example.com", // Our domain is example.com
	"language": "en", // We want English item descriptions
	"pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
});

// Steam logon options
var logOnOptions = priv_info.bot_logOnOptions;

if (fs.existsSync(steamguard_file)) { logOnOptions.steamguard = fs.readFileSync(steamguard_file).toString('utf8'); }
if (fs.existsSync(polldata_file)) { manager.pollData = JSON.parse(fs.readFileSync(polldata_file)); }

steam.login(logOnOptions, function(err, sessionID, cookies, steamguard) {
	if (err) {
		console.log("Steam login fail: " + err.message);
		process.exit(1);
	}

	fs.writeFile(steamguard_file, steamguard);

	console.log("Logged into Steam");

	manager.setCookies(cookies, function(err) {
		if (err) {
			console.log(err);
			process.exit(1); // Fatal error since we couldn't get our API key
			return;
		}

		console.log("Set cookies");
	});

	steam.startConfirmationChecker(30000, priv_info.identity_secret); // Checks and accepts confirmations every 30 seconds
});
// STEAM BOT

  
// Bot
function makeInventory(asset_list) {
	return asset_list.map((assetid) => {
		return {
			assetid: assetid,
			appid: 730,
			contextid: 2,
			amount: 1
		};
	})
}

router.post('/sendOffer', function(req, res) {
	if(!req.user) return;
	
	var myItems = req.body.bot_items;
	var theirItems = req.body.user_items;
	
	if(!req.user.id) { return res.json( { status: 1, msg: "Bad auth." } ); }
	
	validateOffer({id: req.user.id, items: theirItems, displayName: req.user.displayName },
				  {id: common.bot_id, items: myItems, displayName: 'bot' }, (err, success) => {
		if(!err && success) {
			getTradeURL(req.user.id).then(function (obj) {
				var trade_url = obj.trade_url;
				if(trade_url === '') return res.json({status: 1, msg: 'Invalid trade URL.'});
				
				// Create and send the offer
				var offer;
				try{ offer = manager.createOffer(trade_url); }
				catch(err){ return res.json({status: 1, msg: 'Invalid trade URL.'}) }
				
				offer.addMyItems(makeInventory(myItems));
				offer.addTheirItems(makeInventory(theirItems));
				
				offer.setMessage("Fair trade, sir! - " + common.site_tag + " Bot");
				
				offer.send(function(err, status) {
					if (err) {
						return res.json({status: 1, msg: err});
					}
					
					if (status == 'pending') {
						// We need to confirm it
						steam.acceptConfirmationForObject(priv_info.identity_secret, offer.id, function(err) {
							if (err) {
								return res.json({status: 1, msg: "Bot couldn't do mobile confirmation."});
							} else {
								return res.json({status: 0, offer_id: offer.id});
							}
						});
					} else {
						//console.log(`Offer #${offer.id} sent successfully`);
						return res.json({status: 0, offer_id: offer.id});
					}
				});
			}).catch(console.log);
		}
		else return res.json({status: 1, msg: err});
	});
});

manager.on('receivedOfferChanged', function(offer, oldState) {
	console.log(`Offer #${offer.id} changed: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);

	if (offer.state == TradeOfferManager.ETradeOfferState.Accepted) {
		offer.getReceivedItems(function(err, items) {
			if (err) {
				console.log("Couldn't get received items: " + err);
			} else {
				var names = items.map(function(item) {
					return item.name;
				});

				console.log("Received: " + names.join(', '));
			}
		});
	}
});

manager.on('pollData', function(pollData) { fs.writeFile(polldata_file, JSON.stringify(pollData), function() {}); });

}
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

module.exports = router;