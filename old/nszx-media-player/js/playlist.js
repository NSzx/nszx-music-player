playlist = {
    recently_played: [],
    main_playlist: [],
    favorite_tracks: [],
    custom_playlists: {}
}

$(function () {
    const volume_icon = '🔊'
    const $favorite_tracks = $('#favorite_tracks')
    const $pills_container = $('#playlists_container_tabs')
    let next_custom_id = 0
    playlist.container = $('#playlist_container')
    $('ul.playlist').sortable({axis: 'y'})

    const saveState = () => {
        let tracks = [...playlist.main_playlist, ...playlist.favorite_tracks]
        Object.values(playlist.custom_playlists)
            .filter(pl => pl != null)
            .forEach(pl => {
                tracks.push(...pl.tracks)
            })
        ml.filterLibrary(tracks)
        chrome.storage.local.set({
            playlists: {
                main_playlist: playlist.main_playlist,
                favorite_tracks: playlist.favorite_tracks,
                custom_playlists: playlist.custom_playlists
            }
        })
    }
    const savePlaylist = playlist_id => {
        let tracks = playlist.getPlayingTracksAsList(playlist_id)
        let pill = $('[data-playlist-id="' + playlist_id + '"]')
        pill.find('.tracks-count').remove()
        if (playlist_id === 'main_playlist' || playlist_id === 'favorite_tracks')
            playlist[playlist_id] = tracks
        else {
            playlist.custom_playlists[playlist_id].name = $(`a[href="#${playlist_id}_panel"]`).text()
            playlist.custom_playlists[playlist_id].tracks = tracks
        }
        if (pill.attr('contenteditable') !== 'true')
            pill.append('<span class="badge tracks-count">' + tracks.length + '</span>')
        if (playlist_id === 'favorite_tracks') {
            playlist.container.find('li.track .glyphicon-heart')
                .removeClass('glyphicon-heart').addClass('glyphicon-heart-empty')
            playlist.getPlayingTracksAsList('favorite_tracks')
                .forEach(url => {
                    setTimeout(() => playlist.container.find('li.track[data-url="' + url + '"] .glyphicon-heart-empty')
                        .removeClass('glyphicon-heart-empty').addClass('glyphicon-heart'), 10)
                })
        }
        saveState()
    }

    const observeChangesFor = playlist_id => {
        let targetNode = document.getElementById(playlist_id)
        let timeout = null
        let observer = new MutationObserver(() => {
            if (timeout != null)
                clearTimeout(timeout)
            timeout = setTimeout(() => {
                timeout = null
                savePlaylist(playlist_id)
            }, 1000)
        })
        observer.observe(targetNode, {childList: true})
    }

    const initCustomPlaylist = playlist_id => {
        $('#' + playlist_id + '_panel').html('')
            .append($('<ul class="playlist">').attr('id', playlist_id))
        $('#' + playlist_id).sortable()
        let tracks = playlist.custom_playlists[playlist_id].tracks || []
        observeChangesFor(playlist_id)
        playlist.addTracks(tracks, playlist_id, true)
    }

    const displayCustomPlaylist = playlist_id => {
        $pills_container.append($('<li role="presentation">')
            .append($('<a class="custom-playlist-tab playlist-tab" role="tab" data-toggle="pill">')
                .attr('href', `#${playlist_id}_panel`)
                .attr('aria-controls', `${playlist_id}_panel`)
                .attr('data-playlist-id', playlist_id)
                .attr('contenteditable', 'false')
                .text(playlist.custom_playlists[playlist_id].name)
                .on('keydown', e => {
                    let $this = $(e.target)
                    let code = +(e.keyCode || e.which)
                    let in_edition = $this.attr('contenteditable') === 'true'
                    if (code === 13 && in_edition) {
                        e.preventDefault()
                        $this.attr('contenteditable', 'false')
                        savePlaylist(playlist_id)
                        return false
                    }
                    if (in_edition && [32, 37, 38, 39, 40].indexOf(code) >= 0)
                        e.stopPropagation()
                })
                .blur(e => {
                    let $this = $(e.target)
                    if ($this.attr('contenteditable') === 'true') {
                        $this.attr('contenteditable', 'false')
                        savePlaylist(playlist_id)
                    }
                })
                .click(e => $(e.target).attr('contenteditable') !== 'true')))
        playlist.container.append($('<div role="tabpanel" class="tab-pane fade">')
            .attr('id', `${playlist_id}_panel`))
        initCustomPlaylist(playlist_id)
    }
    playlist.init = function (utils, player, contextmenu, share_playlist) {
        const no_tracks = '<li>' + utils.trad('no_tracks') + '</li>'
        playlist.empty = playlist_id => playlist.get(playlist_id).html(no_tracks).removeClass('playing')

        playlist.selectTrack = function (track, play) {
            track.focus()
            if (track.hasClass('playing')) {
                return false
            }

            player.pause()
            player.elt.prop('currentTime', 0)

            let url = track.data('url')
            player.elt.attr('src', url)
            player.elt.trigger('load')
            if (url !== utils.lastIn(playlist.recently_played))
                playlist.recently_played.push(url)

            playlist.playingTrack().removeClass('playing')
            track.addClass('playing')
            let $playlist = track.closest('.playlist')
            $('.playlist-tab, .playlist').removeClass('playing')
            $('.playlist-tab[href="#' + $playlist.attr('id') + '_panel"]').addClass('playing')
            $playlist.addClass('playing')

            let playlist_id = track.closest('.playlist').attr('id')
            chrome.storage.local.set({playing_track: {playlist_id: playlist_id, url: url}})

            if (play == null || play)
                player.play()
        }
        playlist.container.on('click', 'li.track', e => {
            let track = $(e.target).hasClass('track') ? $(e.target) : $(e.target).closest('.track')
            playlist.selectTrack(track)
            player.play()
        })

        playlist.addTrack = function (url, playlist_id) {
            let $playlist = playlist.get(playlist_id)
            if (!$playlist.length || $playlist.find('li.track[data-url="' + url + '"]').length) return

            const is_favorite = playlist.favorite_tracks.indexOf(url) >= 0
            const filename = utils.getFilenameFromUrl(url)
            const title = utils.getTitleFromUrl(url)
            let track = $('<li>')
                .addClass('track').attr('data-url', url).attr('role', 'button').attr('tabindex', '0')
                .append($('<span>').addClass('grabbable glyphicon glyphicon-option-vertical'))
                .append($('<a>')
                    .addClass('direct-link')
                    .click(e => e.stopPropagation())
                    .attr('href', url).attr('tabindex', '-1').attr('target', '_blank')
                    .attr('title', filename).attr('data-placement', 'left')
                    .tooltip()
                    .append($('<span>').addClass('glyphicon glyphicon-link'))
                )
                .append(playlist_id === 'favorite_tracks' ? '' :
                    $('<span>')
                        .addClass('clickable toggle-favorite glyphicon glyphicon-heart' + (is_favorite ? '' : '-empty')))
                .append($('<span>').addClass('clickable glyphicon glyphicon-remove'))
                .append($('<span>').addClass('track-title').html(title))
                .attr('title', title)

            if ($playlist.find('.track').length === 0) {
                $playlist.html('')
            }
            $playlist.append(track)

            utils.getTracksMeta(url, metas => {
                let label = metas.artist ? metas.artist + ' - ' + metas.title : metas.title
                track.find('.track-title').text(label)
                track.attr('title', label)
                    .attr('data-artist', metas.artist || '')
                    .attr('data-title', metas.title)
            })
        }
        playlist.addTracks = (tracks, playlist_id, override_confirm) => {
            let task
            let callback = () => {
                let pl = playlist.get(playlist_id)
                utils.highlight($('.playlist-tab[data-playlist-id="' + pl.attr('id') + '"]').parent())
            }
            if (tracks.length > 700) {
                if (!override_confirm) {
                    chrome.tabs.update(utils.my_tab_id, {active: true})
                    if (!confirm(utils.trad('confirm_add_many_tracks').replace('_nb_', tracks.length))) return
                }
                let step = 500
                let max = tracks.length
                let timeout = null
                task = utils.addTask()
                task.callback = callback
                let cancel = $('<button class="btn btn-danger">').text(utils.trad('cancel')).click(e => {
                    clearTimeout(timeout)
                    cancel.remove()
                    task.done = true
                })
                $('#loading_modal').find('.modal-body').append(cancel)
                let rec = (start) => {
                    timeout = setTimeout(() => {
                        if (start + step <= max) {
                            rec(start + step)
                        }
                        tracks.slice(start, start + step).forEach(url => playlist.addTrack(url, playlist_id))
                        if (start + step > max) {
                            cancel.remove()
                            task.done = true
                        }
                    }, 200)
                }
                rec(0)
            } else if (tracks.length > 0) {
                if (tracks.length > 500) {
                    task = utils.addTask()
                    task.callback = callback
                }
                tracks.forEach(url => playlist.addTrack(url, playlist_id))
                if (task) task.done = true
            } else {
                playlist.empty(playlist_id)
            }
            if (!task) callback()
        }

        playlist.sort = (playlist_id, sort_by) => {
            let $playlist = playlist.get(playlist_id)
            let tracks = $playlist.find('li.track').get()
            if ($playlist.attr('data-sorted-by') !== sort_by + '_ASC') {
                tracks.sort((a, b) => ($(a).attr('data-' + sort_by) || '').localeCompare($(b).attr('data-' + sort_by) || ''))
                $playlist.attr('data-sorted-by', sort_by + '_ASC')
            } else {
                tracks.sort((a, b) => ($(b).attr('data-' + sort_by) || '').localeCompare($(a).attr('data-' + sort_by) || ''))
                $playlist.attr('data-sorted-by', sort_by + '_DESC')
            }
            $playlist.append(tracks)
        }

        chrome.storage.local.get(['current_playlist', 'saved_playlists', 'playlists', 'playing_track'], items => {
            let results = items.playlists || {}
            if (items.current_playlist) {
                playlist.main_playlist = items.current_playlist || []
                chrome.storage.local.set({current_playlist: false})
            } else
                playlist.main_playlist = results.main_playlist || []
            playlist.favorite_tracks = results.favorite_tracks || []
            let tmp = results.custom_playlists || {}
            playlist.custom_playlists = {}
            Object.keys(tmp).forEach(key => {
                if (tmp[key] && tmp[key].name != null) {
                    let n = +key.replace(/[^0-9]/g, '')
                    next_custom_id = n > next_custom_id ? n : next_custom_id
                    playlist.custom_playlists[key] = tmp[key]
                }
            })
            if (items.saved_playlists) {
                items.saved_playlists.forEach(pl => playlist.custom_playlists['custom_playlist_' + ('' + (++next_custom_id)).padStart(6, '0')] = pl)
                chrome.storage.local.set({saved_playlists: false})
            }
            let task = utils.addTask()
            observeChangesFor('main_playlist')
            observeChangesFor('favorite_tracks')
            playlist.addTracks(playlist.main_playlist, 'main_playlist', true)
            playlist.addTracks(playlist.favorite_tracks, 'favorite_tracks', true)
            Object.keys(playlist.custom_playlists).forEach(function (playlist_id) {
                displayCustomPlaylist(playlist_id)
            })
            if (items.playing_track && items.playing_track.url) {
                let t = items.playing_track
                let track = playlist.getTrack(t.playlist_id, t.url)
                playlist.selectTrack(track, false)
                $pills_container.find('a[data-playlist-id="' + t.playlist_id + '"]').click()
                setTimeout(() => track.focus(), 400)
            }
            task.done = true
        })

        playlist.newCustomPlaylist = (tracks, name) => {
            let playlist_id = 'custom_playlist_' + ('' + (++next_custom_id)).padStart(6, '0')
            playlist.custom_playlists[playlist_id] = {
                id: playlist_id,
                name: name || utils.trad('new_playlist'),
                tracks: tracks || []
            }
            displayCustomPlaylist(playlist_id)
            setTimeout(() => utils.editElement($pills_container.find('.custom-playlist-tab').last()), 300)
        }

        $('#add_custom_playlist').click(() => {
            playlist.newCustomPlaylist()
        })

        playlist.remove = playlist_id => {
            if (playlist.custom_playlists[playlist_id]
                && confirm(utils.trad('delete_playlist_confirm') + ' [' + playlist.custom_playlists[playlist_id].name + ']')) {
                let pill = $('a[href="#' + playlist_id + '_panel"]').closest('li')
                if (pill.hasClass('active')) $pills_container.find('.playlist-tab:eq(0)').tab('show')
                pill.remove()
                setTimeout(() => $('#' + playlist_id + '_panel').remove(), 1000)
                playlist.custom_playlists[playlist_id] = null
                saveState()
            }
        }

        playlist.share = playlist_id => {
            let availablePlaylists = {}
            playlist.getAvailablePlaylists(false)
                .map(p => ({
                    ...p,
                    tracks: playlist[p.id] != null ? playlist[p.id] : playlist.custom_playlists[p.id].tracks
                })).forEach(p => availablePlaylists[p.id] = p)
            share_playlist.openFor(playlist_id, availablePlaylists)
        }

        playlist.getAvailablePlaylists = (showPlaying) => $pills_container.find('.playlist-tab').get().map(tab => {
            let doShowPlaying = showPlaying == null ? true : showPlaying
            let $tab = $(tab)
            let playlist_id = $tab.data('playlist-id')
            let name = $tab.data('i18n') ? utils.trad($tab.data('i18n')) : playlist.custom_playlists[playlist_id].name
            let is_playing = $tab.hasClass('playing')
            let is_active = $tab.parent().hasClass('active')
            if (is_playing && doShowPlaying) name += ' ' + volume_icon
            return {
                is_playing: is_playing,
                is_active: is_active,
                id: playlist_id,
                name: name
            }
        })

        playlist.getPlaylistSelector = (select_id, select_active) => {
            let $select = $('<select>').attr('id', select_id).attr('name', select_id)
            playlist.getAvailablePlaylists().forEach(pl => {
                $select.append($('<option '
                    + ((select_active && pl.is_active) || (!select_active && pl.is_playing) ?
                        'selected="selected"' : '') + '>')
                    .attr('value', pl.id).text(pl.name))
            })
            return $select
        }

        playlist.container.on('keydown', 'li.track', e => {
            let code = e.keyCode || e.which
            switch (code) {
                case 13: //ENTER
                    $(e.target).click()
                    break
                case 38: //UP
                    let prev = $(e.target).prev('li.track')
                    if (player.is_ctrl_down) {
                        prev.insertAfter(e.target)
                    } else {
                        prev.focus()
                    }
                    return false
                case 40: //DOWN
                    let next = $(e.target).next('li.track')
                    if (player.is_ctrl_down) {
                        next.insertBefore(e.target)
                    } else {
                        next.focus()
                    }
                    return false
            }
        })

        playlist.container.on('click', '.glyphicon-remove', function () {
            let $playlist = $(this).closest('.playlist')
            $(this).parent().remove()
            if ($playlist.find('li.track').length === 0) {
                playlist.empty($playlist.attr('id'))
            }
            return false
        })

        playlist.container.on('click', '.toggle-favorite', function () {
            const url = $(this).parent().data('url')
            let maybe_favorite = $favorite_tracks.find('li.track[data-url="' + url + '"]')

            if (maybe_favorite.length) {
                maybe_favorite.find('.glyphicon-remove').click()
            } else {
                playlist.addTracks([url], 'favorite_tracks')
            }
            $(this).toggleClass('glyphicon-heart glyphicon-heart-empty')

            return false
        })


        playlist.container.on('contextmenu', 'li.track', e => {
            let $t = $(e.target)
            if ($t.hasClass('track') || $t.hasClass('track-title')) {
                e.preventDefault()
                contextmenu.openFor($t.closest('li.track'), e)
                return false
            }
        })
        $pills_container.on('contextmenu', 'a.playlist-tab', e => {
            let $t = $(e.target).closest('a')
            e.preventDefault()
            contextmenu.openFor($t, e)
            return false
        })

        playlist.next = () => playlist.getNextTrack().click()
        playlist.prev = function () {
            let last_played = playlist.recently_played.pop()
            if (last_played) {
                let last_played_track = playlist.playing().find('li.track[data-url="' + last_played + '"]')
                if (last_played_track.length) {
                    if (last_played_track.hasClass('playing')) {
                        player.elt.prop('currentTime', 0)
                        player.play()
                    } else if (last_played_track.hasClass('failed'))
                        playlist.prev()
                    else
                        last_played_track.click()
                    return
                }
            }

            let prev_track = playlist.playingTrack().prev('li.track:not(.failed)')

            if (prev_track.length === 0 && $('#repeat').hasClass('all')) {
                prev_track = playlist.last(null, true)
            }

            prev_track.click()
        }
    }

    playlist.getNextTrack = function () {
        let next_track

        if ($('#randomize').hasClass('active')) {
            let possible_next_tracks =
                playlist.getPlayingTracksAsList(null, true)
                    .diff(playlist.recently_played)
            if (possible_next_tracks.length)
                next_track = playlist.playing().find('li.track[data-url="' + possible_next_tracks.random() + '"]')
            else {
                playlist.recently_played = []
                next_track = $('#repeat').hasClass('all') ?
                    playlist.playing().find('li.track:not(.failed):not(.playing)').random() :
                    playlist.playingTrack().length ? $('#does_not_exist') : playlist.first()
            }
        } else {
            let playing = playlist.playingTrack()
            next_track = playing.length ? playing.next('li.track:not(.failed)') : playlist.first(null, true)
            if (next_track.length === 0 && $('#repeat').hasClass('all'))
                next_track = playlist.first(null, true)
        }

        return next_track
    }
    playlist.active = () => $('#' + $pills_container.find('li.active').find('.playlist-tab').data('playlist-id'))
    playlist.playing = () => $('.playlist.playing').length ? $('.playlist.playing') : playlist.active()
    playlist.get = playlist_id => playlist_id ? $('#' + playlist_id) : playlist.active()
    playlist.getOrPlaying = playlist_id => playlist_id ? $('#' + playlist_id) : playlist.playing()

    playlist.getPlayingTracksAsList = (playlist_id, filter_failed) =>
        playlist.getOrPlaying(playlist_id).find('li.track')
            .filter(filter_failed ? ':not(.failed)' : '.track')
            .get().map(li => $(li).data('url'))

    playlist.getTrack = (playlist_id, url) => playlist.getOrPlaying(playlist_id)
        .find('.track[data-url="' + url + '"]')
    playlist.playingTrack = () => playlist.container.find('li.track.playing')

    playlist.first = (playlist_id, filter_failed) => playlist.getOrPlaying(playlist_id)
        .find('li.track' + (filter_failed ? ':not(.failed)' : '')).first()
    playlist.last = (playlist_id, filter_failed) => playlist.getOrPlaying(playlist_id)
        .find('li.track' + (filter_failed ? ':not(.failed)' : '')).last()

    playlist.playNextPlaylist = () => {
        let playing = playlist.playing().closest('.tab-pane')
        let maybe_next = playing.next()
        while (maybe_next.length && !maybe_next.find('.track').length)
            maybe_next = maybe_next.next()
        if (maybe_next.length)
            playlist.selectTrack(playlist.first(maybe_next.find('.playlist').attr('id')))
        else playlist.selectTrack(playlist.first('main_playlist'))
    }
})

