import { singleton } from "./injection"
import { Track } from "../db/metadata/model"
import { inject } from "inversify"
import {
    TrackMetadataRequest,
    TrackMetadataResolver
} from "./TrackMetadataResolver"
import { BrowserHelper } from "./BrowserHelper"

@singleton
export class DomHelper {
    @inject(TrackMetadataResolver)
    metadataResolver: TrackMetadataResolver

    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    ctrlDown:boolean = false

    init() {
        if (this.browserHelper.getBrowser() !== "Chrome") {
            $(".chrome-only").remove()
        }

        if (this.browserHelper.getBrowser() !== "Firefox") {
            $(".firefox-only").remove()
        }

        $("[data-toggle=\"tooltip\"]").tooltip()

        const manifest = chrome.runtime.getManifest()
        $(".version").text("v" + manifest.version)
        $(".contact").attr("href", "mailto:" + manifest.author)

        $(".expandable-input-toggle").on("click", e => {
            let $container = $(e.target).closest(".expandable-input-container")
            if ($container.hasClass("open")) {
                $container.find(".expandable-input").trigger("blur")
            } else {
                $container.find(".expandable-input").trigger("focus")
            }
            $container.toggleClass("open", 400)
        })

        this.handleWindowResize()
        this.playlistTabsAnimation()
        this.listenForCtrlKey()
        this.initGradiantBackground()
    }

    private handleWindowResize() {
        const $player_container = $("#player_container")
        const $footer = $("footer")
        const $pills = $("#playlists_container_tabs")
        const $resizable_content = $("#resizable_content")
        const resizeContent = function () {
            let new_height = $(window).innerHeight()
                             - $player_container.outerHeight(true)
                             - $footer.outerHeight(true)
                             - $pills.outerHeight(true)
            $resizable_content.css("height", new_height + "px")
            $resizable_content.css("max-height", new_height + "px")
            $(".modal-body").css("max-height", (new_height + 70) + "px")
            $(".modal-body").css("overflow-y", "auto")
        }
        $(window).on("resize", resizeContent)
        resizeContent()
    }

    private playlistTabsAnimation() {
        $("#playlists_container_tabs").on("show.bs.tab", ".playlist-tab", function (e) {
            let $out = $("li.active > .playlist-tab")
            let $panel_out = $($out.attr("href"))
            let index_out = $out.parent().index()
            let $in = $(e.target)
            let $panel_in = $($in.attr("href"))
            let index_in = $in.parent().index()
            $(".tab-pane").removeClass("animated slideOutRight slideInLeft slideOutLeft slideInRight")
            if (index_in < index_out) {
                $panel_out.addClass("animated slideOutRight")
                $panel_in.addClass("animated slideInLeft")
            } else {
                $panel_out.addClass("animated slideOutLeft")
                $panel_in.addClass("animated slideInRight")
            }
        })
    }

    private listenForCtrlKey() {
        $(window).on("keydown", e => {
            let code = e.keyCode || e.which
            switch (code) {
                case 93: // Win: Win key; Mac: L-cmd
                case 91: // Win: Win menu; Mac: R-cmd
                case 17: // CTRL
                    this.ctrlDown = true
            }
        })

        $(window).on("keyup", e => {
            let code = e.keyCode || e.which
            switch (code) {
                case 93: // Win: Win key; Mac: L-cmd
                case 91: // Win: Win menu; Mac: R-cmd
                case 17: // CTRL
                    this.ctrlDown = false
                    break
            }
        })
    }

    private initGradiantBackground() {
        let colors = [[62, 35, 255],
            [60, 255, 60],
            [255, 35, 98],
            [45, 175, 230],
            [255, 0, 255],
            [255, 128, 0]]

        let step = 0
        let colorIndices = [0, 1, 2, 3]
        let gradientSpeed = 0.01

        function updateGradient() {

            let c0_0 = colors[colorIndices[0]]
            let c0_1 = colors[colorIndices[1]]
            let c1_0 = colors[colorIndices[2]]
            let c1_1 = colors[colorIndices[3]]

            let istep = 1 - step
            let r1 = Math.round(istep * c0_0[0] + step * c0_1[0])
            let g1 = Math.round(istep * c0_0[1] + step * c0_1[1])
            let b1 = Math.round(istep * c0_0[2] + step * c0_1[2])
            let color1 = "rgb(" + r1 + "," + g1 + "," + b1 + ")"

            let r2 = Math.round(istep * c1_0[0] + step * c1_1[0])
            let g2 = Math.round(istep * c1_0[1] + step * c1_1[1])
            let b2 = Math.round(istep * c1_0[2] + step * c1_1[2])
            let color2 = "rgb(" + r2 + "," + g2 + "," + b2 + ")"

            $(".gradient-background")
                .css({
                         background: "-webkit-gradient(linear, right top, left bottom, from(" + color1 + "), to(" + color2 + "))"
                     })
                .css({
                         background: "-moz-linear-gradient(left, " + color1 + " 0%, " + color2 + " 100%)"
                     })

            step += gradientSpeed
            if (step >= 1) {
                step %= 1
                colorIndices[0] = colorIndices[1]
                colorIndices[2] = colorIndices[3]

                //pick two new target color indices
                //do not pick the same as the current one
                colorIndices[1] = (colorIndices[1] + Math.floor(1 + Math.random() * (colors.length - 1))) % colors.length
                colorIndices[3] = (colorIndices[3] + Math.floor(1 + Math.random() * (colors.length - 1))) % colors.length

            }
        }

        setInterval(updateGradient, 100)
    }

    setPlayingTrackMetas(trackElement: JQuery<HTMLElement>) {
        let container = $("#player_container")
        let displayedTrackId = container.find(".details").attr("data-id")
        let playingTrackId = trackElement.attr("data-id")
        if (displayedTrackId == null || playingTrackId !== displayedTrackId) {
            let url = trackElement.data("url")
            $("#edit_playing_metas").removeClass("can-edit")
            container.find(".thumbnail-container .gradient-background").fadeIn()
            container.find(".thumbnail-container img").fadeOut(400, () => {
                document.title = trackElement.attr("title")
                container.find(".title").text(trackElement.attr("title"))
                container.find(".artist").text("")

                let request: TrackMetadataRequest = {
                    url: url,
                    track_id: playingTrackId == null ? null : +playingTrackId,
                    topPriority: true,
                    callback: track => {
                        trackElement.attr("data-id", track.track_id)
                        container.find(".details").attr("data-id", track.track_id)
                        this.displayMetas(track, container)
                        $("#edit_playing_metas").addClass("can-edit")
                    }
                }
                this.metadataResolver.getTrackMeta(request)
            })
        }
    }

    displayMetas(track: Track, container: JQuery<HTMLElement>) {
        container.find(".details").attr("data-id", track.track_id)
        if (track.lastfm_url) {
            container.find(".title")
                     .html($("<a target=\"_blank\">")
                               .attr("href", track.lastfm_url)
                               .text(track.title).html())
        } else {
            container.find(".title").text(track.title)
        }
        container.find(".artist").text(track.artist)
        if (track.thumbnail) {
            container.find(".thumbnail-container img")
                     .attr("src", track.thumbnail)
                     .fadeIn()
            container.find(".thumbnail-container .gradient-background").fadeOut()
        } else {
            container.find(".thumbnail-container img")
                     .attr("src", "")
                     .fadeOut()
            container.find(".thumbnail-container .gradient-background").fadeIn()
        }
    }

    highlight(element: JQuery<HTMLElement>) {
        // toggleClass from jQuery UI
        // @ts-ignore
        element.toggleClass("highlighted", 100, () => element.toggleClass("highlighted", 900))
    }

    editElement(element: JQuery<HTMLElement>) {
        element.children().remove()
        element.attr("contenteditable", "true")
        element.trigger("focus")
        let range = document.createRange()
        range.selectNodeContents(element[0])
        let sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
    }

    isCtrlDown() {
        return this.ctrlDown
    }
}
