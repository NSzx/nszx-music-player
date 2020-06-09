import { singleton } from "../../utils/injection"
import { inject } from "inversify"
import { MessagesHelper } from "../../utils/MessagesHelper"
import { Playlist } from "../../db/playlist/model"

@singleton
export class SharePlaylistModal {
    @inject(MessagesHelper)
    messages: MessagesHelper

    private modal: JQuery<HTMLElement> = $("#share_playlist")
    private do_share: JQuery<HTMLElement> = $("#do_share_playlist")
    private do_share_label: JQuery<HTMLElement> = $("label[for=\"do_share_playlist\"]")
    private results: JQuery<HTMLElement> = $("#share_playlist_results")
    private view_link: JQuery<HTMLElement> = $("#view_playlist_link")
    private share_link: JQuery<HTMLElement> = $("#share_playlist_link")
    private playlist_selector: JQuery<HTMLElement> = $("#share_playlist_selector")
    private playlist_rename: JQuery<HTMLElement> = $("#share_playlist_name")

    init() {

        $(".copy-link").on("click", e => {
            const button = $(e.target).closest(".copy-link")
            const target = $("#" + button.data("target"))
            target.focus().select()
            let succeed
            try {
                succeed = document.execCommand("copy")
            } catch (e) {
                succeed = false
            }
            if (succeed) {
                button.find(".glyphicon").removeClass("glyphicon-copy").addClass("glyphicon-ok-circle")
                button.find(".i18n").text(this.messages.trad("copied"))
            } else {
                button.find(".glyphicon").removeClass("glyphicon-copy").addClass("glyphicon-remove-circle")
                button.find(".i18n").text(this.messages.trad("error"))
            }
        })

        this.modal.on("hidden.bs.modal", () => {
            this.reset()
        })
    }

    openFor(playlistId: number, availablePlaylists: any) {
        this.reset()
        this.playlist_selector.html(Object.values(availablePlaylists)
                                          .map((pl: Playlist) => `<option ${ pl.id === playlistId ? " selected=\"selected\"" : "" } value="${ pl.id }">${ pl.name }</option>`)
                                          .join(""))
        this.playlist_selector.change(e => this.displayPlaylist(+this.playlist_selector.val(), availablePlaylists))
        this.displayPlaylist(playlistId, availablePlaylists)
        this.do_share.click(e => {
            const toShareId = +this.playlist_selector.val()
            const toShare = {
                name: this.playlist_rename.val(),
                tracks: availablePlaylists[toShareId].tracks
            }
            if (toShare) {
                $.post("https://nszx.fr/media-player-share/share.php", JSON.stringify(toShare), result => {
                     this.view_link.val(result.link)
                     this.share_link.val(chrome.extension.getURL("import.html") + "?id=" + result.id)
                     this.results.fadeIn()
                 })
                 .fail(e => alert(this.messages.trad("share_playlist_failed") + " :("))
            }
        })

        this.modal.modal("show")
    }

    private toggleDoShare(disabled: boolean) {
        if (disabled) {
            this.do_share.attr("disabled", "disabled")
            this.do_share_label.text(this.messages.trad("cannot_share_empty_playlist"))
        } else {
            this.do_share.removeAttr("disabled")
            this.do_share_label.text("")
        }
    }

    private displayPlaylist(playlistId: number, availablePlaylists: any) {
        let playlist: Playlist = availablePlaylists[playlistId]
        this.playlist_rename.val(playlist.name)
        this.toggleDoShare(playlist.tracks.length === 0)
    }

    private reset() {
        this.playlist_selector.html("")
        this.playlist_selector.off("change")
        this.do_share.off("click")
        this.results.fadeOut()
        this.view_link.val("")
        this.share_link.val("")
        $(".copy-link").find(".i18n").text(this.messages.trad("copy"))
        $(".copy-link").find(".glyphicon")
                       .addClass("glyphicon-copy")
                       .removeClass("glyphicon-ok-circle glyphicon-remove-circle")
    }
}
