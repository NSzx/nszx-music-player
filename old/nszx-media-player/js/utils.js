utils = {};

$(function () {
    utils.init = function () {
        jQuery.fn.random = function () {
            let randomIndex = Math.floor(Math.random() * this.length);
            return jQuery(this[randomIndex]);
        };
        Array.prototype.random = function () {
            return this[Math.floor(Math.random() * this.length)];
        };
        Array.prototype.diff = function (a) {
            return this.filter(function (i) {
                return a.indexOf(i) < 0;
            });
        };

        utils.openTabSendMessageDoThings = (url, message, success, failure, totalFailure) => {
            chrome.tabs.create({'url': url, active: false},
                function (tab) {
                    let has_been_highlighted = false;
                    let retries = 0;
                    let stop = function () {
                        clearInterval(interval);
                        chrome.tabs.update(utils.my_tab_id, {active: true});
                        chrome.tabs.remove(tab.id);
                    };
                    let interval = setInterval(() => {
                        if (retries++ >= 13) {
                            stop();
                            totalFailure();
                        }
                        chrome.tabs.sendMessage(tab.id, message, response => {
                            if (!response) return;
                            if (response.status === 'error' && !has_been_highlighted) {
                                chrome.windows.update(tab.windowId, {focused: true});
                                chrome.tabs.update(tab.id, {active: true});
                                has_been_highlighted = true;
                                failure();
                            } else if (response.status === 'ok') {
                                stop();
                                success(response);
                            }
                        });
                    }, 1000);
                }
            );
        }
    };

    const $loading_modal = $('#loading_modal');
    let tasks = [];
    utils.addTask = () => {
        let task = {done: false};
        $loading_modal.modal('show');
        tasks.push(task);
        return task;
    };
    setInterval(() => {
        let old_length = tasks.length;
        tasks = tasks.filter(t => {
            if (t.done && t.callback) t.callback();
            return !t.done;
        });
        if (!tasks.length && old_length > 0) {
            $loading_modal.modal('hide');
            $('.modal-backdrop').remove();
        }
    }, 500);

    utils.editElement = element => {
        element.children().remove();
        element.attr('contenteditable', 'true');
        element.focus();
        let range = document.createRange();
        range.selectNodeContents(element[0]);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    };

    utils.time = function (s) {
        let sec_num = parseInt(s, 10) || 0;
        let hours_num = Math.floor(sec_num / 3600);
        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        let seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        return (hours_num ? hours + ':' : '') + minutes + ':' + seconds;
    };

    utils.ucfirst = str => str.charAt(0).toUpperCase() + str.substr(1);
    utils.trad = id => chrome.i18n.getMessage(id) || utils.ucfirst(id).replace(/_/g, ' ');

    utils.fix_utf8 = s => {
        try {
            return decodeURIComponent(escape(s));
        } catch (err) {
            try {
                return decodeURIComponent(s);
            } catch (err) {
                return s;
            }
        }
    };

    utils.getFilenameFromUrl = url => {
        let uri_encoded = $('<div>').html(url.split('/').pop()).text();
        try {
            return decodeURIComponent(uri_encoded);
        } catch (err) {
            return uri_encoded;
        }
    };
    utils.getTitleFromUrl = url => utils.getFilenameFromUrl(url).replace(/\.[a-z0-9]{2,5}$/i, '');

    utils.humanize = function (size) {
        let units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let ord = Math.floor(Math.log(size) / Math.log(1024));
        ord = Math.min(Math.max(0, ord), units.length - 1);
        let s = Math.round((size / Math.pow(1024, ord)) * 100) / 100;
        return s + ' ' + units[ord];
    };

    utils.lastIn = arr => arr[arr.length - 1];

    let meta_queue = [];
    utils.getTracksMeta = (url, callback) => {
        let possible_meta = ml.searchTrackByUrl(url);
        if (possible_meta)
            callback(possible_meta);
        else
            meta_queue.push({url: url, callback: callback});
    };
    setInterval(() => {
        let request = meta_queue.shift();
        if (request) {
            let url = request.url;
            let possible_meta = ml.searchTrackByUrl(url);
            if (possible_meta)
                request.callback(possible_meta);
            else if ($('.track[data-url="' + url + '"]').length)
                mm.cleanAndSearchTrackMeta(utils.getTitleFromUrl(url))
                    .then(results => {
                        let metas = ml.saveTrack(url, results, 0);
                        request.callback(metas);
                    });
        }
    }, 1000);

    utils.getBrowser = () => {
        if (typeof chrome !== "undefined") {
            if (typeof browser !== "undefined") {
                return "Firefox";
            } else {
                return "Chrome";
            }
        } else {
            return "Edge";
        }
    };
    utils.highlight = elt => elt.toggleClass('highlighted', 100, () => elt.toggleClass('highlighted', 900));
});
