ml = {};

(function () {
    let library
    let url_to_track_id

    const saveState = () => chrome.storage.local.set({ml: {library: library, url_to_track_id: url_to_track_id}})

    const cleanLibrary = (clean_lastfm_results) => {
        let used_ids = Object.values(url_to_track_id).filter((id, i, arr) => arr.indexOf(id) === i)
        let tracks = used_ids.map(id => library.tracks[id])
        url_to_track_id = {}
        tracks.forEach((t, i) => {
            t.track_id = i
            t.sources.forEach(url => url_to_track_id[url] = i)
            if (clean_lastfm_results) t.possible_metas = []
        })
        library.tracks = tracks
        saveState()
    }

    ml.filterLibrary = used_urls => {
        let new_url_to_track_id = {}
        Object.keys(url_to_track_id).forEach(url => {
            if (used_urls.indexOf(url) >= 0) {
                new_url_to_track_id[url] = url_to_track_id[url]
            }
        })
        url_to_track_id = new_url_to_track_id
        cleanLibrary()
    }

    chrome.storage.local.get('ml', function (items) {
        let ml = items.ml || {}
        library = ml.library || {}
        library.tracks = library.tracks || []
        url_to_track_id = ml.url_to_track_id || {}
        cleanLibrary(true)
    })

    const lastIn = arr => arr[arr.length - 1]
    const getFilenameFromUrl = url => {
        let div = document.createElement('div')
        div.innerHTML = url.split('/').pop()
        let uri_encoded = div.innerText || div.textContent
        try {
            return decodeURIComponent(uri_encoded)
        } catch (err) {
            return uri_encoded
        }
    }
    const getTitleFromUrl = url => getFilenameFromUrl(url).replace(/\.[a-z0-9]{2,5}$/i, '')

    ml.createTrack = (url, metaResults, selectedMetaKey) => {
        selectedMetaKey = selectedMetaKey || 0
        let selectedMeta = metaResults[selectedMetaKey] || {}
        return {
            lastfm_url: selectedMeta.url,
            sources: [url],
            title: selectedMeta.name || getTitleFromUrl(url),
            artist: selectedMeta.artist || '',
            thumbnail: lastIn(selectedMeta.image || [{}])['#text'],
            selected_meta: selectedMetaKey,
            possible_metas: metaResults || []
        }
    }

    ml.saveTrack = (url, metaResults, selectedMetaKey) => {
        let track = ml.createTrack(url, metaResults, selectedMetaKey)
        let maybe_track = ml.searchTrackByMeta(track)
        if (maybe_track) {
            maybe_track = ml.updateTrack(maybe_track, metaResults, selectedMetaKey)
            return ml.addSource(maybe_track, url)
        }
        let trackId = library.tracks.length
        track.track_id = trackId
        library.tracks[trackId] = track
        url_to_track_id[url] = trackId
        saveState()
        return track
    }

    ml.trackVariant = (track, selectedMetaKey) => {
        selectedMetaKey = selectedMetaKey || 0
        let selectedMeta = track.possible_metas[selectedMetaKey] || {}
        return {
            track_id: track.track_id,
            lastfm_url: selectedMeta.lastfm_url || track.lastfm_url,
            sources: track.sources,
            title: selectedMeta.name || track.title || getTitleFromUrl(track.sources[0]),
            artist: selectedMeta.artist || track.artist || '',
            thumbnail: lastIn(selectedMeta.image || [{}])['#text'] || track.thumbnail,
            selected_meta: selectedMetaKey,
            possible_metas: track.possible_metas || []
        }
    }

    ml.updateTrack = (track, metaResults, selectedMetaKey) => {
        track.possible_metas = metaResults
        track = ml.trackVariant(track, selectedMetaKey)
        library.tracks[track.track_id] = track
        saveState()
        return library.tracks[track.track_id]
    }

    ml.cleanTrackMeta = track => ml.updateTrack(track, [], 0)

    ml.addSource = (track, url) => {
        track = library.tracks[track.track_id]
        if (track) {
            if (track.sources.indexOf(url) < 0)
                track.sources.push(url)
            url_to_track_id[url] = track.track_id
            saveState()
        }
        return track
    }

    ml.searchTrackByMeta = meta => {
        let url = (meta.lastfm_url || meta.url)
        return library.tracks
            .filter(
                t => t.lastfm_url && url && t.lastfm_url === url
            )[0] || null
    }

    ml.searchTrackByUrl = url => {
        if (+url_to_track_id[url] >= 0) return library.tracks[url_to_track_id[url]]
        return null
    }

    ml.getById = id => library.tracks[id]

    ml.wipeClean = () => {
        library.tracks = []
        url_to_track_id = {}
        saveState()
    }
})()
