$(function () {
    let params = (new URL(document.location)).searchParams
    let id = params.get('id')
    if (id == null) {
        window.close()
    }

    fetch('https://nszx.fr/media-player-share/' + id)
        .then(r => r.text())
        .then(html => {
            console.log(html)
            let $html = $(html)
            let tracks = $html.find('a').get().map(a => a.href)
                              .filter(href => href.match(/\.(mp3|webm|ogg|oga|flac|wav|aac|m4a)$/i))
            let name = $html.find('h1').text()
            chrome.runtime.sendMessage({
                text: 'create_playlist',
                name: name,
                tracks: tracks
            })
            chrome.runtime.sendMessage({
                text: 'control',
                action: 'open_media_player'
            })
            window.close()
        })
        .catch(() => $('body').text('An error occurred'))
})
