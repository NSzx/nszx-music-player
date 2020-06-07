import { singleton } from "../utils/injection"
import { inject } from "inversify"
import { ConfigurationModal } from "./modals/ConfigurationModal"
import { MusicPlayer } from "./MusicPlayer"
import { MusicLibrary } from "./MusicLibrary"
import { BrowserHelper } from "../utils/BrowserHelper"

@singleton
export class Analytics {
    @inject(ConfigurationModal)
    configuration: ConfigurationModal

    @inject(MusicPlayer)
    player: MusicPlayer

    @inject(MusicLibrary)
    library: MusicLibrary

    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    identity: string

    init() {
        this.browserHelper.get("identity")
            .then((identity) => {
                if (identity) {
                    this.identity = identity
                    this.initGA()
                } else {
                    this.createIdentity()
                        .then(() => this.initGA())
                }
            })
    }

    private async createIdentity(): Promise<string> {
        this.identity = await fetch("https://www.random.org/integers/?num=5&min=0&max=1000000000&col=1&base=10&format=plain&rnd=new")
            .then(r => r.text())
            .then(body => body.replace(/\s+$/g, "").replace(/\s+/g, "-"))

        this.browserHelper.set("identity", this.identity)
        return this.identity
    }

    private initGA() {
        const manifest = chrome.runtime.getManifest()
        const initTracker = (tracker: any) => {
            tracker.set({
                            appId: chrome.runtime.id,
                            appName: manifest.name,
                            appVersion: manifest.version,
                            page: "/mediaplayer.html",
                            userId: this.identity,
                            dimension1: this.identity
                        })
            tracker.send("pageview")
            $(".modal").on("shown.bs.modal", function () {
                if (this.id !== "loading_modal") {
                    tracker.send("event", "Modal", this.id)
                }
            })
            chrome.runtime.onMessage.addListener(function (msg) {
                let action
                switch (msg.text || "") {
                    case "set_as_playlist":
                        action = "Set"
                    //NO BREAK
                    case "add_to_playlist":
                        action = action || "Add"
                        tracker.send("event", {
                            "eventCategory": "Playlist",
                            "eventAction": action,
                            "eventValue": msg.playlist.length
                        })
                        break
                }
            })
            let timeout: any = null
            this.player.onDurationChange(() => {
                if (timeout) {
                    clearTimeout(timeout)
                }
                timeout = setTimeout(async () => {
                    const track = $(".track.playing")
                    const meta = await this.library.searchTrackByUrl(track.data("url"))
                    if (meta) {
                        tracker.send("event", {
                            "eventCategory": "Player",
                            "eventAction": "Play",
                            "eventLabel": meta.artist + " - " + meta.title
                        })
                    }
                    timeout = null
                }, 5000)
            })
            this.player.onEnded(async () => {
                const track = $(".track.playing")
                const meta = await this.library.searchTrackByUrl(track.data("url"))
                if (meta) {
                    tracker.send("event", {
                        "eventCategory": "Player",
                        "eventAction": "Ended",
                        "eventLabel": meta.artist + " - " + meta.title
                    })
                }
            })
            $("#dynamic_track_search_query").on("keydown", e => {
                let code = e.keyCode || e.which
                if (+code === 13) {
                    tracker.send("event", {
                        "eventCategory": "DTS",
                        "eventAction": "Search",
                        "eventLabel": $("#dynamic_track_search_query").val()
                    })
                }
            })
            let $dts_results = $("#dynamic_track_results")
            $dts_results.on("click", ".toggle-collapse", e => {
                let $this = $(e.target)
                if ($this.hasClass("collapsed")) {
                    tracker.send("event", {
                        "eventCategory": "DTS",
                        "eventAction": "Analyse",
                        "eventLabel": $this.text()
                    })
                }
            })
            $dts_results.on("click", ".add-to-playlist, .set-as-playlist", e => {
                let $this = $(e.target)
                let $panel = $this.closest(".panel")
                tracker.send("event", {
                    "eventCategory": "DTS",
                    "eventAction": $this.data("action"),
                    "eventLabel": $panel.find(".toggle-collapse").text(),
                    "eventValue": $panel.find(".file-list").find("tr").length
                })
            })
        }
        setTimeout(() => {
            if (this.configuration.isAnalyticsActive()) {
                //@ts-ignore
                window.ga(initTracker)
            } else {
                initTracker({set: console.log, send: console.log})
            }
        }, 200)
    };
}
