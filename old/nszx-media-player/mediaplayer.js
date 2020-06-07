$(function () {
    let task = utils.addTask();
    const audio_player = $('#audio_player'),
        track_slider = $('#track_slider');
    const player = {
        elt: audio_player,
        is_ctrl_down: false,
        pause: () => {
            if (!audio_player[0].paused)
                audio_player[0].pause();
        },
        fastForward: d => audio_player.prop("currentTime", audio_player.prop("currentTime") + d),
        fastBackward: d => audio_player.prop("currentTime", audio_player.prop("currentTime") - d)
    };
    let my_tab_id = null;
    let randomized = false;

    setTimeout(() => {
        $.when(utils.init())
            .then(() => view.init(utils))
            .then(() => edit_metas.init(utils, view))
            .then(() => contextmenu.init(edit_metas, playlist))
            .then(() => playlist.init(utils, player, contextmenu, share_playlist))
            .then(() => playlist_downloader.init(utils, playlist))
            .then(() => manually_add_track.init(utils, playlist))
            .then(() => configuration.init(utils, colorpicker))
            .then(() => {
                help_modal.init();
                gradient_background.init();
                analytics.init(audio_player, configuration);
            })
            .then(() => init());
    }, 300);

    const init = () => {

        player.play = () => {
            setTimeout(() => {
                let playing = playlist.playingTrack();
                if (!playing.length)
                    playlist.next();
                else if (audio_player[0].paused)
                    audio_player[0].play();
            }, 200);
        };

        audio_player.bind('play', function () {
            const track = $('.track.playing');
            if (track.length) {
                view.setPlayingTrackMetas(track);
            }
            $('#toggle_play_pause').removeClass('glyphicon-play').addClass('glyphicon-pause');
        });

        audio_player.bind('pause', function () {
            document.title = utils.trad('extension_name');
            $('#toggle_play_pause').removeClass('glyphicon-pause').addClass('glyphicon-play');
        });

        audio_player.bind('ended', function () {
            setTimeout(() => {
                if (!autoplay()) {
                    document.title = utils.trad('extension_name');
                    return;
                }

                if ($('#repeat').hasClass('one'))
                    playlist.selectTrack(playlist.playingTrack().removeClass('playing'));
                else
                    playlist.next();
            }, 500);
        });

        audio_player.bind('error', function () {
            if (audio_player.prop('currentTime') > 0) {
                player.pause();
                audio_player.trigger('ended');
            } else {
                let e = audio_player[0].error;
                const messages = ['MEDIA_ERR_ABORTED', 'MEDIA_ERR_DECODE', 'MEDIA_ERR_NETWORK', 'MEDIA_ERR_SRC_NOT_SUPPORTED'];
                let message = utils.trad('an_error_occurred') + ' (' + messages[e.code - 1] + ')';
                if (!playlist.playingTrack().hasClass('failed'))
                    playlist.playingTrack()
                        .addClass('failed')
                        .append($('<span data-placement="left" data-toggle="tooltip">')
                            .addClass("pull-right glyphicon glyphicon-exclamation-sign error-tooltip")
                            .attr('title', message).tooltip());
            }
        });

        (function () {
            let updatable = true;
            track_slider.on('mousedown', e => {
                updatable = false;
            });
            track_slider.on('mouseup', e => {
                updatable = true;
            });
            track_slider.on('keydown', e => (e.keyCode || e.which) == 9 || e.preventDefault());
            track_slider.change(e => audio_player.prop('currentTime', track_slider.val() / 10));
            const updateTime = () => {
                let d = audio_player.prop('duration');
                let t = audio_player.prop('currentTime');
                let l;
                try {
                    l = audio_player[0].buffered.end(audio_player[0].buffered.length - 1);
                } catch (e) {
                    l = 0;
                }
                let played = d ? Math.floor(t * 1000 / d) / 10 : 0;
                let loaded = d ? Math.floor(l * 1000 / d) / 10 : 0;
                $("#time_display").text(utils.time(t) + ' / ' + utils.time(d));
                if (updatable) {
                    track_slider.attr('max', d * 10);
                    track_slider.val(t * 10);
                }
                track_slider.css('background', 'linear-gradient(90deg, var(--controls-color-active) ' + played + '%, var(--controls-color-hover) ' + played + '%, var(--controls-color-hover) ' + loaded + '%, var(--controls-color-inactive) ' + loaded + '%)');
            };
            audio_player.on('durationchange', updateTime);
            audio_player.on('timeupdate', updateTime);
        })();

        (function () {
            let volume_slider = $('#volume_slider');
            let $mute = $('#mute');

            volume_slider.on('keydown', e => (e.keyCode == 37 || e.keyCode == 39) ? e.stopPropagation() : true);
            volume_slider.on('input', e => {
                let v = volume_slider.val();
                if (v > 0) audio_player.prop('muted', false);
                else audio_player.prop('muted', true);
                audio_player.prop('volume', v / 100);
            });
            const updateVolume = () => {
                let v = audio_player.prop('muted') ? 0 : audio_player.prop('volume') * 100;
                volume_slider.val(v);
                volume_slider.css('background', 'linear-gradient(90deg, var(--controls-color) ' + v + '%, var(--controls-color-hover) ' + v + '%)');
                $mute.removeClass('glyphicon-volume-up glyphicon-volume-off');
                $mute.addClass(audio_player.prop('muted') ? 'glyphicon-volume-off' : 'glyphicon-volume-up');
            };
            $mute.on('click', e => {
                $mute.toggleClass('glyphicon-volume-up glyphicon-volume-off');
                audio_player.prop('muted', $mute.hasClass('glyphicon-volume-off'));
            });
            audio_player.on('volumechange', updateVolume);
            updateVolume();

            if (utils.getBrowser() === "Chrome" && chrome.runtime.id !== 'iinlmmcaihpbbpcgmfppbempfbiahmna') audio_player.prop('volume', .01);
        })();

        $('#toggle_play_pause').on('click', e => $(e.target).hasClass('glyphicon-play') ? player.play() : player.pause());

        $('#next').on('click', () => playlist.next());

        $('#previous').on('click', () => playlist.prev());

        $('#randomize').on('click', function () {
            $(this).toggleClass('active inactive');
            randomized = $(this).hasClass('active');
            if (randomized) {
                $(this).attr('title', utils.trad('random_activated'));
            } else {
                $(this).attr('title', utils.trad('random_deactivated'));
                playlist.recently_played = [];
            }
            $(this).tooltip('fixTitle')
                .tooltip('show');
        });

        $('#repeat').on('click', function () {
            let next_class;
            let style_class = '';
            if ($(this).hasClass('all')) {
                next_class = 'none';
                style_class = 'inactive';
            } else if ($(this).hasClass('none')) {
                next_class = 'one';
                style_class = 'active';
            } else {
                next_class = 'all';
            }
            $(this).removeClass('one all none active inactive');
            $(this).addClass(next_class);
            $(this).addClass(style_class);
            $(this).attr('title', utils.trad('repeat') + ': ' + utils.trad(next_class));
            $(this).tooltip('fixTitle')
                .tooltip('show');
        });

        const autoplay = () => true;

        $('label.switch').keydown(e => {
            let code = e.keyCode || e.which;
            if (code == 13) {
                e.stopPropagation();
                $(this).find('input').click();
                return false;
            }
        });

        $('#audio_player_panel').on('keydown', e => {
            let code = e.keyCode || e.which;
            switch (code) {
                case 93: // Win: Win key; Mac: L-cmd
                case 91: // Win: Win menu; Mac: R-cmd
                case 17: // CTRL
                    player.is_ctrl_down = true;
                    break;
                case 32: //SPACE
                    e.preventDefault();
                    if (audio_player.prop("paused")) {
                        player.play();
                    } else {
                        player.pause();
                    }
                    break;
                case 38: //UP
                    playlist.last().focus();
                    break;
                case 40: //DOWN
                    playlist.first().focus();
                    break;
                case 37: //LEFT
                    if (player.is_ctrl_down)
                        $('#previous').click();
                    else
                        player.fastForward(10);
                    break;
                case 39: //RIGHT
                    if (player.is_ctrl_down)
                        $('#next').click();
                    else
                        player.fastBackward(10);
                    break;
            }
        });

        $('#audio_player_panel').on('keyup', e => {
            let code = e.keyCode || e.which;
            switch (code) {
                case 93: // Win: Win key; Mac: L-cmd
                case 91: // Win: Win menu; Mac: R-cmd
                case 17: // CTRL
                    player.is_ctrl_down = false;
                    break;
            }
        });

        chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
            let forced_update = false;
            switch (msg.text || '') {
                case 'ping':
                    sendResponse({
                        text: 'nszx_pong',
                        tab_id: my_tab_id
                    });
                    break;
                case 'create_playlist':
                    playlist.newCustomPlaylist(msg.tracks, msg.name)
                    break
                case 'set_as_playlist':
                    playlist.empty(msg.destination);
                // no break
                case 'add_to_playlist':
                    playlist.addTracks(msg.playlist || [], msg.destination);
                    break;
                case 'control':
                    switch (msg.action) {
                        case 'current_time':
                            audio_player.prop("currentTime", msg.current_time);
                            break;
                        case 'playPause':
                            $('#toggle_play_pause').click();
                            break;
                        case 'play':
                            player.play();
                            break;
                        case 'pause':
                        case 'stop':
                            player.pause();
                            break;
                        case 'prev':
                            $('#previous').click();
                            break;
                        case 'remove_track':
                            playlist.playing().find('.track[data-url="' + msg.url + '"] .glyphicon-remove').click();
                            break;
                        case 'select_track':
                            playlist.playing().find('.track[data-url="' + msg.url + '"]').click();
                            break;
                        case 'like':
                            playlist.getTrack(null, msg.url).find('.toggle-favorite').click();
                            forced_update = true;
                            break;
                        case 'switchPlaylist':
                            playlist.playNextPlaylist();
                            break;
                        default:
                            $('#' + msg.action).click();
                    }
                    console.log(msg);
                    if (msg.action.match(/ff\d+/))
                        player.fastForward(+msg.action.replace(/[^0-9]+/g, ''));
                    else if (msg.action.match(/fb\d+/))
                        player.fastBackward(+msg.action.replace(/[^0-9]+/g, ''));
                // no break
                case "update_request":
                    let current_track = playlist.playingTrack();
                    let tracks = current_track.closest('.playlist').find('li.track');
                    let list = tracks.get().map(t => {
                        t = $(t);
                        return {
                            url: t.data('url'),
                            title: t.attr('title'),
                            is_playing: t.hasClass('playing'),
                            is_favorite: t.find('.toggle-favorite').hasClass('glyphicon-heart')
                        }
                    });
                    let loaded;
                    try {
                        loaded = audio_player[0].buffered.end(audio_player[0].buffered.length - 1);
                    } catch (e) {
                        loaded = 0;
                    }
                    sendResponse({
                        tab_id: my_tab_id,
                        forced_update: forced_update,
                        index: current_track.length ? tracks.index(current_track) + 1 : 0,
                        total: tracks.length,
                        url: current_track.data('url'),
                        title: current_track.length ? current_track.attr('title') : '',
                        thumbnail: $('#currently_playing .thumbnail-container img').attr('src'),
                        next: current_track.length ? (randomized ? '?' : playlist.getNextTrack().attr('title') || '') : '',
                        current_time: audio_player.prop("currentTime"),
                        duration: audio_player.prop("duration"),
                        loaded: loaded,
                        controls: {
                            mute: $('#mute').hasClass('glyphicon-volume-off') ? 'inactive glyphicon-volume-off' : ' glyphicon-volume-up',
                            randomize: $('#randomize').hasClass('inactive') ? 'inactive' : 'active',
                            repeat: $('#repeat').hasClass('inactive') ? 'inactive' : $('#repeat').hasClass('active') ? 'active' : '',
                        },
                        available_playlists: playlist.getAvailablePlaylists(),
                        playlist: list
                    });
                    break;
            }
        });

        $('#edit_playing_metas').click(e => edit_metas.editFor(playlist.playingTrack().data('url')));


        setTimeout(() => task.done = true, 1000);
    };


});
