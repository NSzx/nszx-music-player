import { inject } from "inversify"
import { singleton } from "./utils/injection"
import { LongTasksManager } from "./utils/LongTasksManager"
import { BrowserHelper } from "./utils/BrowserHelper"
import { MusicLibrary } from "./components/MusicLibrary"
import { Modals } from "./components/Modals"
import { MessagesHelper } from "./utils/MessagesHelper"
import { ContextMenu } from "./components/ContextMenu"
import { PlaylistsManager } from "./components/PlaylistsManager"
import { ColorPicker } from "./components/ColorPicker"
import { BrowserMessagesHandler } from "./components/BrowserMessagesHandler"
import { MusicPlayer } from "./components/MusicPlayer"
import { TrackMetadataResolver } from "./utils/TrackMetadataResolver"
import { DynamicTrackSearch } from "./components/DynamicTrackSearch"
import { Analytics } from "./components/Analytics"
import { DomHelper } from "./utils/DomHelper"

@singleton
export class Main {
    @inject(LongTasksManager)
    tasksManager: LongTasksManager

    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    @inject(MusicLibrary)
    library: MusicLibrary

    @inject(Modals)
    modals: Modals

    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(DomHelper)
    domHelper: DomHelper

    @inject(PlaylistsManager)
    playlistsManager: PlaylistsManager

    @inject(ContextMenu)
    contextMenu: ContextMenu

    @inject(ColorPicker)
    colorPicker: ColorPicker

    @inject(MusicPlayer)
    player: MusicPlayer

    @inject(BrowserMessagesHandler)
    browserMessagesHandler: BrowserMessagesHandler

    @inject(TrackMetadataResolver)
    metadataResolver: TrackMetadataResolver

    @inject(DynamicTrackSearch)
    dynamicTrackSearch: DynamicTrackSearch

    @inject(Analytics)
    analytics: Analytics

    async run() {
        console.log("Starting...")
        this.browserHelper.init()
        this.messages.init()
        this.tasksManager.run()
        this.metadataResolver.run()
        this.modals.init()
        this.domHelper.init()
        this.contextMenu.init()
        this.colorPicker.init()
        await this.library.init()
        await this.playlistsManager.init()
        this.player.init()
        this.browserMessagesHandler.init()
        this.dynamicTrackSearch.init()
        this.analytics.init()
    }
}
