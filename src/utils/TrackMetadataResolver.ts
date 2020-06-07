import * as musicMetadata from "music-metadata-browser"
import { singleton } from "./injection"
import { inject } from "inversify"
import { MusicLibrary } from "../components/MusicLibrary"
import { UrlHelper } from "./UrlHelper"
import {
    LastFMMetadata,
    Track
} from "../db/metadata/model"
import { IAudioMetadata } from "music-metadata/lib/type"

const BASE_URL: string = "http://ws.audioscrobbler.com/2.0/?api_key=759fbbe432b1dcb568b9ce7a86557c47&format=json"

export interface TrackMetadataRequest {
    url: string
    track_id?: number
    fetchFromExternalApi?: boolean
    topPriority?: boolean
    callback: (track: Track) => any
}

@singleton
export class TrackMetadataResolver {
    @inject(MusicLibrary)
    musicLibrary: MusicLibrary

    @inject(UrlHelper)
    urlHelper: UrlHelper

    queue: Array<TrackMetadataRequest> = []

    run() {
        this.nextRequest()
    }

    async getTrackMeta(request: TrackMetadataRequest) {
        if (request.track_id != null) {
            let maybeTrack = await this.musicLibrary.getTrack(request.track_id)
            if (maybeTrack != null && !maybeTrack.justMigrated) {
                request.callback(maybeTrack)
                return
            }
        }

        let maybeTrack = await this.musicLibrary.searchTrackByUrl(request.url)
        if (maybeTrack != null && !maybeTrack.justMigrated) {
            request.callback(maybeTrack)
            return
        }

        if (request.topPriority) {
            this.queue.push(request)
        } else {
            this.queue.unshift(request)
        }
    }

    private async nextRequest() {
        if (this.queue.length > 0) {
            let request = this.queue.pop()
            try {
                await this.retrieveMetadata(request)
            } catch (e) {
                console.error("An error occurred while retrieving metadata", request, e)
            }
        }
        setTimeout(() => this.nextRequest(), 500)
    }

    private async retrieveMetadata(request: TrackMetadataRequest) {
        let url = request.url
        let maybeTrack = await this.musicLibrary.searchTrackByUrl(url)
        if (maybeTrack && !maybeTrack.justMigrated) {
            request.callback(maybeTrack)
        } else {
            let tags: IAudioMetadata = await this.getTags(url)
            let forceApiCall = (tags.common == null || tags.common.artist == null) && (maybeTrack == null || (maybeTrack.possible_metas || []).length === 0)
            let metaFromApi: Array<LastFMMetadata> = await this.fromApi(request, forceApiCall)
            if (maybeTrack != null) {
                maybeTrack.tags = tags.common || maybeTrack.tags
                await this.musicLibrary.updateTrack(maybeTrack, metaFromApi || maybeTrack.possible_metas || [])
                          .then(track => request.callback(track))
            } else {
                await this.musicLibrary.saveTrack(url, metaFromApi || [], 0, tags.common)
                          .then(track => request.callback(track))
            }
        }
    }

    private async getTags(url: string) {
        return await musicMetadata.fetchFromUrl(this.urlHelper.proxyUrlIfNeeded(url), {skipPostHeaders: true})
                                  .catch(() => ({} as IAudioMetadata))
    }

    private async fromApi(request: TrackMetadataRequest, forceApiCall: boolean = false): Promise<any> {
        if (request.fetchFromExternalApi || forceApiCall) {
            let keywords = this.urlHelper.getCleanTitleFromUrl(request.url)
            return this.requestFromApi(keywords)
        }
        return null
    }

    requestFromApi(keywords: string): Promise<any> {
        let url = BASE_URL + "&method=track.search&limit=3&track=" + encodeURIComponent(keywords)
        return fetch(url)
            .then(r => r.json())
            .then(response => response.results.trackmatches.track)
            .catch(err => {
                console.error("Could not retrieve metadata", err)
                return null
            })
    }
}
