edit_metas = {};

$(function(){

    edit_metas.init = function(utils, view){
        const modal = $('#modal_edit_metas');
        const metas_model = $('#search_metas_result_model');
        const current_metas = $('#current_metas');
        const results = $('#search_metas_results');
        const query = $('#search_metas_query');
        let track = null;
        let current_url = null;

        query.keydown(e => {
            let code = e.keyCode || e.which;
            if (code == 13) {
                e.preventDefault();
                e.stopPropagation();
                $('#do_search_metas').click();
                return false;
            }
        });

        modal.on('hidden.bs.modal', function () {
            current_metas.html("");
            results.html("");
            query.val("");

            let label = track.artist ? track.artist + ' - ' + track.title : track.title;
            $('.track[data-url="' + current_url + '"]')
                .attr("data-artist", track.artist || '')
                .attr("data-title", track.title)
                .find('.track-title').text(label);
            if (track && current_url === $('.track.playing').data('url'))
                view.displayMetas(track, $('#player_container'));

            track = null;
            current_url = null;
        });

        let displaySearchResults = (url, lastfm_results) => {
            results.html("");
            lastfm_results.forEach((m, i) => {
                results.append(metas_model.html());
                let result = results.find('.search-metas-result:eq(' + i + ')');
                view.displayMetas(ml.createTrack(url, lastfm_results, i), result);
                result.find('.select-metas').click(e => {
                    track = ml.saveTrack(url, lastfm_results, i);
                    let container = current_metas.find('.search-metas-result');
                    view.displayMetas(track, container);
                    utils.highlight(container);
                    if (track && url === $('.track.playing').data('url'))
                        view.displayMetas(track, $('#player_container'));
                });
            });
            if (!lastfm_results.length) results.text(utils.trad('no_results'));
        };
        edit_metas.editFor = url => {
            current_url = url;
            track = ml.searchTrackByUrl(url);
            if (!track) {
                modal.hide();
                return;
            }

            query.val(mm.cleanQuery(utils.getTitleFromUrl(url)));

            current_metas.html(metas_model.html());
            view.displayMetas(track, current_metas.find('.search-metas-result'));
            current_metas.find('.select-metas').text(utils.trad('clean')).click(e => {
                track = ml.saveTrack(url, track.possible_metas, -1);
                view.displayMetas(track, current_metas.find('.search-metas-result'));
            });

            displaySearchResults(url, track.possible_metas);

            $('#do_search_metas').off('click').on('click', e => {
                if(query.val())
                    mm.searchTrackMeta(query.val())
                        .then(results => displaySearchResults(url, results));
            });
            modal.modal('show')
        };
    };
});
