function isEmpty(obj) {
	return !obj || (Object.keys(obj).length === 0 && obj.constructor === Object);
}

function getKeyOfItem(item){
	return item.assetid + item.classid + item.instanceid;
}

function addItemToBackpack(backpack, item){
	return Object.assign({}, backpack, { assets: [...backpack.assets, item] });
}

function removeItemFromBackpack(backpack, item){
	const item_key = getKeyOfItem(item);
	return Object.assign({}, backpack, { assets: backpack.assets.filter(i => getKeyOfItem(i) !== item_key) })
}

function backpackUpdated(backpack, sort_dir = -1) {
	if(isEmpty(backpack) || isEmpty(backpack.assets)) return;
	
	backpack.assets.sort(function(a, b){ 
		var diff = sort_dir*(a.price_info.lowest_price - b.price_info.lowest_price);
		// Ignore the "No Price" ones at lowest first sort 
		if(diff !== 0) return (sort_dir === 1 && (a.price_info.lowest_price === 0.0 || b.price_info.lowest_price === 0.0) ? -1 : 1)*diff;
		return getKeyOfItem(a) - getKeyOfItem(b);
	});
	
	// Calculate the worth
	backpack.worth = 0.0; 
	for(var i = 0; i < backpack.assets.length; ++i) 
		backpack.worth += parseFloat(backpack.assets[i].price_info.lowest_price);
	backpack.worth = parseFloat(backpack.worth).toFixed(2);
}

function getItemWear(market_hash_name) {
    if(market_hash_name.indexOf('Factory New') !== -1) return 'FN';
    if(market_hash_name.indexOf('Minimal Wear') !== -1) return 'MW';
    if(market_hash_name.indexOf('Field-Tested') !== -1) return 'FT';
    if(market_hash_name.indexOf('Well-Worn') !== -1) return 'WW';
    if(market_hash_name.indexOf('Battle-Scarred') !== -1) return 'BS';
    return '';
}

module.exports = {isEmpty, getKeyOfItem, addItemToBackpack, removeItemFromBackpack, backpackUpdated, getItemWear};