var bot_id = '76561198108613401'; //'76561198304258842';
var site_tag = 'CS TRADE';

var min_price = 0.3;
function isValid(is_user, price) {
	if(is_user) return price >= min_price;
	
	return price > 0;
}

var rates = {
	user: {
		key: 1,
		knife: 0.95,
		rare_skin: 0.95,
		weapon: 0.9,
		misc: 0.85
	},
	bot: {
		key: 1.05,
		knife: 1,
		rare_skin: 1,
		weapon: 0.95,
		misc: 0.9
	}
}

function getItemType(market_hash_name, type) {
    if(market_hash_name.indexOf('Key') !== -1) return 'key';
    if(market_hash_name.indexOf('★') !== -1) return 'knife';
	if(type.indexOf('Classified') !== -1 || type.indexOf('Covert') !== -1) return 'rare_skin';
    if(type.indexOf('Consumer Grade') !== -1 || type.indexOf('Base Grade') !== -1 || type.indexOf('Industrial Grade') !== -1) return 'misc';
    return 'weapon';
}

function getPriceRate(username, market_hash_name, type, rate_type) { 
	return (rates[rate_type][getItemType(market_hash_name, type)] || 0)
	+ (rate_type == 'user' && username.indexOf(site_tag) !== -1 ? 0.02 : 0.0); 
}

module.exports = {bot_id, rates, getPriceRate, site_tag, isValid};