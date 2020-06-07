import { singleton } from "../utils/injection"

@singleton
export class CurrentPlaylist {
    private container = $("#playlist_container")

    private current() {
        let playing = this.container.find(".playlist.playing")
        return playing.length > 0 ? playing : this.container.find(".active .playlist")
    }

    getTracksUrls(): Array<string> {
        return this.current()
                   .find("li.track:not(.failed)")
                   .get()
                   .map((li: HTMLElement) => $(li).data("url"))
    }

    getTracks(): JQuery<HTMLElement> {
        return this.current().find("li.track")
    }

    findTrack(url: string) {
        return this.container.find(".playlist.playing li.track[data-url=\"" + url + "\"]")
    }

    getPlayingTrack(): JQuery<HTMLElement> {
        return this.container.find("li.track.playing")
    }

    getNextTrack(circle: boolean = true): JQuery<HTMLElement> {
        let prev_track = this.getPlayingTrack().next("li.track:not(.failed)")

        if (prev_track.length === 0 && circle) {
            prev_track = this.getFirstTrack()
        }

        return prev_track
    }

    getPreviousTrack(circle: boolean = true) {
        let prev_track = this.getPlayingTrack().prev("li.track:not(.failed)")

        if (prev_track.length === 0 && circle) {
            prev_track = this.getLastTrack()
        }

        return prev_track
    }

    getFirstTrack(): JQuery<HTMLElement> {
        return this.current().find("li.track:not(.failed)").first()
    }

    getLastTrack(): JQuery<HTMLElement> {
        return this.current().find("li.track:not(.failed)").last()
    }
}
