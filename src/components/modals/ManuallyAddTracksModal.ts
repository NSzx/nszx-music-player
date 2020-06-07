import { singleton } from "../../utils/injection"
import { inject } from "inversify"
import { BrowserHelper } from "../../utils/BrowserHelper"
import { UrlHelper } from "../../utils/UrlHelper"
import { MessagesHelper } from "../../utils/MessagesHelper"
import { PlaylistsManager } from "../PlaylistsManager"
import ClickEvent = JQuery.ClickEvent
import KeyDownEvent = JQuery.KeyDownEvent


@singleton
export class ManuallyAddTracksModal {
    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    @inject(UrlHelper)
    urlHelper: UrlHelper

    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(PlaylistsManager)
    playlists: PlaylistsManager

    private query: JQuery<HTMLInputElement> = $("#open_directories_query")
    private search_OD_button: JQuery<HTMLInputElement> = $("#do_search_open_directories")
    private $mat: JQuery<HTMLElement> = $("#manually_add_tracks")
    private $mat_result_message: JQuery<HTMLInputElement> = $("#mat_results")
    private $mat_div_result: JQuery<HTMLInputElement> = $("#mat_result_div")
    private $mat_load_button: JQuery<HTMLInputElement> = $("#mat_load")
    private $matl_load_button: JQuery<HTMLInputElement> = $("#matl_load")

    init() {
        this.query.on("keydown", (e: KeyDownEvent) => {
            let code = e.keyCode || e.which
            if (code == 13) {
                e.preventDefault()
                e.stopPropagation()
                this.search_OD_button.trigger("click")
                return false
            }
        })

        this.search_OD_button.on("click", () => {
            let template = "https://www.google.com/search?q=__query__+%28mp3%7Cogg%7Copus%7Coga%7Cflac%7Cwav%7Caac%7Cm4a%29+intitle%3A\"index.of.%2F\""
            let searchUrl = template.replace("__query__", encodeURIComponent(this.query.val() as string || ""))
            this.browserHelper.openInNewTab(searchUrl)
        })

        this.$mat.on("hidden.bs.modal", () => {
            $("#mat_url").val("")
            $("#matl_urls").val("")
            this.$mat_div_result.fadeOut()
        })

        this.$mat_load_button.on("click", (e: ClickEvent) => {
            e.preventDefault()
            let url = $("#mat_url").val() as string
            this.$mat_div_result.fadeIn()
            this.$mat_result_message.removeClass("alert-danger alert-success").text(this.messages.trad("Processing"))
            if (url.length) {
                let onfulfilled = (links: Array<string>) => {
                    this.playlists.addTracks(links)
                    this.$mat_result_message.addClass("alert-success").text(this.messages.trad("scan_results").replace("_nb_", "" + links.length))
                }
                let onFailure = () => {
                    this.$mat_result_message.addClass("alert-danger").text(this.messages.trad("load_url_error"))
                }
                this.browserHelper.getPlaylist(url, onfulfilled, onFailure)
            } else {
                this.$mat_result_message.addClass("alert-danger").text(this.messages.trad("invalid_url"))
            }
            return false
        })

        this.$matl_load_button.on("click", (e: ClickEvent) => {
            e.preventDefault()
            this.$mat_div_result.fadeIn()
            let urls = $("#matl_urls").val() as string
            let links = urls.split(",")
                            .map(url => url.trim())
                            .filter(url => url.length)
            this.playlists.addTracks(links)
            this.$mat_result_message
                .removeClass("alert-danger")
                .addClass("alert-success")
                .text(this.messages.trad("n_tracks_added").replace("_nb_", "" + links.length))
            return false
        })

    }
}
