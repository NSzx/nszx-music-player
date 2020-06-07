$(document).ready(function () {
    const ucfirst = str => str.charAt(0).toUpperCase() + str.substr(1);
    const trad = id => chrome.i18n.getMessage(id) || ucfirst(id).replace(/_/g, ' ');
    const mini_player = $('.mini-player')
    const thumbnail_container = mini_player.find('.thumbnail-container')
    Array.prototype.diff = function (a) {
        return this.filter(function (i) {
            return a.indexOf(i) < 0;
        });
    };

    const time = function (s) {
        const sec_num = parseInt(s, 10);
        const hours_num = Math.floor(sec_num / 3600);
        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        let seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        return (hours_num ? hours + ':' : '') + minutes + ':' + seconds;
    };

    $('.i18n').each((i, v) => {
        let elt = $(v);
        let str_trad = trad(elt.data('i18n'));
        if (elt.hasClass('i18n-title')) {
            elt.attr('title', str_trad);
        } else {
            elt.text(str_trad);
        }
    });

    let current_state = {};

    let $playlist = $('#playlist');
    const get_playlist_tracks = () => $playlist.find('li.track').get().map(li => $(li).data('url'));
    let playing = () => $playlist.find('.track.playing');

    const updatePopup = function (r) {
        r = r || {};
        let duration = +r.duration || 0;
        let progress = duration <= 0 ? '0%' : ((+r.current_time || 0) * 100 / duration) + '%';
        let loaded = duration <= 0 ? '0%' : ((+r.loaded || 0) * 100 / duration) + '%';
        current_state = r;
        $('#playlist_position').text('(' + (r.index || 0) + '/' + (r.total || 0) + ')');
        $('#currently_playing').attr('title', r.title || '').text((r.title || ''));
        $('#up_next').attr('title', r.next || '').text(trad('next') + ': ' + (r.next || ''));
        let $progressBar = $('#progress_bar');
        $progressBar.find('.target').text(time(duration));
        $progressBar.find('.evolution').text(time(r.current_time || 0)).animate({width: progress});
        $progressBar.find('.progress-container').css('background', 'linear-gradient(90deg, darkgrey ' + loaded + ', lightgrey ' + loaded + ')');
        if (!!r.thumbnail) {
            mini_player.addClass('with-thumbnail')
            thumbnail_container.removeClass('hidden')
        } else {
            mini_player.removeClass('with-thumbnail')
            thumbnail_container.addClass('hidden')
        }
        thumbnail_container.find('img').attr('src', r.thumbnail)
        if (current_state.tab_id != null) {
            $('.control[data-action="mute"]').removeClass('active inactive glyphicon-volume-up glyphicon-volume-off').addClass(current_state.controls.mute);
            $('.control[data-action="randomize"]').removeClass('active inactive').addClass(current_state.controls.randomize);
            $('.control[data-action="repeat"]').removeClass('active inactive').addClass(current_state.controls.repeat);
            let updated = current_state.playlist.map(t => t.url);
            let current = get_playlist_tracks();
            if (current_state.forced_update || current.diff(updated).length || updated.diff(current).length) {
                $playlist.html('');
                current_state.playlist.forEach(t =>
                    $playlist.append($("<li>")
                        .addClass('track')
                        .attr("data-url", t.url).attr("role", "button")
                        .append($('<span>')
                            .addClass('clickable toggle-favorite glyphicon glyphicon-heart' + (t.is_favorite ? '' : '-empty'))
                            .click((e) => {
                                chrome.runtime.sendMessage({
                                    text: 'control',
                                    action: 'like',
                                    url: t.url
                                }, updatePopup);
                                e.stopPropagation();
                                return false;
                            })
                        )
                        .append($('<span>')
                            .addClass('clickable glyphicon glyphicon-remove')
                            .click(() => chrome.runtime.sendMessage({
                                text: 'control',
                                action: 'remove_track',
                                url: t.url
                            }, updatePopup))
                        )
                        .append($('<span>').addClass('track-title').html(t.title))
                        .attr('title', t.title)
                        .click(() => chrome.runtime.sendMessage({
                            text: 'control',
                            action: 'select_track',
                            url: t.url
                        }, updatePopup)))
                );
            }
            playing().removeClass('playing');
            $playlist.find('.track[data-url="' + current_state.url + '"]').addClass('playing');
        }
    };

    const sendUpdateRequest = function () {
        chrome.runtime.sendMessage(
            {text: "update_request"},
            updatePopup
        );
    };
    setInterval(sendUpdateRequest, 1000);
    sendUpdateRequest();

    let playlist_to_send = [];
    $('#add_to_current_playlist').click(e => {
        chrome.runtime.sendMessage(
            {
                text: 'add_to_playlist',
                playlist: playlist_to_send,
                destination: $('#destination_playlist').val()
            }
        );
        $('#scan_results_choice').fadeOut();
    });
    $('#set_as_current_playlist').click(e => {
        chrome.runtime.sendMessage(
            {
                text: 'set_as_playlist',
                playlist: playlist_to_send,
                destination: $('#destination_playlist').val()
            }
        );
        $('#scan_results_choice').fadeOut();
    });


    $('#scan_results_choice').fadeOut();
    $('#scan_results').text(trad('loading'));
    setTimeout(function () {
        $('#scan_results').text(trad('loading'));
        chrome.runtime.sendMessage({text: 'ping'});
        const callback = (tabArray) => {
            if (current_state.tab_id == null) {
                $('#scan_results').text($('#scan_results').text().replace('....', '') + '.');
                setTimeout(() => callback(tabArray), 500);
                return;
            }
            let tab = tabArray[0];
            if (tab.id === current_state.tab_id) {
                $('#scan_results_container').fadeOut();
            } else {
                chrome.tabs.sendMessage(tab.id, {text: 'get_playlist'}, function (response) {
                    if (response) {
                        let new_songs = response.audio;
                        $('#scan_results').text(trad('scan_results').replace('_nb_', new_songs.length || 0));
                        if (new_songs.length > 0) {
                            playlist_to_send = response.audio;
                            $('#destination_playlist').html(current_state.available_playlists
                                .map(pl => '<option'
                                    + (pl.is_playing ? ' selected="selected"' : '')
                                    + ' value="' + pl.id + '"'
                                    + '>' + pl.name + '</option>').join(''));
                            $('#scan_results_choice').fadeIn();
                        }
                    } else {
                        $('#scan_results').text(trad('error_reload'));
                    }
                });
            }
        };
        chrome.tabs.query({currentWindow: true, active: true}, callback);
        chrome.runtime.sendMessage({text: "get_playlist"});
    }, 1000);

    chrome.runtime.onMessage.addListener(function (msg) {
        let span = $('#scan_current_page').find('span');
        span.removeClass(function (index, className) {
            return (className.match(/(^|\s)glyphicon-\S+/g) || []).join(' ');
        });
        span.removeClass('loading');
        span.addClass('glyphicon-search');
        if (msg.text === 'scan_result') {
            $('#scan_results').text(trad('scan_results').replace('_nb_', msg.nb_tracks));
            sendUpdateRequest();
        } else if (msg.text === "popup_error") {
            $('#scan_results').text(trad('error_reload'));
        }
    });

    $('.control').click(function () {
        chrome.runtime.sendMessage(
            {
                text: 'control',
                action: $(this).data('action')
            },
            updatePopup
        );
    });

    $('#progress_bar').find('.progress-container').click(function (e) {
        const offset = $(this).offset();
        const x = e.pageX - offset.left;
        let new_current_time = x * (current_state.duration || 0) / $(this).width();
        chrome.runtime.sendMessage(
            {
                text: 'control',
                action: 'current_time',
                current_time: new_current_time
            },
            updatePopup
        );
    });

});
