import { singleton } from "../../utils/injection"
import Dexie from "dexie"
import { Playlist } from "./model"

const PLAYLIST_REPOSITORY = "nmp-playlist"

@singleton
export class PlaylistRepository {
    db: Dexie
    playlists: Dexie.Table<Playlist, number>

    constructor() {
        this.db = new Dexie(PLAYLIST_REPOSITORY)
        this.db.version(1)
            .stores({
                        playlists: "++id"
                    })
        this.playlists = this.db.table("playlists")
    }

    save(playlist: Playlist): Promise<number> {
        return this.playlists.put(playlist)
    }

    delete(id: number): Promise<any> {
        return this.playlists.delete(id)
    }

    saveMainPlaylist(playlist: Playlist): Promise<number> {
        playlist.id = 0
        return this.save(playlist)
    }

    saveFavorites(playlist: Playlist): Promise<number> {
        playlist.id = 1
        return this.save(playlist)
    }

    listCustomPlaylists(): Promise<Array<Playlist>> {
        return this.playlists
                   .where("id").above(1)
                   .toArray()
                   .catch(() => [])
    }

    async getMainPlaylist(): Promise<Playlist> {
        let fallback: Playlist = {id: 0, name: "main_playlist", tracks: []}
        let saved = await this.playlists.get(0).catch(() => undefined)
        if (saved == null) {
            await this.save(fallback)
            return fallback
        }
        return saved
    }

    async getFavorites(): Promise<Playlist> {
        let fallback: Playlist = {id: 1, name: "main_playlist", tracks: []}
        let saved = await this.playlists.get(1).catch(() => undefined)
        if (saved == null) {
            await this.save(fallback)
            return fallback
        }
        return saved
    }
}
