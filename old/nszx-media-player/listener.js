let audio_tab_id = null;

const ucfirst = str => str.charAt(0).toUpperCase() + str.substr(1);
const trad = id => chrome.i18n.getMessage(id) || ucfirst(id);

chrome.tabs.onRemoved.addListener(tabId => {
    if (tabId === audio_tab_id) {
        audio_tab_id = null;
    }
});

let createAudioTab = function (callback, active) {
    chrome.runtime.sendMessage(
        {text: 'ping'},
        function (response) {
            if (response && response.text === 'nszx_pong') {
                if (response.tab_id == null) {
                    setTimeout(function () {
                        createAudioTab(callback, active);
                    }, 300);
                } else {
                    audio_tab_id = response.tab_id;
                }
            } else {
                chrome.tabs.create(
                    {
                        'url': chrome.extension.getURL('mediaplayer.html'),
                        active: active || false
                    },
                    function (tab) {
                        audio_tab_id = tab.id;
                        if (callback != null) {
                            setTimeout(function () {
                                callback();
                            }, 700);
                        }
                    }
                );
            }
        }
    );
};

let checkAudioTab = function () {
    if (audio_tab_id === null) {
        return false;
    }

    try {
        chrome.tabs.get(audio_tab_id, function (tab) {
            if (!tab) {
                audio_tab_id = null;
            }
        })
    } catch (e) {
        audio_tab_id = null;
        return false;
    }
    return true;
};
let retries = 0;
setInterval(() => {
    if (checkAudioTab()) {
        chrome.tabs.sendMessage(audio_tab_id, {text: 'ping'}, function (response) {
            if (!response || response.text !== 'nszx_pong') {
                retries++;
                if (retries > 2) {
                    retries = 0;
                    audio_tab_id = null;
                }
            } else
                retries = 0;
        });
    }
}, 1000);


function addToMyPlaylist(response) {
    if (!checkAudioTab()) {
        createAudioTab(function () {
            addToMyPlaylist(response);
        });
    } else {
        chrome.tabs.sendMessage(audio_tab_id, {text: 'add_to_playlist', playlist: response.playlist});
    }
}

function sendToAudioTab(message) {
    if (!checkAudioTab()) {
        createAudioTab(function () {
            sendToAudioTab(message);
        });
    } else {
        chrome.tabs.sendMessage(audio_tab_id, message);
    }
}

function playVideo(response) {
    chrome.tabs.create({'url': chrome.extension.getURL('videoplayer.html')}, function (tab) {
        setTimeout(function () {
            chrome.tabs.sendMessage(tab.id, {type: 'video', src: response.src});
        }, 500);
    });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    switch (msg.text) {
        case 'hello_its_me':
            sendResponse({
                text: 'hey_its_you',
                tab_id: sender.tab.id
            });
            break;
        case 'ping':
            if (!checkAudioTab()) {
                createAudioTab(null, false);
            }
            break;
        case 'create_playlist':
        case 'set_as_playlist':
        case 'add_to_playlist':
            if (!checkAudioTab()) {
                sendToAudioTab(msg);
            }
            break;
        case 'update_request':
        case 'control':
            if (msg.text === "control" && msg.action === "open_media_player") {
                if (!checkAudioTab())
                    createAudioTab(null, true);
                else
                    chrome.tabs.get(audio_tab_id, function (tab) {
                        chrome.tabs.update(tab.id, {active: true});
                        chrome.windows.update(tab.windowId, {focused: true});
                    });
            }
            break;
    }
});

var targetUrlPatterns = [];
"mp3|ogg|opus|oga|flac|wav|aac|m4a|mkv|mp4|avi".split('|').forEach(format => {
    targetUrlPatterns.push("*://*/*." + format);
    targetUrlPatterns.push("file:///*." + format);
    targetUrlPatterns.push("*://*/*." + format.toUpperCase());
    targetUrlPatterns.push("file:///*." + format.toUpperCase());
});

chrome.contextMenus.create({
    title: trad('open_with') + ' ' + trad('extension_name'),
    contexts: ["link", "audio", "video"],
    targetUrlPatterns: targetUrlPatterns,
    onclick: function (urlInfo) {
        if (urlInfo.linkUrl.match(/\.(mp3|ogg|opus|oga|flac|wav|aac|m4a)$/i)) {
            addToMyPlaylist({playlist: [urlInfo.linkUrl]});
        } else if (urlInfo.linkUrl.match(/\.(mkv|mp4|avi)$/i)) {
            playVideo({src: urlInfo.linkUrl});
        } else {
            alert(trad('invalid_link'));
        }
    }
});

chrome.commands.onCommand.addListener(function(command) {
    if (checkAudioTab()) {
        sendToAudioTab({text: 'control', action: command});
    }
});
