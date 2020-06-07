import { singleton } from "../../utils/injection"
import { inject } from "inversify"
import { PlaylistsManager } from "../PlaylistsManager"
import { BrowserHelper } from "../../utils/BrowserHelper"
import { UrlHelper } from "../../utils/UrlHelper"
import { MessagesHelper } from "../../utils/MessagesHelper"
import JSZip = require("jszip")
import ClickEvent = JQuery.ClickEvent

@singleton
export class PlaylistDownloaderModal {
    @inject(PlaylistsManager)
    playlists: PlaylistsManager

    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    @inject(UrlHelper)
    urlHelper: UrlHelper

    @inject(MessagesHelper)
    messages: MessagesHelper

    private modal: JQuery<HTMLElement> = $("#playlist_downloader")
    private downloads_list: JQuery<HTMLElement> = $("#downloads_list")
    private cancel_btn: JQuery<HTMLElement> = $("#cancel_download_current_playlist")
    private dpp: JQuery<HTMLElement> = $("#download_playlist_progress")
    private progress_message: JQuery<HTMLElement> = $("#progress_message")
    private progress_bar = {
        success: this.dpp.find(".progress-bar-success"),
        downloading: this.dpp.find(".progress-bar-warning"),
        failed: this.dpp.find(".progress-bar-danger")
    }
    private is_downloading = false

    init() {
        this.cancel_btn.fadeOut()

        this.modal.on("show.bs.modal", () => {
            $("#input_playlist_container")
                .html("")
                .append(this.playlists.getPlaylistSelector("input_playlist", true).addClass("form-control"))
        })

        $("#download_current_playlist").on("click", (e: ClickEvent) => {
            e.preventDefault()
            if (this.is_downloading) {
                return false
            }

            this.progress(0, 0, 0, 1)
            this.downloads_list.html("")
            this.progress_message.text("")

            let tracks = this.playlists.getPlaylistTracksFromDom(+$("#input_playlist").val())
            if (!tracks.length) {
                return false
            }

            this.startDownload(tracks)
            return false
        })
    }

    private startDownload(tracks: Array<string>) {
        this.is_downloading = true
        tracks.forEach(url => {
            let title = this.urlHelper.getTitleFromUrl(url)
            this.downloads_list.append($("<div>")
                                           .addClass("track pending")
                                           .data("url", url).text(title))
        })

        let total_tracks = tracks.length
        let zip_filename = ($("#file_name").val() as string).replace(/[|&;:'$%@"<>+,\/\\*?²\t^]/g, "").replace(/^\.*/g, "")
        if (!zip_filename.length) {
            zip_filename = "something"
        }
        zip_filename.replace(/\.zip$/i, "")
        const max_concurrent_downloads = 3
        const cancel_on_failure = $("#cancel_on_failure-1").is(":checked")
        let canceled = false
        let zip = new JSZip()
        let current_size = 0
        let part = 1

        const pending_dl = () => this.downloads_list.find(".track.pending")
        const downloading_dl = () => this.downloads_list.find(".track.downloading")
        const success_dl = () => this.downloads_list.find(".track.success")
        const failed_dl = () => this.downloads_list.find(".track.failed")
        const updateProgress = () => this.progress(
            success_dl().length,
            downloading_dl().length,
            failed_dl().length,
            total_tracks
        )

        this.cancel_btn.fadeIn()

        let addToDownloadQueue = setInterval(() => {
            if (canceled || pending_dl().length === 0) {
                clearInterval(addToDownloadQueue)
                return
            }
            if (downloading_dl().length < max_concurrent_downloads) {
                let track = pending_dl().first()
                let url = track.data("url")
                let default_filename = this.urlHelper.getFilenameFromUrl(url)
                let dlFailedTemplate = this.messages.trad("dl_has_failed")
                track.removeClass("pending")
                track.addClass("downloading")
                updateProgress()

                let xhr = new XMLHttpRequest()
                xhr.open("GET", this.urlHelper.proxyUrlIfNeeded(url), true)
                xhr.responseType = "blob"

                xhr.onload = function () {
                    if (canceled) {
                        return
                    }
                    track.removeClass("downloading")
                    let filename = ((this.getResponseHeader("Content-Disposition") || "").match(/filename="([^"]+)"/) || [])[1] || default_filename
                    if (+this.status === 200) {
                        let data = this.response
                        let file_if_exists = zip.file(filename)
                        while (file_if_exists) {
                            filename = filename.replace(/ ?(\((\d+)\))?(\.[a-z0-9]+)?$/i, (match, cnt, digit, ext) => " (" + ((+digit || 0) + 1) + ")" + (ext || ""))
                            file_if_exists = zip.file(filename)
                        }
                        zip.file(filename, data)
                        current_size += +this.getResponseHeader("Content-Length") || 0
                        track.addClass("success")
                    } else {
                        track.addClass("failed")
                        if (cancel_on_failure) {
                            canceled = true
                            alert(dlFailedTemplate.replace(/_title_/, filename))
                        }
                    }
                    updateProgress()
                }

                xhr.send()
            }
        }, 500)

        let checkIfFinished = setInterval(() => {
            if (canceled) {
                pending_dl().removeClass("pending").addClass("failed")
                downloading_dl().removeClass("downloading").addClass("failed")
                updateProgress()
            }
            let done = success_dl().length === (total_tracks - failed_dl().length)
            if (done) {
                clearInterval(checkIfFinished)
                this.is_downloading = false
                this.cancel_btn.fadeOut()
            }
            if (current_size > 100000000 || (current_size > 0 && done)) {
                let to_dl = zip
                zip = new JSZip()
                to_dl.generateAsync({type: "blob"})
                     .then(function (content) {
                         // @ts-ignore
                         window.saveAs(content, zip_filename + (part === 1 && done ? "" : " - " + part) + ".zip")
                         part++
                         to_dl = null
                     })
                current_size = 0
            }
        }, 400)

        this.cancel_btn.off("click").on("click", () => {
            canceled = true
        })
    }

    private progress(success: number, downloading: number, failed: number, total: number) {
        this.progress_bar.success.animate({width: (success * 100 / total) + "%"}, 400)
        this.progress_bar.downloading.animate({width: (downloading * 100 / total) + "%"}, 400)
        this.progress_bar.failed.animate({width: (failed * 100 / total) + "%"}, 400)
        let queue = total - success - failed
        let trad = queue > 0 ? this.messages.trad("downloading_progress") : this.messages.trad("downloading_done")
        this.progress_message.text(trad.replace("__q__", "" + queue)
                                       .replace("__s__", "" + success)
                                       .replace("__f__", "" + failed))
    }
}
