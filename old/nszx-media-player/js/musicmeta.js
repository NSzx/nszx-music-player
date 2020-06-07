mm = {};
$(function () {
    const base_url = 'http://ws.audioscrobbler.com/2.0/?api_key=759fbbe432b1dcb568b9ce7a86557c47&format=json';

    mm.cleanQuery = query => query.replace(XRegExp('\\PL', 'g'), ' ').replace(/\s+/g, ' ');

    mm.searchTrackMeta = query => {
        let url = base_url + '&method=track.search&limit=3&track=' + encodeURIComponent(query);
        return $.get(url)
            .then(
                response => response.results.trackmatches.track,
                err => {
                    return [];
                }
            );
    };

    mm.cleanAndSearchTrackMeta = query => mm.searchTrackMeta(mm.cleanQuery(query));
});
