
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
	if (msg.type === 'video'){
		let player = document.getElementById('player');
		player.src = msg.src;
	}
});
