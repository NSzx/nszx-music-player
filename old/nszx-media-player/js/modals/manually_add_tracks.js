manually_add_track = {};

$(function () {
    manually_add_track.init = (utils, playlist) => {

        const result_message = $('#mat_results');
        const div_result = $('#mat_result_div');
        const query = $('#open_directories_query');
        const search_OD_button = $('#do_search_open_directories');

        const analyseWebpage = (page, url) =>
            $(page.replace(/ src="/gi, ' data-src="').replace(/ title="/gi, ' data-title="'))
                .find('a').get().map(a => a.href.replace('chrome-extension://' + chrome.runtime.id + '/', ''))
                .filter(href => !!href && href.match(/\.(mp3|ogg|opus|oga|flac|wav|aac|m4a)$/i))
                .map(href => {
                    if (href.match(/^\//)) {
                        return getLocation(url).origin + href;
                    } else if (href.match(/^https?:/i) || href.match(/^ftp:/i) || href.match(/^file:/i)) {
                        return href;
                    }
                    return url + (url.match(/\/$/) ? '' : '/') + href;
                })
                .filter((value, index, self) => self.indexOf(value) === index);

        function openInNewTab(url) {
            let win = window.open(url, '_blank');
            win.focus();
        }

        query.keydown(e => {
            let code = e.keyCode || e.which;
            if (code == 13) {
                e.preventDefault();
                e.stopPropagation();
                search_OD_button.click();
                return false;
            }
        });

        search_OD_button.click(e => {
            let template = "https://www.google.fr/search?q=__query__+%28mp3%7Cogg%7Copus%7Coga%7Cflac%7Cwav%7Caac%7Cm4a%29+intitle%3A\"index.of.%2F\"";
            openInNewTab(template.replace('__query__', encodeURIComponent(query.val() || '')));
            //$('.modal').modal('hide');
        });

        let $dts = $('#dynamic_track_search');
        let $dts_query_container = $('#dynamic_track_search_query_container');
        let $dts_query = $('#dynamic_track_search_query');
        let $dts_toggle = $dts_query_container.find('.search-toggle');
        let $dts_results = $('#dynamic_track_results');
        let $dts_loading = $dts.find('>.loading');
        let $dts_more_results = $dts.find('>.more-results');
        let $dts_template = $('#dynamic_track_result_template');

        $dts_query.on('focus', e => setTimeout(() => $dts_query_container.hasClass('open') || $dts_toggle.click(), 100));
        $dts_toggle.off('click').click(e => {
            let dts_classes = ['col-xs-1 col-md-1 col-lg-1', 'col-xs-6 col-md-4 col-lg-4'];
            let playlist_classes = ['col-xs-10 col-xs-offset-1 col-md-offset-2 col-lg-offset-3', 'col-xs-6 col-xs-offset-0 col-md-offset-0 col-lg-offset-1'];
            let add = 0, remove = 1;
            if ($dts_query_container.hasClass('open')) {
                $dts_results.html('');
                $dts_loading.addClass('hidden');
                $dts_more_results.addClass('hidden');
                $dts_query_container.animate({width: 25}, 200, e => {
                    $('#dynamic_track_search').switchClass(dts_classes[remove], dts_classes[add]);
                    $('#playlist_container').switchClass(playlist_classes[remove], playlist_classes[add]);
                });
                $dts_query.blur();
            } else {
                add = 1;
                remove = 0;
                $('#dynamic_track_search').switchClass(dts_classes[remove], dts_classes[add], e => {
                    $dts_query_container.animate({width: $dts_results.width()}, 200);
                });
                $('#playlist_container').switchClass(playlist_classes[remove], playlist_classes[add]);
                $dts_query.focus();
            }
            $dts_query_container.toggleClass('open');
            $dts_toggle.toggleClass('glyphicon-search glyphicon-remove');
        });
        $(window).resize(e => $dts_query_container.css({width: $dts_query_container.hasClass('open') ? $dts_results.width() : 25}));

        $dts.on('keydown', e => e.stopPropagation());

        let getPlaylist = function (url, onfulfilled, onFailure) {
            if (utils.getBrowser() === 'Chrome') {
                $.get(url)
                    .then(html => analyseWebpage(html, url))
                    .then(onfulfilled)
                    .fail(onFailure);
            } else {
                utils.openTabSendMessageDoThings(
                    url, {text: 'get_playlist'},
                    response => onfulfilled(response.audio),
                    () => {
                    },
                    onFailure
                );
            }
        };

        const displaySearchResults = (results, offset) => {
            $dts_loading.addClass('hidden');
            if (!results || !results.length) {
                $dts_results.append($('<p>').text(utils.trad('no_results')));
                $dts_more_results.addClass('hidden');
                return;
            }
            results.forEach((r, i) => {
                let $result = $($dts_template.html().replace(/\{index\}/g, i + offset));
                let $title = $result.find('.panel-title > a.toggle-collapse');
                $title
                    .text(r.label)
                    .click(e => {
                        let $body = $result.find('.panel-body');
                        let $message = $body.find('.message');
                        let $scan_results = $result.find('.scan-results');
                        let $gif = $body.find('.loading');
                        $('#dts_destination').remove();
                        $dts_results.find('.panel').removeClass('open');
                        if ($title.hasClass('collapsed')) {
                            $result.addClass('open');
                            $gif.removeClass('hidden');
                            $scan_results.addClass('hidden');
                            $message.addClass('hidden');

                            let onfulfilled = links => {
                                $gif.addClass('hidden');
                                $message.removeClass('alert-danger hidden')
                                    .text(utils.trad('scan_results').replace('_nb_', links.length || 0));
                                if (links.length) {
                                    $scan_results.find('.file-list').html(
                                        links.map(l => $('<tr>')
                                            .append($('<td>').text(utils.getFilenameFromUrl(l)))
                                            .append(
                                                $('<td>').html(
                                                    $('<span class="control glyphicon glyphicon-plus">').click(e => {
                                                        playlist.addTracks([l]);
                                                    })
                                                )
                                            ))
                                    );
                                    $scan_results.removeClass('hidden');
                                    let select = playlist.getPlaylistSelector('dts_destination', true).addClass('form-control input-xs');
                                    let getPlaylistId = () => select.val();
                                    select.append($('<option value="new">').text(utils.trad('new_playlist')));
                                    $scan_results.find('.input-container')
                                        .append(select);
                                    $scan_results.find('.set-as-playlist').click(e => {
                                        if(getPlaylistId() !== 'new')
                                            playlist.empty(getPlaylistId());
                                    });
                                    $scan_results.find('.add-to-playlist, .set-as-playlist').click(e => {
                                        let playlist_id = getPlaylistId();
                                        if (playlist_id === 'new')
                                            playlist.newCustomPlaylist(links);
                                        else
                                            playlist.addTracks(links, playlist_id);
                                    });
                                }
                            };
                            let onFailure = () => {
                                $gif.addClass('hidden');
                                $message
                                    .removeClass('hidden').addClass('alert-danger')
                                    .text(utils.trad('load_url_error'));
                            };
                            getPlaylist(r.href, onfulfilled, onFailure);
                        }
                    });
                $result.find('.panel-title > a.direct-link')
                    .attr('href', r.href)
                    .attr('title', r.href.replace(/^(.{40}).*$/, (f, m) => m + '...'))
                    .tooltip();
                $dts_results.append($result);
            });
            $dts_more_results.removeClass('hidden');
        };

        let googleSearch = function (query, offset) {
            if (!$dts_loading.hasClass('hidden')) return;
            $dts_loading.removeClass('hidden');
            let template = "https://www.google.fr/search?q=__query__+%28mp3%7Cogg%7Copus%7Coga%7Cflac%7Cwav%7Caac%7Cm4a%29+intitle%3A\"index.of.%2F\"" + (offset ? "&start=" + offset : "");
            let url = template.replace('__query__', encodeURIComponent(query || ''));
            utils.openTabSendMessageDoThings(
                url, {text: 'get_search_results'},
                response => displaySearchResults(response.results, offset),
                () => {
                },
                () => displaySearchResults()
            );
            $dts_more_results.off('click').click(e => googleSearch(query, offset + 10));
        };
        $dts_query.on('keydown', e => {
            let code = e.keyCode || e.which;
            if (+code === 13) {
                $dts_results.html('');
                googleSearch($dts_query.val(), 0);
            }
        });


        const getLocation = function (href) {
            let l = document.createElement("a");
            l.href = href;
            return l;
        };

        $('#manually_add_tracks').on('hidden.bs.modal', function () {
            $('#mat_url').val("");
            $('#matl_urls').val("");
            div_result.fadeOut();
        });

        $('#mat_load').click(function (e) {
            e.preventDefault();
            let url = $('#mat_url').val();
            div_result.fadeIn();
            result_message.removeClass('alert-danger alert-success').text(utils.trad('Processing'));
            if (url.length) {
                let onfulfilled = links => {
                    playlist.addTracks(links);
                    result_message.addClass('alert-success').text(utils.trad('scan_results').replace('_nb_', links.length));
                };
                let onFailure = () => {
                    result_message.addClass('alert-danger').text(utils.trad('load_url_error'));
                };
                getPlaylist(url, onfulfilled, onFailure);
            } else {
                result_message.addClass('alert-danger').text(utils.trad('invalid_url'));
            }
            return false;
        });

        $('#matl_load').click(function (e) {
            e.preventDefault();
            div_result.fadeIn();
            let urls = $('#matl_urls').val();
            let links = urls.split(',')
                .map(url => url.trim())
                .filter(url => url.length);
            playlist.addTracks(links);
            result_message
                .removeClass('alert-danger')
                .addClass('alert-success')
                .text(utils.trad('n_tracks_added').replace('_nb_', links.length));
            return false;
        });

    };
});
