import { singleton } from "../utils/injection"
import { Playlist } from "../db/playlist/model"
import { inject } from "inversify"
import { PlaylistRepository } from "../db/playlist/PlaylistRepository"
import { MessagesHelper } from "../utils/MessagesHelper"
import { UrlHelper } from "../utils/UrlHelper"
import { TrackMetadataResolver } from "../utils/TrackMetadataResolver"
import { Track } from "../db/metadata/model"
import {
    LongTasksManager,
    Task
} from "../utils/LongTasksManager"
import { DomHelper } from "../utils/DomHelper"
import {
    BrowserHelper,
    TAB_ID
} from "../utils/BrowserHelper"
import { MusicPlayer } from "./MusicPlayer"
import { SharePlaylistModal } from "./modals/SharePlaylistModal"
import { CurrentPlaylist } from "./CurrentPlaylist"
import KeyDownEvent = JQuery.KeyDownEvent
import ClickEvent = JQuery.ClickEvent
import BlurEvent = JQuery.BlurEvent

@singleton
export class PlaylistsManager {
    @inject(PlaylistRepository)
    repository: PlaylistRepository

    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(UrlHelper)
    urlHelper: UrlHelper

    @inject(TrackMetadataResolver)
    metadataResolver: TrackMetadataResolver

    @inject(LongTasksManager)
    taskManager: LongTasksManager

    @inject(DomHelper)
    domHelper: DomHelper

    @inject(MusicPlayer)
    player: MusicPlayer

    @inject(SharePlaylistModal)
    sharePlaylist: SharePlaylistModal

    @inject(CurrentPlaylist)
    currentPlaylist: CurrentPlaylist

    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    private container = $("#playlist_container")
    private $favorite_tracks = $("#favorite_tracks")
    private $pills_container = $("#playlists_container_tabs")

    private mainPlaylist: Playlist
    private favorites: Playlist
    private customPlaylists: Map<number, Playlist> = new Map<number, Playlist>()

    async init() {
        await this.migrateIfNeeded()
        await this.initPlaylists()

        $("ul.playlist").sortable({axis: "y"})

        this.container.on("click", ".toggle-favorite", (e: ClickEvent) => {
            let target = $(e.target)
            const url = $(e.target).parent().data("url")
            let maybe_favorite = this.$favorite_tracks.find("li.track[data-url=\"" + url + "\"]")

            if (maybe_favorite.length) {
                maybe_favorite.find(".glyphicon-remove").trigger("click")
            } else {
                this.addTracks([url], 1)
            }
            target.toggleClass("glyphicon-heart glyphicon-heart-empty")

            return false
        })

        this.container.on("click", ".glyphicon-remove", (e: ClickEvent) => {
            let $playlist = $(e.target).closest(".playlist")
            $(e.target).parent().remove()
            if ($playlist.find("li.track").length === 0) {
                this.emptyPlaylist(+$playlist.attr("id"))
            }
            return false
        })

        this.container.on("keydown", "li.track", (e: KeyDownEvent) => {
            let code = e.keyCode || e.which
            switch (code) {
                case 13: //ENTER
                    $(e.target).trigger("click")
                    break
                case 38: //UP
                    let prev = $(e.target).prev("li.track")
                    if (this.domHelper.isCtrlDown()) {
                        prev.insertAfter(e.target)
                    } else {
                        prev.trigger("focus")
                    }
                    return false
                case 40: //DOWN
                    let next = $(e.target).next("li.track")
                    if (this.domHelper.isCtrlDown()) {
                        next.insertBefore(e.target)
                    } else {
                        next.trigger("focus")
                    }
                    return false
            }
        })

        this.container.on("click", "li.track", (e: ClickEvent) => {
            let track = $(e.target).closest(".track")
            this.selectTrack(track)
        })

        $("#add_custom_playlist").on("click", () => {
            this.newCustomPlaylist()
        })
    }

    private async migrateIfNeeded() {
        let playlists = await this.browserHelper.get("playlists")
        if (playlists != null) {
            await this.repository.saveMainPlaylist({name: this.messages.trad("main_playlist"), tracks: playlists.main_playlist || []})
            await this.repository.saveFavorites({name: this.messages.trad("favorite_tracks"), tracks: playlists.favorite_tracks || []})
            let tmp = playlists.custom_playlists || {}
            for (let playlist of Object.values(tmp) as Playlist[]) {
                if (playlist.name != null) {
                    await this.repository.save({name: playlist.name, tracks: playlist.tracks || []})
                }
            }
            await this.browserHelper.set("playlists", null)
        }
    }

    private async initPlaylists() {
        this.mainPlaylist = await this.repository.getMainPlaylist()
        this.favorites = await this.repository.getFavorites()
        this.addTracks(this.mainPlaylist.tracks, 0, true, () => {
            this.getPill(0).append("<span class=\"badge tracks-count\">" + this.mainPlaylist.tracks.length + "</span>")
            this.observeChangesFor(0)
        })
        this.addTracks(this.favorites.tracks, 1, true, () => {
            this.getPill(1).append("<span class=\"badge tracks-count\">" + this.favorites.tracks.length + "</span>")
            this.observeChangesFor(1)
        })
        for (let playlist of await this.repository.listCustomPlaylists()) {
            this.customPlaylists.set(playlist.id, playlist)
            this.displayCustomPlaylist(playlist.id)
        }
        setTimeout(() => {
            this.browserHelper.get("playing_track")
                .then(playing_track => {
                    if (playing_track && playing_track.url) {
                        let track = this.getTrack(playing_track.playlist_id, playing_track.url)
                        if (track.length) {
                            this.selectTrack(track, false)
                            this.getPill(playing_track.playlist_id).click()
                            setTimeout(() => track.focus(), 400)
                        }
                    }
                })
        }, 2000)

    }

    private async savePlaylist(playlistId: number) {
        let tracks = this.getPlaylistTracksFromDom(playlistId)
        let playlist: Playlist = this.getPlaylist(playlistId)
        if (playlist == null) {
            return
        }
        let pill = this.$pills_container.find(".playlist-tab[data-playlist-id=\"" + playlistId + "\"]")
        pill.find(".tracks-count").remove()
        playlist.tracks = tracks
        playlist.name = pill.data("i18n") ? this.messages.trad(pill.data("i18n")) : pill.text()
        if (pill.attr("contenteditable") !== "true") {
            pill.append("<span class=\"badge tracks-count\">" + tracks.length + "</span>")
        }
        if (playlistId === 1) {
            this.container.find("li.track .glyphicon-heart")
                .removeClass("glyphicon-heart")
                .addClass("glyphicon-heart-empty")
            tracks.forEach(url => {
                setTimeout(() => this.container.find("li.track[data-url=\"" + url + "\"] .glyphicon-heart-empty")
                                     .removeClass("glyphicon-heart-empty").addClass("glyphicon-heart"), 10)
            })
        }
        await this.repository.save(playlist)
    }

    getPlaylistTracksFromDom(playlistId: number, filterFailed: boolean = false): Array<string> {
        return this.getOrPlaying(playlistId)
                   .find("li.track")
                   .filter(filterFailed ? ":not(.failed)" : ".track")
                   .get()
                   .map((li: HTMLElement) => $(li).data("url"))
    }

    getTrack(playlistId: number, url: string): JQuery<HTMLElement> {
        return this.getOrPlaying(playlistId)
                   .find(".track[data-url=\"" + url + "\"]")
    }

    active(): JQuery<HTMLElement> {
        return $("#" + this.$pills_container.find("li.active").find(".playlist-tab").data("playlist-id"))
    }

    playing(): JQuery<HTMLElement> {
        let maybePlaying = $(".playlist.playing")
        return maybePlaying.length ? maybePlaying : this.active()
    }

    get(playlistId: number = null): JQuery<HTMLElement> {
        let maybePlaylist = $("#" + playlistId)
        return maybePlaylist.length ? maybePlaylist : this.active()
    }

    getOrPlaying(playlistId: number = null): JQuery<HTMLElement> {
        let maybePlaylist = $("#" + playlistId)
        return maybePlaylist.length ? maybePlaylist : this.playing()
    }

    getFirstTrack(playlistId: number = null, filterFailed: boolean = false): JQuery<HTMLElement> {
        return this.getOrPlaying(playlistId).find("li.track" + (filterFailed ? ":not(.failed)" : "")).first()
    }

    selectTrack($track: JQuery<HTMLElement>, shouldTriggerPlay: boolean = true) {
        $track.trigger("focus")
        if ($track.hasClass("playing")) {
            return false
        }

        this.player.pause()
        this.player.backToStart()

        let url = $track.data("url")
        this.player.setTrack(url)

        this.currentPlaylist.getPlayingTrack().removeClass("playing")
        $track.addClass("playing")
        let $playlist = $track.closest(".playlist")
        let playlistId = +$playlist.attr("id")
        $(".playlist-tab, .playlist").removeClass("playing")
        this.getPill(playlistId).addClass("playing")

        $playlist.addClass("playing")
        this.browserHelper.set("playing_track", {playlist_id: playlistId, url: url})

        if (shouldTriggerPlay) {
            this.player.play()
        }

    }

    private getPill(playlistId: number): JQuery<HTMLElement> {
        return this.$pills_container.find(".playlist-tab[data-playlist-id=\"" + playlistId + "\"]")
    }

    emptyPlaylist(playlistId: number) {
        const no_tracks = "<li>" + this.messages.trad("no_tracks") + "</li>"
        this.get(playlistId).html(no_tracks).removeClass("playing")
    }

    private addTrack(url: string, playlistId: number) {
        let $playlist = this.get(playlistId)
        if (!$playlist.length || $playlist.find("li.track[data-url=\"" + url + "\"]").length) {
            return
        }

        const is_favorite = this.favorites.tracks.indexOf(url) >= 0
        const filename = this.urlHelper.getFilenameFromUrl(url)
        const title = this.urlHelper.getTitleFromUrl(url)
        let $track = $("<li>")
            .addClass("track").attr("data-url", url).attr("role", "button").attr("tabindex", "0")
            .append($("<span>").addClass("grabbable glyphicon glyphicon-option-vertical"))
            .append($("<a>")
                        .addClass("direct-link")
                        .on("click", e => e.stopPropagation())
                        .attr("href", url).attr("tabindex", "-1").attr("target", "_blank")
                        .attr("title", filename).attr("data-placement", "left")
                        .tooltip()
                        .append($("<span>").addClass("glyphicon glyphicon-link"))
            )
            .append(playlistId === 1 ? "" :
                    $("<span>")
                        .addClass("clickable toggle-favorite glyphicon glyphicon-heart" + (is_favorite ? "" : "-empty")))
            .append($("<span>").addClass("clickable glyphicon glyphicon-remove"))
            .append($("<span>").addClass("track-title").html(title))
            .attr("title", title)

        if ($playlist.find(".track").length === 0) {
            $playlist.html("")
        }
        $playlist.append($track)

        let request = {
            url: url,
            callback: (metas: Track) => {
                let label = metas.artist ? metas.artist + " - " + metas.title : metas.title
                $track.find(".track-title").text(label)
                $track.attr("title", label)
                      .attr("data-artist", metas.artist || "")
                      .attr("data-title", metas.title)
                      .attr("data-id", metas.track_id)
            }
        }
        this.metadataResolver.getTrackMeta(request)
    }

    addTracks(links: Array<string>, maybePlaylistId: number = null, ignoreUserConfirm: boolean = false, callback: () => any = null) {
        let playlist = this.get(maybePlaylistId)
        let playlistId = +playlist.attr("id")
        if (links.length > 300) {
            if (!ignoreUserConfirm) {
                chrome.tabs.update(TAB_ID, {active: true})
                if (!confirm(this.messages.trad("confirm_add_many_tracks").replace("_nb_", "" + links.length))) {
                    return
                }
            }
            let chunkSize = 300
            for (let i = 0; i < links.length; i += chunkSize) {
                let task: Task = {
                    done: false,
                    run: async () => {
                        links.slice(i, i + chunkSize).forEach(url => this.addTrack(url, playlistId))
                        if (i + chunkSize > links.length) {
                            let $pill = this.getPill(playlistId).parent()
                            this.domHelper.highlight($pill)
                            if (callback != null) {
                                callback()
                            }
                        }
                    }
                }
                this.taskManager.addTask(task)
            }
        } else {
            links.forEach(url => this.addTrack(url, playlistId))
            let $pill = this.getPill(playlistId).parent()
            this.domHelper.highlight($pill)
            if (callback != null) {
                callback()
            }
        }
    }

    async newCustomPlaylist(tracks: Array<string> = null, name: string = null) {
        let playlist: Playlist = {
            name: name || this.messages.trad("new_playlist"),
            tracks: tracks || []
        }
        playlist.id = await this.repository.save(playlist)
        this.customPlaylists.set(playlist.id, playlist)
        this.displayCustomPlaylist(playlist.id, false)
        setTimeout(() => this.domHelper.editElement(this.$pills_container.find(".custom-playlist-tab").last()), 300)
    }

    private displayCustomPlaylist(playlistId: number, appendBadge: boolean = true) {
        let playlist = this.customPlaylists.get(playlistId)
        let $pill = $("<a class=\"custom-playlist-tab playlist-tab\" role=\"tab\" data-toggle=\"pill\">")
            .attr("href", `#${ playlistId }_panel`)
            .attr("aria-controls", `${ playlistId }_panel`)
            .attr("data-playlist-id", playlistId)
            .attr("contenteditable", "false")
            .text(playlist.name)
            .on("keydown", e => {
                let $this = $(e.target)
                let code = +(e.keyCode || e.which)
                let in_edition = $this.attr("contenteditable") === "true"
                if (code === 13 && in_edition) {
                    e.preventDefault()
                    $this.attr("contenteditable", "false")
                    this.savePlaylist(playlistId)
                    return false
                }
                if (in_edition && [32, 37, 38, 39, 40].includes(code)) {
                    e.stopPropagation()
                }
            })
            .on("blur", (e: BlurEvent) => {
                let $this = $(e.target)
                if ($this.attr("contenteditable") === "true") {
                    $this.attr("contenteditable", "false")
                    this.savePlaylist(playlistId)
                }
            })
            .on("click", (e: ClickEvent) => $(e.target).attr("contenteditable") !== "true")
        if (appendBadge) {
            $pill.append("<span class=\"badge tracks-count\">" + playlist.tracks.length + "</span>")
        }
        this.$pills_container.append($(`<li role="presentation">`).append($pill))
        this.container.append($(`<div id="${ playlistId }_panel" role="tabpanel" class="tab-pane fade">`))
        this.initCustomPlaylist(playlistId)
    }

    private initCustomPlaylist(playlistId: number) {
        $("#" + playlistId + "_panel")
            .html("")
            .append($(`<ul id="${ playlistId }" class="playlist">`))
        $("#" + playlistId).sortable()
        let tracks = this.customPlaylists.get(playlistId).tracks
        this.addTracks(tracks, playlistId, true, () => this.observeChangesFor(playlistId))
    };

    private observeChangesFor(playlistId: number) {
        let target = this.get(playlistId)
        if (!target.length) {
            return
        }
        let timeout: any = null
        let observer = new MutationObserver(() => {
            if (timeout != null) {
                clearTimeout(timeout)
            }
            timeout = setTimeout(() => {
                timeout = null
                this.savePlaylist(playlistId)
            }, 1000)
        })
        observer.observe(target.get(0), {childList: true})
    }

    sort(playlistId: number, sortBy: string) {
        let $playlist = this.get(playlistId)
        let tracks = $playlist.find("li.track").get()
        if ($playlist.attr("data-sorted-by") !== sortBy + "_ASC") {
            tracks.sort((a, b) => ($(a).attr("data-" + sortBy) || "").localeCompare($(b).attr("data-" + sortBy) || ""))
            $playlist.attr("data-sorted-by", sortBy + "_ASC")
        } else {
            tracks.sort((a, b) => ($(b).attr("data-" + sortBy) || "").localeCompare($(a).attr("data-" + sortBy) || ""))
            $playlist.attr("data-sorted-by", sortBy + "_DESC")
        }
        $playlist.append(tracks)
    }

    remove(playlistId: number) {
        let playlist = this.customPlaylists.get(playlistId)
        if (playlist != null && confirm(this.messages.trad("delete_playlist_confirm") + " [" + playlist.name + "]")) {
            let pill = $("a[href=\"#" + playlistId + "_panel\"]").closest("li")
            if (pill.hasClass("active")) {
                this.$pills_container.find(".playlist-tab:eq(0)").tab("show")
            }
            pill.remove()
            setTimeout(() => $("#" + playlistId + "_panel").remove(), 1000)
            this.customPlaylists.delete(playlistId)
            this.repository.delete(playlistId)
        }
    }

    getAvailablePlaylists(showPlaying: boolean = true) {
        return this.$pills_container
                   .find(".playlist-tab").get()
                   .map(tab => {
                       let $tab = $(tab)
                       let playlistId = +$tab.data("playlist-id")
                       let playlist = this.getPlaylist(playlistId)
                       if (playlist == null) {
                           return null
                       }
                       let name = $tab.data("i18n") ? this.messages.trad($tab.data("i18n")) : playlist.name
                       let is_playing = $tab.hasClass("playing")
                       let is_active = $tab.parent().hasClass("active")
                       if (is_playing && showPlaying) {
                           name += " 🔊"
                       }
                       return {
                           is_playing: is_playing,
                           is_active: is_active,
                           id: playlistId,
                           name: name
                       }
                   })
                   .filter(p => p != null)
    }

    getPlaylistSelector(select_id: string, select_active: boolean) {
        let $select = $("<select>").attr("id", select_id).attr("name", select_id)
        this.getAvailablePlaylists().forEach(pl => {
            $select.append($("<option " + ((select_active && pl.is_active) || (!select_active && pl.is_playing) ? "selected=\"selected\"" : "") + ">")
                               .attr("value", pl.id)
                               .text(pl.name))
        })
        return $select
    }

    share(playlistId: number) {
        let availablePlaylists: any = {}
        this.getAvailablePlaylists(false)
            .map(p => ({
                ...p,
                tracks: this.getTracks(p.id)
            })).forEach(p => availablePlaylists[p.id] = p)
        this.sharePlaylist.openFor(playlistId, availablePlaylists)
    }

    private getTracks(playlistId: number): Array<string> {
        let playlist = this.getPlaylist(playlistId)
        return playlist == null ? [] : playlist.tracks
    }

    private getPlaylist(playlistId: number): Playlist {
        switch (playlistId) {
            case 0:
                return this.mainPlaylist
            case 1:
                return this.favorites
            default:
                return this.customPlaylists.get(playlistId)
        }
    }

    playNextPlaylist() {
        let playing = this.playing().closest(".tab-pane")
        let maybe_next = playing.next()
        while (maybe_next.length && !maybe_next.find(".track").length) {
            maybe_next = maybe_next.next()
        }
        if (maybe_next.length) {
            this.selectTrack(this.getFirstTrack(+maybe_next.find(".playlist").attr("id")))
        } else {
            this.selectTrack(this.getFirstTrack(0))
        }
    }

}
