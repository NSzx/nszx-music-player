import { singleton } from "../utils/injection"
import { inject } from "inversify"
import { MusicPlayer } from "./MusicPlayer"
import { TAB_ID } from "../utils/BrowserHelper"
import { PlaylistsManager } from "./PlaylistsManager"
import { CurrentPlaylist } from "./CurrentPlaylist"

@singleton
export class BrowserMessagesHandler {
    @inject(MusicPlayer)
    player: MusicPlayer

    @inject(PlaylistsManager)
    playlistsManager: PlaylistsManager

    @inject(CurrentPlaylist)
    playlist: CurrentPlaylist

    init() {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            let forced_update = false
            switch (msg.text || "") {
                case "ping":
                    sendResponse({
                                     text: "nszx_pong",
                                     tab_id: TAB_ID
                                 })
                    break
                case "create_playlist":
                    this.playlistsManager.newCustomPlaylist(msg.tracks, msg.name)
                    break
                case "set_as_playlist":
                    this.playlistsManager.emptyPlaylist(msg.destination)
                // no break
                case "add_to_playlist":
                    this.playlistsManager.addTracks(msg.playlist || [], msg.destination)
                    break
                case "control":
                    switch (msg.action) {
                        case "current_time":
                            this.player.setTime(msg.current_time)
                            break
                        case "playPause":
                            this.player.togglePlayPause()
                            break
                        case "play":
                            this.player.play()
                            break
                        case "pause":
                        case "stop":
                            this.player.pause()
                            break
                        case "prev":
                            $("#previous").trigger("click")
                            break
                        case "remove_track":
                            this.playlist.findTrack(msg.url).find(".glyphicon-remove").trigger("click")
                            break
                        case "select_track":
                            this.playlist.findTrack(msg.url).trigger("click")
                            break
                        case "like":
                            this.playlist.findTrack(msg.url).find(".toggle-favorite").trigger("click")
                            forced_update = true
                            break
                        case "switchPlaylist":
                            this.playlistsManager.playNextPlaylist()
                            break
                        default:
                            $("#" + msg.action).trigger("click")
                    }
                    if (msg.action.match(/ff\d+/)) {
                        this.player.fastForward(+msg.action.replace(/[^0-9]+/g, ""))
                    } else if (msg.action.match(/fb\d+/)) {
                        this.player.fastBackward(+msg.action.replace(/[^0-9]+/g, ""))
                    }
                // no break
                case "update_request":
                    let playerState = this.player.getCurrentState()
                    sendResponse({
                                     tab_id: TAB_ID,
                                     forced_update: forced_update,
                                     available_playlists: this.playlistsManager.getAvailablePlaylists(),
                                     ...playerState
                                 });
                    break;
            }
        });
    }
}
