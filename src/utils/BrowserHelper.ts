import { singleton } from "./injection"

export let TAB_ID: number

@singleton
export class BrowserHelper {

    init() {
        chrome.runtime.sendMessage({text: "hello_its_me"}, response => TAB_ID = response.tab_id)
    }

    openTabSendMessageDoThings(url: string,
                               message: any,
                               success: (_: any) => any,
                               failure: () => any,
                               totalFailure: () => any) {
        chrome.tabs.create(
            {"url": url, active: false},
            (tab) => {
                let hasBeenHighlighted = false
                let retries = 0
                let stop = () => {
                    clearInterval(interval)
                    chrome.tabs.update(TAB_ID, {active: true})
                    chrome.tabs.remove(tab.id)
                }
                let interval = setInterval(() => {
                    if (retries++ >= 10) {
                        stop()
                        totalFailure()
                    }
                    try {
                        chrome.tabs.sendMessage(tab.id, message, response => {
                            if (!response) {
                                return
                            }
                            if (response.status === "error" && !hasBeenHighlighted) {
                                chrome.windows.update(tab.windowId, {focused: true})
                                chrome.tabs.update(tab.id, {active: true})
                                hasBeenHighlighted = true
                                failure()
                            } else if (response.status === "ok") {
                                stop()
                                success(response)
                            }
                        })
                    } catch {

                    }
                }, 1000)
            }
        )
    }

    openInNewTab(url: string) {
        let win = window.open(url, "_blank")
        win.focus()
    }

    getBrowser(): string {
        if (typeof chrome !== "undefined") {
            // @ts-ignore
            if (typeof browser !== "undefined") {
                return "Firefox"
            } else {
                return "Chrome"
            }
        } else {
            return "Edge"
        }
    }

    getPlaylist(url: string, onfulfilled: (links: string[]) => any, onFailure: () => any) {
        if (this.getBrowser() === "Chrome") {
            fetch(url)
                .then(response => response.text())
                .then(html => this.analyseWebpage(html, url))
                .then(onfulfilled)
                .catch(onFailure)
        } else {
            this.openTabSendMessageDoThings(
                url,
                {text: "get_playlist"},
                (response: any) => onfulfilled(response.audio),
                () => {
                },
                onFailure
            )
        }
    }

    private analyseWebpage(html: string, url: string) {
        return $(html.replace(/ src="/gi, " data-src=\"")
                     .replace(/ title="/gi, " data-title=\""))
            .find("a").get()
            .map(a => a.href.replace("chrome-extension://" + chrome.runtime.id + "/", ""))
            .filter(href => !!href && href.match(/\.(mp3|ogg|opus|oga|flac|wav|aac|m4a)$/i))
            .map(href => {
                if (href.match(/^\//)) {
                    let l = document.createElement("a")
                    l.href = href
                    return l.origin + href
                } else if (href.match(/^https?:/i) || href.match(/^ftp:/i) || href.match(/^file:/i)) {
                    return href
                }
                return url + (url.match(/\/$/) ? "" : "/") + href
            })
            .filter((value, index, self) => self.indexOf(value) === index)
    }

    async set(key: string, value: any) {
        chrome.storage.local.set({[key]: value})
    }

    get(key: string): Promise<any> {
        return new Promise<any>((accept) => {
            chrome.storage.local.get(key, items => {
                accept(items[key])
            })
        })
    }
}
