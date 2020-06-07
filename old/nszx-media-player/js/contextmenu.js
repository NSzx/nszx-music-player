contextmenu = {};

$(function () {
    let $container = $('#context_menus_container');
    let $all_cm = $container.find('.context-menu:not(.context-submenu)');
    let $track_cm = $('#track_context_menu');
    let $playlist_cm = $('#playlist_context_menu');
    let $custom_playlist_cm = $('#custom_playlist_context_menu');

    $container.click(e => $container.addClass('hidden'));
    $container.on('contextmenu', e => {
        $container.addClass('hidden');
        return false;
    });

    const placeCmAt = (cm, position) => {
        let x = position.x;
        let y = position.y;
        $all_cm.addClass('hidden');
        $container.removeClass('hidden');
        cm.removeClass('hidden');
        const w = cm.outerWidth();
        const h = cm.outerHeight();
        const max_x = $('body').innerWidth();
        const max_y = $('body').innerHeight();
        if (x + w > max_x) x -= w;
        if (y + h > max_y) y -= h;
        cm.css('left', x).css('top', y);

        cm.find('.context-submenu').get().forEach(div => {
            const $div = $(div);
            $div.removeClass('context-submenu');
            const $li = $div.parent();
            const parent_position = $li.offset();
            let sub_x = x + w;
            let sub_y = parent_position.top;
            const sub_w = $div.outerWidth();
            const sub_h = $div.outerHeight();
            if (sub_x + sub_w > max_x) sub_x -= (w + sub_w);
            if (sub_y + sub_h > max_y) sub_y -= (sub_h - $li.outerHeight());
            $div.css('left', sub_x).css('top', sub_y);
            $div.addClass('context-submenu');
        })
    };

    contextmenu.init = function (edit_metas, playlist) {

        const buildContextSubmenuPlaylists = (cm, playlist_id) => {
            cm.find('.context-submenu-playlists').html(playlist
                .getAvailablePlaylists().map(pl => pl.id === playlist_id ? ''
                    : '<li data-playlist-id="' + pl.id + '">' + pl.name + '</li>').join(''));
        };

        contextmenu.openFor = (element, event) => {
            if (element.hasClass('track')) {
                let $playlist = element.closest('.playlist');
                buildContextSubmenuPlaylists($track_cm, $playlist.attr('id'));
                $track_cm.find('.context-submenu-playlists')
                    .append('<hr><li data-playlist-id="new">' + utils.trad('new_playlist') + '</li>');
                placeCmAt($track_cm, {x: event.clientX, y: event.clientY});
                $track_cm.find('.edit-metas').off('click').click(e => edit_metas.editFor(element.data('url')));
                $track_cm.find('.move-track-up').off('click').click(e => element.remove().prependTo($playlist));
                $track_cm.find('.move-track-down').off('click').click(e => element.remove().appendTo($playlist));
                let addThisTrack = e => {
                    let target_playlist = $(e.target).data('playlist-id');
                    if (target_playlist === 'new') {
                        playlist.newCustomPlaylist([element.data('url')]);
                    } else if (target_playlist) {
                        playlist.addTracks([element.data('url')], target_playlist);
                    } else {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    return true;
                };
                $track_cm.find('.add-to-playlist').off('click').click(addThisTrack);
                $track_cm.find('.move-to-playlist').off('click').click(e => {
                    let ret_val = addThisTrack(e);
                    if (ret_val) element.fadeOut(() => element.remove());
                    return ret_val;
                });
            } else if (element.hasClass('playlist-tab')) {
                let playlist_id = element.data('playlist-id');
                let cm;
                if(element.hasClass('custom-playlist-tab')){
                    cm = $custom_playlist_cm;
                    cm.find('.rename-playlist').off('click').click(e => utils.editElement(element));
                    cm.find('.remove-playlist').off('click').click(e => playlist.remove(playlist_id));
                } else {
                    cm = $playlist_cm;
                }
                cm.find('.share-playlist').off('click').click(e => playlist.share(playlist_id))
                buildContextSubmenuPlaylists(cm, playlist_id);
                cm.find('.export-to').find('.context-submenu-playlists')
                    .append('<hr><li data-playlist-id="new">' + utils.trad('new_playlist') + '</li>');
                placeCmAt(cm, {x: event.clientX, y: event.clientY});
                cm.find('.empty-playlist').off('click').click(e => playlist.empty(playlist_id));
                cm.find('.export-to').off('click').click(e => {
                    let target_playlist = $(e.target).data('playlist-id');
                    if (target_playlist === 'new') {
                        playlist.newCustomPlaylist(playlist.getPlayingTracksAsList(playlist_id));
                    } else if (target_playlist) {
                        playlist.addTracks(playlist.getPlayingTracksAsList(playlist_id), target_playlist);
                    } else {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                });
                cm.find('.import-from').off('click').click(e => {
                    let target_playlist = $(e.target).data('playlist-id');
                    if (target_playlist) {
                        playlist.addTracks(playlist.getPlayingTracksAsList(target_playlist), playlist_id);
                    } else {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                });
                cm.find('.sort-by').off('click').click(e => {
                    let sort_by = $(e.target).data('sort-by');
                    if (sort_by) {
                        playlist.sort(playlist_id, sort_by);
                    } else {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                });
            }
        };
    };

});
