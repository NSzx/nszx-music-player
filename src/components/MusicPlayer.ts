import { singleton } from "../utils/injection"
import { inject } from "inversify"
import { CurrentPlaylist } from "./CurrentPlaylist"
import { random } from "../utils/array"
import { DomHelper } from "../utils/DomHelper"
import { MessagesHelper } from "../utils/MessagesHelper"
import { EditMetadataModal } from "./modals/EditMetadataModal"
import { BrowserHelper } from "../utils/BrowserHelper"
import KeyDownEvent = JQuery.KeyDownEvent

@singleton
export class MusicPlayer {
    @inject(CurrentPlaylist)
    playlist: CurrentPlaylist

    @inject(DomHelper)
    domHelper: DomHelper

    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(EditMetadataModal)
    editMetadata: EditMetadataModal

    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    private audio_player: JQuery<HTMLAudioElement> = $("#audio_player")
    private track_slider: JQuery<HTMLInputElement> = $("#track_slider")
    private playPauseButton: JQuery<HTMLButtonElement> = $("#toggle_play_pause")
    private repeatButton: JQuery<HTMLElement> = $("#repeat")
    private randomizeButton: JQuery<HTMLElement> = $("#randomize")

    private randomized: boolean = false
    private recentlyPlayed: Array<string> = []

    init() {
        this.initAudioPlayer()
        this.initTrackSlider()
        this.initVolumeSlider()
        this.initButtons()
        this.initKeyboardInputs()
    }

    private initAudioPlayer() {
        this.audio_player.on("play", () => {
            const track = $(".track.playing")
            if (track.length) {
                this.domHelper.setPlayingTrackMetas(track)
            }
            this.playPauseButton.removeClass("glyphicon-play").addClass("glyphicon-pause")
        })

        this.audio_player.on("pause", () => {
            document.title = this.messages.trad("extension_name")
            this.playPauseButton.removeClass("glyphicon-pause").addClass("glyphicon-play")
        })

        this.audio_player.on("ended", () => {
            setTimeout(() => {
                if (this.repeatButton.hasClass("one")) {
                    this.pause()
                    this.backToStart()
                    this.play()
                } else {
                    this.next()
                }
            }, 500)
        })

        this.audio_player.on("error", () => {
            if (this.currentTime() > 0) {
                this.pause()
                this.audio_player.trigger("ended")
            } else {
                let e = this.audio_player[0].error
                const messages = ["MEDIA_ERR_ABORTED", "MEDIA_ERR_DECODE", "MEDIA_ERR_NETWORK", "MEDIA_ERR_SRC_NOT_SUPPORTED"]
                let message = this.messages.trad("an_error_occurred") + " (" + messages[e.code - 1] + ")"
                let playing = this.playlist.getPlayingTrack()
                if (!playing.hasClass("failed")) {
                    playing.addClass("failed")
                           .append($("<span data-placement=\"left\" data-toggle=\"tooltip\">")
                                       .addClass("pull-right glyphicon glyphicon-exclamation-sign error-tooltip")
                                       .attr("title", message).tooltip())
                }
            }
        })
    }

    private initTrackSlider() {
        let updatable = true
        this.track_slider.on("mousedown", () => {
            updatable = false
        })
        this.track_slider.on("mouseup", () => {
            updatable = true
        })
        this.track_slider.on("keydown", e => (e.keyCode || e.which) == 9 || e.preventDefault())
        this.track_slider.on("change", () => this.audio_player.prop("currentTime", +this.track_slider.val() / 10))
        const updateTime = () => {
            let d = this.audio_player.prop("duration")
            let t = this.audio_player.prop("currentTime")
            let l = this.getLoadedData()
            let played = d ? Math.floor(t * 1000 / d) / 10 : 0
            let loaded = d ? Math.floor(l * 1000 / d) / 10 : 0
            $("#time_display").text(this.messages.time(t) + " / " + this.messages.time(d))
            if (updatable) {
                this.track_slider.attr("max", d * 10)
                this.track_slider.val(t * 10)
            }
            this.track_slider.css("background", "linear-gradient(90deg, var(--controls-color-active) " + played + "%, var(--controls-color-hover) " + played + "%, var(--controls-color-hover) " + loaded + "%, var(--controls-color-inactive) " + loaded + "%)")
        }
        this.audio_player.on("durationchange", updateTime)
        this.audio_player.on("timeupdate", updateTime)
    }

    private initVolumeSlider() {
        let volume_slider = $("#volume_slider")
        let $mute = $("#mute")

        volume_slider.on("keydown", e => (e.keyCode == 37 || e.keyCode == 39) ? e.stopPropagation() : true)
        volume_slider.on("input", () => {
            let v = +volume_slider.val()
            if (v > 0) {
                this.audio_player.prop("muted", false)
            } else {
                this.audio_player.prop("muted", true)
            }
            this.audio_player.prop("volume", v / 100)
        })
        const updateVolume = () => {
            let v = this.audio_player.prop("muted") ? 0 : this.audio_player.prop("volume") * 100
            volume_slider.val(v)
            volume_slider.css("background", "linear-gradient(90deg, var(--controls-color) " + v + "%, var(--controls-color-hover) " + v + "%)")
            $mute.removeClass("glyphicon-volume-up glyphicon-volume-off")
            $mute.addClass(this.audio_player.prop("muted") ? "glyphicon-volume-off" : "glyphicon-volume-up")
            this.browserHelper.set("audio_player_volume", v)
        }
        $mute.on("click", () => {
            $mute.toggleClass("glyphicon-volume-up glyphicon-volume-off")
            this.audio_player.prop("muted", $mute.hasClass("glyphicon-volume-off"))
        })
        this.audio_player.on("volumechange", () => updateVolume())
        this.browserHelper.get("audio_player_volume")
            .then(volume => volume == null ? 50 : volume)
            .then(volume => {
                this.audio_player.prop("volume", volume / 100)
                updateVolume()
            })
    }

    private initButtons() {
        this.playPauseButton.on("click", e => this.togglePlayPause())

        $("#next").on("click", () => this.next())

        $("#previous").on("click", () => this.prev())

        this.randomizeButton.on("click", () => {
            this.randomizeButton.toggleClass("active inactive")
            this.updateRandomize(this.randomizeButton.hasClass("active"))
            this.randomizeButton.tooltip("show")
        })
        this.browserHelper.get("audio_player_randomized")
            .then(randomized => this.updateRandomize(!!randomized))

        this.repeatButton.on("click", () => {
            if (this.repeatButton.hasClass("all")) {
                this.updateRepeat("none", "inactive")
            } else if (this.repeatButton.hasClass("none")) {
                this.updateRepeat("one", "active")
            } else {
                this.updateRepeat("all", "")
            }
            this.repeatButton.tooltip("show")
        })
        this.browserHelper.get("audio_player_repeat")
            .then(conf => conf || {status: "none", active: "inactive"})
            .then(conf => this.updateRepeat(conf.status, conf.active))

        $("#edit_playing_metas").on("click", () => {
            this.editMetadata.editFor(this.playlist.getPlayingTrack().data("url"))
        })
    }

    private initKeyboardInputs() {
        $("label.switch").on("keydown", (e: KeyDownEvent) => {
            let target = $(e.target)
            let code = e.keyCode || e.which
            if (code == 13) {
                e.stopPropagation()
                target.find("input").trigger("click")
                return false
            }
        })

        $("#audio_player_panel").on("keydown", e => {
            let code = e.keyCode || e.which
            switch (code) {
                case 32: //SPACE
                    e.preventDefault()
                    this.togglePlayPause()
                    break
                case 38: //UP
                    this.playlist.getLastTrack().trigger("focus")
                    break
                case 40: //DOWN
                    this.playlist.getFirstTrack().trigger("focus")
                    break
                case 37: //LEFT
                    if (this.domHelper.isCtrlDown()) {
                        $("#previous").trigger("click")
                    } else {
                        this.fastForward(10)
                    }
                    break
                case 39: //RIGHT
                    if (this.domHelper.isCtrlDown()) {
                        $("#next").trigger("click")
                    } else {
                        this.fastBackward(10)
                    }
                    break
            }
        })
    }

    load() {
        this.audio_player[0].load()
        this.audio_player.trigger("load")
    }

    togglePlayPause() {
        if (this.audio_player.prop("paused")) {
            this.play()
        } else {
            this.pause()
        }
    }

    play() {
        setTimeout(() => {
            let playing = this.playlist.getPlayingTrack()
            if (!playing.length) {
                this.next()
            } else if (this.audio_player[0].paused) {
                this.audio_player[0].play()
            }
        }, 200)
    }

    pause() {
        if (!this.audio_player[0].paused) {
            this.audio_player[0].pause()
        }
    }

    currentTime(): number {
        return +this.audio_player.prop("currentTime")
    }

    fastForward(delta: number) {
        this.audio_player.prop("currentTime", this.currentTime() + delta)
    }

    fastBackward(delta: number) {
        this.fastForward(-delta)
    }

    backToStart() {
        this.setTime(0)
    }

    setTrack(url: any) {
        this.audio_player.attr("src", url)
        this.load()

        if (url !== this.recentlyPlayed[this.recentlyPlayed.length - 1]) {
            this.recentlyPlayed.push(url)
        }
    }

    prev() {
        let last_played = this.recentlyPlayed.pop()
        let repeatAll = this.repeatButton.hasClass("all")
        if (last_played) {
            let last_played_track = this.playlist.findTrack(last_played)
            if (last_played_track.length) {
                if (last_played_track.hasClass("playing")) {
                    this.backToStart()
                    this.play()
                } else if (last_played_track.hasClass("failed")) {
                    this.playlist.getPreviousTrack(repeatAll).trigger("click")
                } else {
                    last_played_track.trigger("click")
                }
                return
            }
        }

        this.playlist.getPreviousTrack(repeatAll).trigger("click")
    }

    next() {
        let playing = this.playlist.getPlayingTrack()
        let nextTrack: JQuery<HTMLElement>
        if (this.randomized) {
            let allTracks = this.playlist.getTracksUrls()
            let possible_next_tracks = allTracks.filter(t => !this.recentlyPlayed.includes(t))
            if (possible_next_tracks.length) {
                nextTrack = this.playlist.findTrack(random(possible_next_tracks))
            } else {
                this.recentlyPlayed = []
                nextTrack = this.repeatButton.hasClass("all") ?
                            this.playlist.findTrack(random(allTracks)) :
                            playing.length ? $("#does_not_exist") : this.playlist.getFirstTrack()
            }
        } else {
            nextTrack = this.playlist.getNextTrack(this.repeatButton.hasClass("all"))
        }
        nextTrack.trigger("click")
    }

    getLoadedData(): number {
        try {
            return this.audio_player[0].buffered.end(this.audio_player[0].buffered.length - 1)
        } catch (e) {
            return 0
        }
    }

    setTime(time: number) {
        this.audio_player.prop("currentTime", time)
    }

    getCurrentState() {
        let current_track = this.playlist.getPlayingTrack()
        let tracks = this.playlist.getTracks()
        let list = tracks.get().map(t => {
            let $t = $(t)
            return {
                url: $t.data("url"),
                title: $t.attr("title"),
                is_playing: $t.hasClass("playing"),
                is_favorite: $t.find(".toggle-favorite").hasClass("glyphicon-heart")
            }
        })
        return {
            index: current_track.length ? tracks.index(current_track) + 1 : 0,
            total: tracks.length,
            url: current_track.data("url"),
            title: current_track.length ? current_track.attr("title") : "",
            thumbnail: $("#currently_playing .thumbnail-container img").attr("src"),
            next: current_track.length ? (this.randomized ? "?" : this.playlist.getNextTrack().attr("title") || "") : "",
            current_time: this.audio_player.prop("currentTime"),
            duration: this.audio_player.prop("duration"),
            loaded: this.getLoadedData(),
            controls: {
                mute: $("#mute").hasClass("glyphicon-volume-off") ? "inactive glyphicon-volume-off" : " glyphicon-volume-up",
                randomize: this.randomized ? "active" : "inactive",
                repeat: this.repeatButton.hasClass("inactive") ? "inactive" : this.repeatButton.hasClass("active") ? "active" : "",
            },
            playlist: list
        }
    }

    onDurationChange(handler: () => void) {
        this.audio_player.on("durationchange", handler)
    }

    onEnded(handler: () => void) {
        this.audio_player.on("ended", handler)
    }

    private updateRandomize(randomized: boolean) {
        this.randomized = randomized
        if (this.randomized) {
            this.randomizeButton.removeClass("inactive")
                .addClass("active")
                .attr("title", this.messages.trad("random_activated"))
        } else {
            this.randomizeButton.removeClass("active")
                .addClass("inactive")
                .attr("title", this.messages.trad("random_deactivated"))
            this.recentlyPlayed = []
        }
        this.randomizeButton.tooltip("fixTitle")
        this.browserHelper.set("audio_player_randomized", this.randomized)
    }

    private updateRepeat(status: string, active: string) {
        this.repeatButton.removeClass("one all none active inactive")
        this.repeatButton.addClass(status)
        this.repeatButton.addClass(active)
        this.repeatButton.attr("title", this.messages.trad("repeat") + ": " + this.messages.trad(status))
        this.repeatButton.tooltip("fixTitle")
        this.browserHelper.set("audio_player_repeat", {status: status, active: active})
    }
}
