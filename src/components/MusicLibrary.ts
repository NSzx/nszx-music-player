import { singleton } from "../utils/injection"
import {
    LastFMMetadata,
    Track
} from "../db/metadata/model"
import { inject } from "inversify"
import { UrlHelper } from "../utils/UrlHelper"
import { TracksMetadataRepository } from "../db/metadata/TracksMetadataRepository"

import { ICommonTagsResult } from "music-metadata/lib/type"
import { BrowserHelper } from "../utils/BrowserHelper"

@singleton
export class MusicLibrary {
    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    @inject(UrlHelper)
    urlHelper: UrlHelper

    @inject(TracksMetadataRepository)
    repository: TracksMetadataRepository

    async init() {
        await this.migrateIfNeeded()
    }

    private async migrateIfNeeded() {
        let ml = await this.browserHelper.get("ml")
        if (ml != null) {
            let library = ml.library || {}
            let tracks: Array<Track> = library.tracks || []
            for (let track of tracks) {
                for (let url of track.sources) {
                    await this.saveMigratedTrack(url, track)
                }
            }
            await this.browserHelper.set('ml', null)
        }
    }

    async getTrack(id: number): Promise<Track | undefined> {
        return this.repository.get(id)
    }

    async searchTrackByUrl(url: string): Promise<Track | undefined> {
        return this.repository.getByUrl(url)
    }

    async saveTrack(url: string,
                    metaResults: Array<LastFMMetadata>,
                    selectedResult: number,
                    tags: ICommonTagsResult = null): Promise<Track> {
        let maybeExistingTrack = await this.repository.getByUrl(url)
        if (maybeExistingTrack != null) {
            return this.updateTrack(maybeExistingTrack, metaResults, selectedResult)
        }

        let track = this.createTrackFromUrl(url, tags, metaResults, selectedResult)
        track.track_id = await this.repository.save(track)
        return track
    }

    async saveMigratedTrack(url: string, oldTrack: Track): Promise<Track> {
        let track: Track
        if (oldTrack.possible_metas != null && oldTrack.possible_metas.length > 0) {
            track = this.createTrackFromUrl(url, null, oldTrack.possible_metas, oldTrack.selected_meta)
        } else {
            track = {
                url: url,
                lastfm_url: oldTrack.lastfm_url,
                title: oldTrack.title,
                artist: oldTrack.artist,
                thumbnail: (oldTrack.thumbnail == null || oldTrack.thumbnail.includes("2a96cbd8b46e442fc41c2b86b821562f")) ? null : oldTrack.thumbnail,
                selected_meta: 0,
                possible_metas: [],
                tags: null
            }
        }
        track.justMigrated = true
        track.track_id = await this.repository.save(track)
        return track
    }

    private createTrackFromUrl(url: string,
                               tags: ICommonTagsResult,
                               metaResults: Array<LastFMMetadata>,
                               selectedResult: number): Track {
        let defaultTitle = this.urlHelper.getTitleFromUrl(url)
        tags = this.setDefaults(tags, defaultTitle)
        let selectedMeta: LastFMMetadata = metaResults.length > 0 && selectedResult >= 0 ? metaResults[selectedResult] || metaResults[0] : {} as LastFMMetadata
        let picture = tags.picture[0]
        let thumbnailFromTags = picture != null ? `data:${ picture.format };base64,${ btoa([...picture.data].map(c => String.fromCharCode(c)).join("")) }` : null
        let thumbnailFromApi = selectedMeta.image != null ? selectedMeta.image[selectedMeta.image.length - 1]["#text"] : null
        return {
            url: url,
            lastfm_url: selectedMeta.url,
            title: selectedMeta.name || tags.title || defaultTitle,
            artist: selectedMeta.artist || tags.artist || "",
            thumbnail: thumbnailFromApi == null || thumbnailFromApi.includes("2a96cbd8b46e442fc41c2b86b821562f") ? thumbnailFromTags : thumbnailFromApi,
            selected_meta: selectedResult,
            possible_metas: metaResults || [],
            tags: tags
        }
    }

    private setDefaults(tags: ICommonTagsResult, defaultTitle: string): ICommonTagsResult {
        let nonNullTags = tags || {} as ICommonTagsResult
        return {
            title: defaultTitle,
            artist: "",
            picture: [],
            ...nonNullTags
        }
    }

    async updateTrack(track: Track,
                      metaResults: Array<LastFMMetadata> = [],
                      selectedResult: number = 0): Promise<Track> {
        let newTrack = this.preview(track, metaResults, selectedResult)
        await this.repository.save(newTrack)
        return newTrack
    }

    preview(track: Track,
            metaResults: Array<LastFMMetadata>,
            selectedResult: number): Track {
        return {
            track_id: track.track_id,
            ...this.createTrackFromUrl(track.url, track.tags, metaResults, selectedResult)
        }
    }

}
