import { singleton } from "../utils/injection"
import { inject } from "inversify"
import { PlaylistsManager } from "./PlaylistsManager"
import { MessagesHelper } from "../utils/MessagesHelper"
import { DomHelper } from "../utils/DomHelper"
import { EditMetadataModal } from "./modals/EditMetadataModal"
import ContextMenuEvent = JQuery.ContextMenuEvent
import ClickEvent = JQuery.ClickEvent

@singleton
export class ContextMenu {
    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(DomHelper)
    domHelper: DomHelper

    @inject(EditMetadataModal)
    editMetadataModal: EditMetadataModal

    @inject(PlaylistsManager)
    playlistsManager: PlaylistsManager

    private $container = $("#context_menus_container")
    private $all_cm = this.$container.find(".context-menu:not(.context-submenu)")
    private $track_cm = $("#track_context_menu")
    private $playlist_cm = $("#playlist_context_menu")
    private $custom_playlist_cm = $("#custom_playlist_context_menu")

    private $playlist_container = $("#playlist_container")
    private $pills_container = $("#playlists_container_tabs")

    init() {
        this.$container.on("click", e => this.$container.addClass("hidden"))
        this.$container.on("contextmenu", e => {
            this.$container.addClass("hidden")
            return false
        })

        this.$pills_container.on("contextmenu", "a.playlist-tab", (e: ContextMenuEvent) => {
            let $t = $(e.target).closest("a")
            e.preventDefault()
            this.openFor($t, e)
            return false
        })

        this.$playlist_container.on("contextmenu", "li.track", (e: ContextMenuEvent) => {
            let $t = $(e.target)
            if ($t.hasClass("track") || $t.hasClass("track-title")) {
                e.preventDefault()
                this.openFor($t.closest("li.track"), e)
                return false
            }
        })
    }

    openFor(element: JQuery<HTMLElement>, event: ContextMenuEvent) {
        if (element.hasClass("track")) {
            this.openForTrack(element, event)
        } else if (element.hasClass("playlist-tab")) {
            this.openForPlaylist(element, event)
        }
    }

    private openForTrack(element: JQuery<HTMLElement>, event: ContextMenuEvent) {
        let $playlist = element.closest(".playlist")
        this.buildContextSubmenuPlaylists(this.$track_cm, +$playlist.attr("id"))
        this.$track_cm.find(".context-submenu-playlists")
            .append("<hr><li data-playlist-id=\"-1\">" + this.messages.trad("new_playlist") + "</li>")
        if (element.attr("data-id")) {
            this.onClick(this.$track_cm, ".edit-metas", e => this.editMetadataModal.editFor(element.data("url")))
        } else {
            this.$track_cm.find(".edit-metas").addClass("disabled").off("click")
        }
        this.onClick(this.$track_cm, ".move-track-up", e => element.remove().prependTo($playlist))
        this.onClick(this.$track_cm, ".move-track-down", e => element.remove().appendTo($playlist))
        this.onClick(this.$track_cm, ".add-to-playlist", e => this.addThisTrack(e, element.data("url")))
        this.onClick(this.$track_cm, ".move-to-playlist", e => {
            let ret_val = this.addThisTrack(e, element.data("url"))
            if (ret_val) {
                element.fadeOut(() => element.remove())
            }
            return ret_val
        })
        this.placeCmAt(this.$track_cm, {x: event.clientX, y: event.clientY})
    }

    private openForPlaylist(element: JQuery<HTMLElement>, event: ContextMenuEvent) {
        let playlist_id = element.data("playlist-id")
        let cm: JQuery<HTMLElement>
        if (element.hasClass("custom-playlist-tab")) {
            cm = this.$custom_playlist_cm
            this.onClick(cm, ".rename-playlist", e => this.domHelper.editElement(element))
            this.onClick(cm, ".remove-playlist", e => this.playlistsManager.remove(playlist_id))
        } else {
            cm = this.$playlist_cm
        }
        this.buildContextSubmenuPlaylists(cm, playlist_id)
        cm.find(".export-to")
          .find(".context-submenu-playlists")
          .append("<hr><li data-playlist-id=\"-1\">" + this.messages.trad("new_playlist") + "</li>")
        this.onClick(cm, ".empty-playlist", e => this.playlistsManager.emptyPlaylist(playlist_id))
        this.onClick(cm, ".export-to", e => {
            let target_playlist = $(e.target).data("playlist-id")
            if (target_playlist === "new") {
                this.playlistsManager.newCustomPlaylist(this.playlistsManager.getPlaylistTracksFromDom(playlist_id))
            } else if (target_playlist) {
                this.playlistsManager.addTracks(this.playlistsManager.getPlaylistTracksFromDom(playlist_id), target_playlist)
            } else {
                e.preventDefault()
                e.stopPropagation()
                return false
            }
        })
        this.onClick(cm, ".import-from", e => {
            let target_playlist = $(e.target).data("playlist-id")
            if (target_playlist) {
                this.playlistsManager.addTracks(this.playlistsManager.getPlaylistTracksFromDom(target_playlist), playlist_id)
            } else {
                e.preventDefault()
                e.stopPropagation()
                return false
            }
        })
        this.onClick(cm, ".sort-by", e => {
            let sort_by = $(e.target).data("sort-by")
            if (sort_by) {
                this.playlistsManager.sort(playlist_id, sort_by)
            } else {
                e.preventDefault()
                e.stopPropagation()
                return false
            }
        })
        this.onClick(cm, '.share-playlist', e => this.playlistsManager.share(playlist_id))
        this.placeCmAt(cm, {x: event.clientX, y: event.clientY})
    }

    private buildContextSubmenuPlaylists(cm: JQuery<HTMLElement>, playlistId: number) {
        let html = this.playlistsManager.getAvailablePlaylists()
                       .filter(pl => pl.id !== playlistId)
                       .map(pl => "<li data-playlist-id=\"" + pl.id + "\">" + pl.name + "</li>")
                       .join("")
        cm.find(".context-submenu-playlists").html(html)
    }

    private placeCmAt = (cm: JQuery<HTMLElement>, position: any) => {
        let x = position.x
        let y = position.y
        this.$all_cm.addClass("hidden")
        this.$container.removeClass("hidden")
        cm.removeClass("hidden")
        const w = cm.outerWidth()
        const h = cm.outerHeight()
        const max_x = $("body").innerWidth()
        const max_y = $("body").innerHeight()
        if (x + w > max_x) {
            x -= w
        }
        if (y + h > max_y) {
            y -= h
        }
        cm.css("left", x).css("top", y)

        cm.find(".context-submenu").get().forEach(div => {
            const $div = $(div)
            $div.removeClass("context-submenu")
            const $li = $div.parent()
            const parent_position = $li.offset()
            let sub_x = x + w
            let sub_y = parent_position.top
            const sub_w = $div.outerWidth()
            const sub_h = $div.outerHeight()
            if (sub_x + sub_w > max_x) {
                sub_x -= (w + sub_w)
            }
            if (sub_y + sub_h > max_y) {
                sub_y -= (sub_h - $li.outerHeight())
            }
            $div.css("left", sub_x).css("top", sub_y)
            $div.addClass("context-submenu")
        })
    }

    private addThisTrack(e: ClickEvent, url: string) {
        let target_playlist = +$(e.target).data("playlist-id")
        if (target_playlist === -1) {
            this.playlistsManager.newCustomPlaylist([url])
        } else if (target_playlist) {
            this.playlistsManager.addTracks([url], target_playlist)
        } else {
            e.preventDefault()
            e.stopPropagation()
            return false
        }
        return true
    }

    private onClick(cm: JQuery<HTMLElement>, target: string, handler: (e: ClickEvent) => any) {
        cm.find(target).removeClass("disabled").off("click").on("click", handler)
    }
}
