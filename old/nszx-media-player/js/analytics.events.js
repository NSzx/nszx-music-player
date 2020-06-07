(function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function () {

        (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date();
    a = s.createElement(o),
        m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m)

})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-113416956-1', 'auto');

ga('set', 'checkProtocolTask', function () {
}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200

ga('require', 'displayfeatures');

analytics = {};

$(function () {
    analytics.init = (audio_player, configuration) => {
        let identity;
        const createIdentity = (callback) => {
            $.get('https://www.random.org/integers/?num=5&min=0&max=1000000000&col=1&base=10&format=plain&rnd=new')
                .then(body => body.replace(/\s+$/g, '').replace(/\s+/g, '-'))
                .then(id => identity = id)
                .then(() => chrome.storage.local.set({identity: identity}))
                .then(callback);
        };

        const initGA = () => {
            const manifest = chrome.runtime.getManifest();
            const initTracker = function (tracker) {
                tracker.set({
                    appId: chrome.runtime.id,
                    appName: manifest.name,
                    appVersion: manifest.version,
                    page: '/mediaplayer.html',
                    userId: identity,
                    dimension1: identity
                });
                tracker.send('pageview');
                $('.modal').on('shown.bs.modal', function () {
                    if (this.id !== 'loading_modal')
                        tracker.send('event', 'Modal', this.id);
                });
                chrome.runtime.onMessage.addListener(function (msg) {
                    let action;
                    switch (msg.text || '') {
                        case 'set_as_playlist':
                            action = 'Set';
                        //NO BREAK
                        case 'add_to_playlist':
                            action = action || 'Add';
                            tracker.send('event', {
                                'eventCategory': 'Playlist',
                                'eventAction': action,
                                'eventValue': msg.playlist.length
                            });
                            break;
                    }
                });
                let timeout = null;
                audio_player.bind('durationchange', function () {
                    if (timeout)
                        clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        const track = $('.track.playing');
                        const meta = ml.searchTrackByUrl(track.data('url'));
                        if (meta) {
                            tracker.send('event', {
                                'eventCategory': 'Player',
                                'eventAction': 'Play',
                                'eventLabel': meta.artist + ' - ' + meta.title
                            });
                        }
                        timeout = null;
                    }, 5000);
                });
                audio_player.bind('ended', function () {
                    const track = $('.track.playing');
                    const meta = ml.searchTrackByUrl(track.data('url'));
                    if (meta)
                        tracker.send('event', {
                            'eventCategory': 'Player',
                            'eventAction': 'Ended',
                            'eventLabel': meta.artist + ' - ' + meta.title
                        });
                });
                $('#dynamic_track_search_query').on('keydown', e => {
                    let code = e.keyCode || e.which;
                    if (+code === 13) {
                        tracker.send('event', {
                            'eventCategory': 'DTS',
                            'eventAction': 'Search',
                            'eventLabel': $('#dynamic_track_search_query').val()
                        });
                    }
                });
                let $dts_results = $('#dynamic_track_results');
                $dts_results.on('click', '.toggle-collapse', e => {
                    let $this = $(e.target);
                    if ($this.hasClass('collapsed')) {
                        tracker.send('event', {
                            'eventCategory': 'DTS',
                            'eventAction': 'Analyse',
                            'eventLabel': $this.text()
                        });
                    }
                });
                $dts_results.on('click', '.add-to-playlist, .set-as-playlist', e => {
                    let $this = $(e.target);
                    let $panel = $this.closest('.panel');
                    tracker.send('event', {
                        'eventCategory': 'DTS',
                        'eventAction': $this.data('action'),
                        'eventLabel': $panel.find('.toggle-collapse').text(),
                        'eventValue': $panel.find('.file-list').find('tr').length
                    });
                });
            };
            setTimeout(() => {
                if (configuration.activeGA()) {
                    ga(initTracker);
                } else {
                    initTracker({set: console.log, send: console.log})
                }
            }, 200);
        };

        const initIdentity = (maybeIdentity) => {
            if (maybeIdentity) {
                identity = maybeIdentity;
                initGA();
            } else {
                createIdentity(initGA);
            }
        };

        chrome.storage.local.get('identity', function (items) {
            initIdentity(items.identity);
        });
    };
});
