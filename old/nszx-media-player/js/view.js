view = {};

$(function () {
    view.init = function (utils) {
        document.title = utils.trad('extension_name');

        if(utils.getBrowser() !== "Chrome"){
            $('.chrome-only').remove();
        }

        if(utils.getBrowser() !== "Firefox"){
            $('.firefox-only').remove();
        }

        $('.i18n').each((i, v) => {
            let elt = $(v);
            let str_trad = utils.trad(elt.data('i18n'));
            if (elt.hasClass('i18n-title')) {
                elt.attr('title', str_trad);
                elt.tooltip();
            } else {
                elt.text(str_trad);
            }
        });
        $('[data-toggle="tooltip"]').tooltip();

        const manifest = chrome.runtime.getManifest();
        $('.version').text('v' + manifest.version);
        $('.contact').attr('href', 'mailto:' + manifest.author);

        const $player_container = $('#player_container');
        const $pills = $('#playlists_container_tabs');
        const $footer = $('footer');
        const $resizable_content = $('#resizable_content');
        const resizeContent = function () {
            let new_height = $(window).innerHeight()
                - $player_container.outerHeight(true)
                - $footer.outerHeight(true)
                - $pills.outerHeight(true);
            $resizable_content.css('height', new_height + 'px');
            $resizable_content.css('max-height', new_height + 'px');
            $('.modal-body').css('max-height', (new_height + 70) + 'px');
            $('.modal-body').css('overflow-y', 'auto');
        };
        $(window).on('resize', resizeContent);
        resizeContent();

        $('.expandable-input-toggle').click(e => {
            let $container = $(e.target).closest('.expandable-input-container');
            if($container.hasClass('open')){
                $container.find('.expandable-input').blur();
            }else{
                $container.find('.expandable-input').focus();
            }
            $container.toggleClass('open', 400)
        });

        $pills.on('show.bs.tab','.playlist-tab', function (e) {
            let $out = $('li.active > .playlist-tab');
            let $panel_out = $($out.attr('href'));
            let index_out = $out.parent().index();
            let $in = $(e.target);
            let $panel_in = $($in.attr('href'));
            let index_in = $in.parent().index();
            $('.tab-pane').removeClass('animated slideOutRight slideInLeft slideOutLeft slideInRight');
            if(index_in < index_out) {
                $panel_out.addClass('animated slideOutRight');
                $panel_in.addClass('animated slideInLeft');
            } else {
                $panel_out.addClass('animated slideOutLeft');
                $panel_in.addClass('animated slideInRight');
            }
        })
    };

    view.displayMetas = (metas, container) => {
        container.find('.details').attr('data-id', metas.track_id);
        if (metas.lastfm_url)
            container.find('.title').html($('<a target="_blank">')
                .attr('href', metas.lastfm_url)
                .text(metas.title));
        else
            container.find('.title').text(metas.title);
        container.find('.artist').text(metas.artist);
        if (metas.thumbnail) {
            container.find('.thumbnail-container img')
                .attr('src', metas.thumbnail)
                .fadeIn();
            container.find('.thumbnail-container .gradient-background').fadeOut();
        } else {
            container.find('.thumbnail-container img')
                .attr('src', '')
                .fadeOut();
            container.find('.thumbnail-container .gradient-background').fadeIn();
        }
    };

    view.setPlayingTrackMetas = track => {
        let container = $('#player_container');
        let currently_playing_id = +container.find('.details').attr('data-id');
        if (+track.attr('data-id') !== currently_playing_id) {
            let url = track.data('url');
            container.find('.thumbnail-container .gradient-background').fadeIn();
            container.find('.thumbnail-container img').fadeOut(400, () => {
                document.title = track.attr('title');
                container.find('.title').text(track.attr('title'));
                container.find('.artist').text('');
                $('#edit_playing_metas').addClass('can-edit');

                utils.getTracksMeta(url, metas => {
                    track.attr('data-id', metas.track_id);
                    view.displayMetas(metas, container);
                });
            });
        }
    };
});
