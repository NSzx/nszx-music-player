import { ICommonTagsResult } from "music-metadata/lib/type"

export interface LastFMImage {
    "#text": string
    size: string
}

export interface LastFMMetadata {
    artist: string
    image: Array<LastFMImage>
    name: string
    url: string
}

export interface Track {
    track_id?: number
    url: string
    lastfm_url: string
    title: string
    artist: string
    thumbnail: string
    possible_metas: Array<LastFMMetadata>
    selected_meta: number
    tags: ICommonTagsResult
    sources?: Array<string>
    justMigrated?:boolean
}

export interface MetadataLink {
    url: string
    track_id: number
}
