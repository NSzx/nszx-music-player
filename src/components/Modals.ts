import { singleton } from "../utils/injection"
import { inject } from "inversify"
import { ManuallyAddTracksModal } from "./modals/ManuallyAddTracksModal"
import { ConfigurationModal } from "./modals/ConfigurationModal"
import { HelpModal } from "./modals/HelpModal"
import { EditMetadataModal } from "./modals/EditMetadataModal"
import { SharePlaylistModal } from "./modals/SharePlaylistModal"
import { PlaylistDownloaderModal } from "./modals/PlaylistDownloaderModal"

@singleton
export class Modals {
    @inject(ConfigurationModal)
    configuration: ConfigurationModal

    @inject(HelpModal)
    help: HelpModal

    @inject(EditMetadataModal)
    editMetadata: EditMetadataModal

    @inject(ManuallyAddTracksModal)
    manuallyAddTracks: ManuallyAddTracksModal

    @inject(SharePlaylistModal)
    sharePlaylist: SharePlaylistModal

    @inject(PlaylistDownloaderModal)
    playlistDownloader: PlaylistDownloaderModal

    init() {
        this.configuration.init()
        this.help.init()
        this.editMetadata.init()
        this.manuallyAddTracks.init()
        this.sharePlaylist.init()
        this.playlistDownloader.init()
    }
}
