import Dexie from "dexie"
import { singleton } from "../../utils/injection"
import { Track } from "./model"

const METADATA_REPOSITORY = "nmp-tracks-metadata"

@singleton
export class TracksMetadataRepository {
    db: Dexie
    tracks: Dexie.Table<Track, number>

    constructor() {
        this.db = new Dexie(METADATA_REPOSITORY)
        this.db.version(1)
            .stores({
                        tracks: "++track_id, url"
                    })
        this.tracks = this.db.table("tracks")
    }

    get(id: number): Promise<Track | undefined> {
        return this.tracks.get(id)
                   .catch(() => undefined)
    }

    getByUrl(url: string): Promise<Track | undefined> {
        return this.tracks
                   .where("url").equals(url)
                   .first()
                   .catch(() => undefined)
    }

    save(track: Track): Promise<number> {
        return this.tracks.put(track)
    }

    delete(id: number) {
        return this.tracks.delete(id)
    }

    async clean() {
        await this.tracks.clear()
    }
}
