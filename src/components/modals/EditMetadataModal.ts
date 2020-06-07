import { singleton } from "../../utils/injection"
import { inject } from "inversify"
import { MusicLibrary } from "../MusicLibrary"
import {
    LastFMMetadata,
    Track
} from "../../db/metadata/model"
import { UrlHelper } from "../../utils/UrlHelper"
import { MessagesHelper } from "../../utils/MessagesHelper"
import { TrackMetadataResolver } from "../../utils/TrackMetadataResolver"
import { DomHelper } from "../../utils/DomHelper"
import KeyDownEvent = JQuery.KeyDownEvent

@singleton
export class EditMetadataModal {
    @inject(MusicLibrary)
    library: MusicLibrary

    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(UrlHelper)
    urlHelper: UrlHelper

    @inject(TrackMetadataResolver)
    metadataResolver: TrackMetadataResolver

    @inject(DomHelper)
    domHelper: DomHelper

    private track: Track = null
    private url: string = null

    private modal: JQuery<HTMLElement> = $("#modal_edit_metas")
    private metasModel: JQuery<HTMLElement> = $("#search_metas_result_model")
    private currentMetas: JQuery<HTMLElement> = $("#current_metas")
    private results: JQuery<HTMLElement> = $("#search_metas_results")
    private query: JQuery<HTMLInputElement> = $("#search_metas_query")
    private doSearchButton: JQuery<HTMLButtonElement> = $("#do_search_metas")

    init() {
        this.query.on("keydown", (e: KeyDownEvent) => {
            let code = e.keyCode || e.which
            if (code == 13) {
                e.preventDefault()
                e.stopPropagation()
                this.doSearchButton.trigger("click")
                return false
            }
        })

        this.modal.on("hidden.bs.modal", () => {
            this.currentMetas.html("")
            this.results.html("")
            this.query.val("")

            let label = this.track.artist ? this.track.artist + " - " + this.track.title : this.track.title
            $(".track[data-url=\"" + this.url + "\"]")
                .attr("data-artist", this.track.artist || "")
                .attr("data-title", this.track.title)
                .find(".track-title")
                .text(label)
            if (this.track && this.url === $(".track.playing").data("url")) {
                this.domHelper.displayMetas(this.track, $("#player_container"))
            }

            this.track = null
            this.url = null
            this.doSearchButton.off("click")
        })
    }

    async editFor(url: string) {
        this.url = url
        this.track = await this.library.searchTrackByUrl(url)
        if (this.track == null) {
            this.modal.modal("hide")
            return
        }

        this.query.val(this.urlHelper.getCleanTitleFromUrl(url))

        this.currentMetas.html(this.metasModel.html())
        this.domHelper.displayMetas(this.track, this.currentMetas.find(".search-metas-result"))
        this.currentMetas.find(".select-metas")
            .text(this.messages.trad("clean"))
            .on("click", async e => {
                this.track = await this.library.updateTrack(this.track, this.track.possible_metas, -1)
                this.domHelper.displayMetas(this.track, this.currentMetas.find(".search-metas-result"))
            })

        this.displaySearchResults(url, this.track.possible_metas)

        this.doSearchButton
            .off("click")
            .on("click", e => {
                let query = this.query.val() as string
                if (query) {
                    this.metadataResolver.requestFromApi(query)
                        .then(results => this.displaySearchResults(url, results))
                }
            })
        this.modal.modal("show")
    }

    private displaySearchResults(url: string, lastfm_results: Array<LastFMMetadata>) {
        this.results.html("")
        lastfm_results.forEach((m, i) => {
            this.results.append(this.metasModel.html())
            let result = this.results.find(".search-metas-result:eq(" + i + ")")
            this.domHelper.displayMetas(this.library.preview(this.track, lastfm_results, i), result)
            result.find(".select-metas")
                  .on("click", async e => {
                      this.track = await this.library.updateTrack(this.track, lastfm_results, i)
                      let container = this.currentMetas.find(".search-metas-result")
                      this.domHelper.displayMetas(this.track, container)
                      this.domHelper.highlight(container)
                      if (this.track && url === $(".track.playing").data("url")) {
                          this.domHelper.displayMetas(this.track, $("#player_container"))
                      }
                  })
        })
        if (!lastfm_results.length) {
            this.results.text(this.messages.trad("no_results"))
        }
    }
}
