import { singleton } from "../../utils/injection"
import { inject } from "inversify"
import { BrowserHelper } from "../../utils/BrowserHelper"

@singleton
export class HelpModal {
    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    init() {
        this.browserHelper.get("last_version")
            .then((last_version) => {
                let version = chrome.runtime.getManifest().version
                if (last_version !== version) {
                    setTimeout(() => $("#about_extension").modal("show"), 2000)
                }
                this.browserHelper.set("last_version", version)
            })
        this.browserHelper.get("user_stats")
            .then((user_stats: any) => user_stats || {})
            .then((userStats: any) => {
                userStats.nb_visits = userStats.nb_visits || 0
                if (userStats.nb_visits === 0) {
                    setTimeout(() => $("#help_modal").modal("show"), 2500)
                }
                userStats.nb_visits++
                this.browserHelper.set("user_stats", userStats)
            })
    }
}
