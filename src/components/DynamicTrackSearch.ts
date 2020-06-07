import { singleton } from "../utils/injection"
import { inject } from "inversify"
import { BrowserHelper } from "../utils/BrowserHelper"
import KeyDownEvent = JQuery.KeyDownEvent
import { MessagesHelper } from "../utils/MessagesHelper"
import { PlaylistsManager } from "./PlaylistsManager"
import { UrlHelper } from "../utils/UrlHelper"

interface SearchResult {
    href: string
    label: string
}

@singleton
export class DynamicTrackSearch {
    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    @inject(UrlHelper)
    urlHelper: UrlHelper

    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(PlaylistsManager)
    playlists: PlaylistsManager

    private $dts: JQuery<HTMLInputElement> = $("#dynamic_track_search")
    private $dts_query_container: JQuery<HTMLInputElement> = $("#dynamic_track_search_query_container")
    private $dts_query: JQuery<HTMLInputElement> = $("#dynamic_track_search_query")
    private $dts_toggle: JQuery<HTMLInputElement> = $("#dynamic_track_search_query_container .search-toggle")
    private $dts_results: JQuery<HTMLInputElement> = $("#dynamic_track_results")
    private $dts_loading: JQuery<HTMLInputElement> = $("#dynamic_track_search > .loading")
    private $dts_more_results: JQuery<HTMLInputElement> = $("#dynamic_track_search > .more-results")
    private $dts_template: JQuery<HTMLInputElement> = $("#dynamic_track_result_template")

    init() {
        this.$dts_query.on('focus', e => {
            setTimeout(() => {
                if (!this.$dts_query_container.hasClass('open')){
                    this.$dts_toggle.click()
                }
            }, 100)
        });

        this.$dts_toggle
            .off("click")
            .on("click", () => {
                let dts_classes = ['col-xs-1 col-md-1 col-lg-1', 'col-xs-6 col-md-4 col-lg-4'];
                let playlist_classes = ['col-xs-10 col-xs-offset-1 col-md-offset-2 col-lg-offset-3', 'col-xs-6 col-xs-offset-0 col-md-offset-0 col-lg-offset-1'];
                let add = 0, remove = 1;
                if (this.$dts_query_container.hasClass('open')) {
                    this.$dts_results.html('');
                    this.$dts_loading.addClass('hidden');
                    this.$dts_more_results.addClass('hidden');
                    // @ts-ignore
                    this.$dts_query_container.animate({width: 25}, 200, e => {
                        $('#dynamic_track_search').switchClass(dts_classes[remove], dts_classes[add]);
                        $('#playlist_container').switchClass(playlist_classes[remove], playlist_classes[add]);
                    });
                    this.$dts_query.blur();
                } else {
                    add = 1;
                    remove = 0;
                    // @ts-ignore
                    $('#dynamic_track_search').switchClass(dts_classes[remove], dts_classes[add], e => {
                        this.$dts_query_container.animate({width: this.$dts_results.width()}, 200);
                    });
                    $('#playlist_container').switchClass(playlist_classes[remove], playlist_classes[add]);
                    this.$dts_query.focus();
                }
                this.$dts_query_container.toggleClass('open');
                this.$dts_toggle.toggleClass('glyphicon-search glyphicon-remove');
            })
        $(window).on("resize", () => this.$dts_query_container.css({width: this.$dts_query_container.hasClass("open") ? this.$dts_results.width() : 25}))

        this.$dts.on("keydown", e => e.stopPropagation())

        this.$dts_query.on("keydown", e => {
            let code = e.keyCode || e.which
            if (+code === 13) {
                this.$dts_results.html("")
                this.googleSearch(this.$dts_query.val() as string, 0)
            }
        })
    }

    private googleSearch(query: string, offset: number) {
        if (!this.$dts_loading.hasClass("hidden")) {
            return
        }
        this.$dts_loading.removeClass("hidden")
        let template = "https://www.google.com/search?q=__query__+%28mp3%7Cogg%7Copus%7Coga%7Cflac%7Cwav%7Caac%7Cm4a%29+intitle%3A\"index.of.%2F\"" + (offset ? "&start=" + offset : "")
        let url = template.replace("__query__", encodeURIComponent(query || ""))
        this.browserHelper.openTabSendMessageDoThings(
            url,
            {text: "get_search_results"},
            response => this.displaySearchResults(response.results, offset),
            () => {
            },
            () => this.displaySearchResults()
        )
        this.$dts_more_results.off("click").on("click", () => this.googleSearch(query, offset + 10))
    }

    private displaySearchResults(results: Array<SearchResult> = null, offset: number = 0) {
        this.$dts_loading.addClass("hidden")
        if (!results || !results.length) {
            this.$dts_results.append($("<p>").text(this.messages.trad("no_results")))
            this.$dts_more_results.addClass("hidden")
            return
        }
        results.forEach((r, i) => {
            let $result = $(this.$dts_template.html().replace(/{index}/g, "" + (i + offset)))
            let $title = $result.find(".panel-title > a.toggle-collapse")
            $title
                .text(r.label)
                .on("click", () => {
                    let $body = $result.find(".panel-body")
                    let $message = $body.find(".message")
                    let $scan_results = $result.find(".scan-results")
                    let $gif = $body.find(".loading")
                    $("#dts_destination").remove()
                    this.$dts_results.find(".panel").removeClass("open")
                    if ($title.hasClass("collapsed")) {
                        $result.addClass("open")
                        $gif.removeClass("hidden")
                        $scan_results.addClass("hidden")
                        $message.addClass("hidden")

                        let onfulfilled = (links: Array<string>) => {
                            $gif.addClass("hidden")
                            $message.removeClass("alert-danger hidden")
                                    .text(this.messages.trad("scan_results").replace("_nb_", "" + links.length))
                            if (links.length) {
                                let select = this.playlists.getPlaylistSelector("dts_destination", true).addClass("form-control input-xs")
                                let getPlaylistId = () => +select.val()
                                $scan_results.find(".file-list")
                                             .html("")
                                             .append(links.map(l => $("<tr>")
                                                 .append($("<td>").text(this.urlHelper.getFilenameFromUrl(l)))
                                                 .append(
                                                     $("<td>")
                                                         .append(
                                                             $("<span class=\"control glyphicon glyphicon-plus\">")
                                                                 .on("click", () => this.playlists.addTracks([l], getPlaylistId()))
                                                         )
                                                 ))
                                             )
                                $scan_results.removeClass("hidden")
                                select.append($("<option value=\"-1\">").text(this.messages.trad("new_playlist")))
                                $scan_results.find(".input-container")
                                             .append(select)
                                $scan_results.find(".set-as-playlist").on("click", () => {
                                    if (getPlaylistId() !== -1) {
                                        this.playlists.emptyPlaylist(getPlaylistId())
                                    }
                                })
                                $scan_results.find(".add-to-playlist, .set-as-playlist").on("click", () => {
                                    let playlist_id = getPlaylistId()
                                    if (playlist_id === -1) {
                                        this.playlists.newCustomPlaylist(links)
                                    } else {
                                        this.playlists.addTracks(links, playlist_id)
                                    }
                                })
                            }
                        }
                        let onFailure = () => {
                            $gif.addClass("hidden")
                            $message
                                .removeClass("hidden").addClass("alert-danger")
                                .text(this.messages.trad("load_url_error"))
                        }
                        this.browserHelper.getPlaylist(r.href, onfulfilled, onFailure)
                    }
                })
            $result.find(".panel-title > a.direct-link")
                   .attr("href", r.href)
                   .attr("title", r.href.replace(/^(.{40}).*$/, (f, m) => m + "..."))
                   .tooltip()
            this.$dts_results.append($result)
        })
        this.$dts_more_results.removeClass("hidden")
    }
}
