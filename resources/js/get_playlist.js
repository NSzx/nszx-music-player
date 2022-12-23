chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
	if (msg.text === 'get_playlist') {
		let links = [...document.getElementsByTagName('a')].map(a => a.href);
		let audio = links
				.filter(href => href.match(/\.(mp3|webm|ogg|oga|flac|wav|aac|m4a)$/i));
        audio.push(...(
            [...document.getElementsByTagName('audio')]
                .map(a => a.src)
                .filter(url => url.length || false)
        ));
        audio.push(...(
            [...document.getElementsByTagName('source')]
                .filter(s => (s.type || '').indexOf('audio') > -1)
                .map(s => s.src)
                .filter(url => url.length || false)
        ));
		audio = audio.filter((value, index, self) => self.indexOf(value) === index);
		let video = links
				.filter(href => href.match(/\.(mkv|mp4|avi)$/i))
				.filter((value, index, self) => self.indexOf(value) === index);
		sendResponse({status: 'ok', audio: audio, video: video});
	} else if (msg.text === 'get_search_results') {
        let results = [...document.querySelectorAll('a h3')]
            .map(h3 => h3.closest('a'))
            .filter(a => !a.origin.includes("google"))
            .filter(a => a && a.href && a.innerText)
            .map(a => {
                return {
                    href: a.href,
                    label: a.innerText
                }
            });
	    sendResponse({status: 'ok', results: results});
    }
});
