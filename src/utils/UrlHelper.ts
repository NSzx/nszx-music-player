import { singleton } from "./injection"
import XRegExp = require("xregexp")
import { inject } from "inversify"
import { BrowserHelper } from "./BrowserHelper"

@singleton
export class UrlHelper {
    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    getFilenameFromUrl(url: string) {
        let uri_encoded = $("<div>").html(url.split("/").pop()).text()
        try {
            return decodeURIComponent(uri_encoded)
        } catch (err) {
            return uri_encoded
        }
    }

    getTitleFromUrl(url: string) {
        return this.getFilenameFromUrl(url).replace(/\.[a-z0-9]{2,5}$/i, "")
    }

    getCleanTitleFromUrl(url: string) {
        return this.clean(this.getTitleFromUrl(url))
    }

    clean(query: string) {
        return query.replace(XRegExp("\\PL", "g"), " ").replace(/\s+/g, " ")
    }

    proxyUrlIfNeeded(url: string) {
        if (this.browserHelper.getBrowser() !== "Chrome") {
            return "https://nszx.fr/media-player-proxy/?url=" + encodeURIComponent(url)
        }
        return url
    }
}
