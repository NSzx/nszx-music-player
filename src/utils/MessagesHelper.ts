import { singleton } from "./injection"

@singleton
export class MessagesHelper {

    init() {
        document.title = this.trad("extension_name")

        $(".i18n").each((i, v) => {
            let elt = $(v)
            let str_trad = this.trad(elt.data("i18n"))
            if (elt.hasClass("i18n-title")) {
                elt.attr("title", str_trad)
                elt.tooltip()
            } else {
                elt.text(str_trad)
            }
        })
    }

    time(s: string) {
        let sec_num = parseInt(s, 10) || 0
        let hours_num = Math.floor(sec_num / 3600)
        let hours = Math.floor(sec_num / 3600)
        let minutes = Math.floor((sec_num - (hours * 3600)) / 60)
        let seconds = sec_num - (hours * 3600) - (minutes * 60)
        let pad = (n: number) => n.toString().padStart(2, "0")
        return (hours_num ? pad(hours) + ":" : "") + pad(minutes) + ":" + pad(seconds)
    };

    ucfirst(str: string) {
        return str.charAt(0).toUpperCase() + str.substr(1)
    }

    trad(id: string) {
        return chrome.i18n.getMessage(id) || this.ucfirst(id).replace(/_/g, " ")
    }

    fixUtf8(s: string) {
        try {
            return decodeURIComponent(escape(s))
        } catch (err) {
            try {
                return decodeURIComponent(s)
            } catch (err) {
                return s
            }
        }
    }

    humanize(size: number) {
        let units = ["bytes", "KB", "MB", "GB", "TB", "PB"]
        let ord = Math.floor(Math.log(size) / Math.log(1024))
        ord = Math.min(Math.max(0, ord), units.length - 1)
        let s = Math.round((size / Math.pow(1024, ord)) * 100) / 100
        return s + " " + units[ord]
    }
}
