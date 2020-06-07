playlist_downloader = {};

$(function(){
    playlist_downloader.init = (utils, playlist) => {
        const modal = $('#playlist_downloader');
        const downloads_list = $('#downloads_list');
        const cancel_btn = $('#cancel_download_current_playlist');
        const dpp = $('#download_playlist_progress');
        const progress_message = $('#progress_message');
        const progress_bar = {
            success: dpp.find('.progress-bar-success'),
            downloading: dpp.find('.progress-bar-warning'),
            failed: dpp.find('.progress-bar-danger')
        };
        let is_downloading = false;
        const progress = function (success, downloading, failed, total) {
            progress_bar.success.animate({width: (success * 100 / total) + "%"}, 400);
            progress_bar.downloading.animate({width: (downloading * 100 / total) + "%"}, 400);
            progress_bar.failed.animate({width: (failed * 100 / total) + "%"}, 400);
            let queue = total - success - failed;
            let trad = queue > 0 ? utils.trad('downloading_progress') : utils.trad('downloading_done');
            progress_message.text(trad.replace('__q__', queue).replace('__s__', success).replace('__f__', failed))
        };

        if(utils.getBrowser() === 'Firefox'){
            modal.remove();
            $('a[data-target="#playlist_downloader"]').parent().remove();
            return;
        }

        cancel_btn.fadeOut();

        modal.on('show.bs.modal', function () {
            $('#input_playlist_container').html(playlist.getPlaylistSelector('input_playlist', true).addClass('form-control'));
            return;
            if (is_downloading) {
                return;
            }
            progress(0, 0, 0, 1);
            downloads_list.html('');
            progress_message.text('');
        });

        $('#download_current_playlist').click(function (e) {
            e.preventDefault();
            if (is_downloading) {
                return false;
            }

            progress(0, 0, 0, 1);
            downloads_list.html('');
            progress_message.text('');

            let tracks = playlist.getPlayingTracksAsList($('#input_playlist').val());
            if (!tracks.length) {
                return false;
            }
            is_downloading = true;
            tracks.forEach(url => {
                let title = utils.getTitleFromUrl(url);
                downloads_list.append($('<div>').addClass('track pending').data('url', url).text(title));
            });

            let total_tracks = tracks.length;
            let zip_filename = $('#file_name').val().replace(/[|&;:'$%@"<>+,\/\\*?²\t^]/g, "").replace(/^\.*/g, "");
            if (!zip_filename.length) {
                zip_filename = 'something';
            }
            zip_filename.replace(/\.zip$/i, '');
            const max_concurrent_downloads = 3;
            const cancel_on_failure = $('#cancel_on_failure-1').is(':checked');
            let canceled = false;
            let zip = new JSZip();
            let current_size = 0;
            let part = 1;

            const pending_dl = () => downloads_list.find('.track.pending');
            const downloading_dl = () => downloads_list.find('.track.downloading');
            const success_dl = () => downloads_list.find('.track.success');
            const failed_dl = () => downloads_list.find('.track.failed');
            const updateProgress = () => progress(
                success_dl().length,
                downloading_dl().length,
                failed_dl().length,
                total_tracks
            );

            cancel_btn.fadeIn();

            let addToDownloadQueue = setInterval(function () {
                if (canceled || pending_dl().length === 0) {
                    clearInterval(addToDownloadQueue);
                    return;
                }
                if (downloading_dl().length < max_concurrent_downloads) {
                    let track = pending_dl().first();
                    let url = track.data('url');
                    let default_filename = utils.getFilenameFromUrl(url);
                    track.removeClass('pending');
                    track.addClass('downloading');
                    updateProgress();

                    let xhr = new XMLHttpRequest();
                    xhr.open('GET', url, true);
                    xhr.responseType = 'blob';

                    xhr.onload = function () {
                        if (canceled) {
                            return;
                        }
                        track.removeClass('downloading');
                        let filename = ((this.getResponseHeader('Content-Disposition') || '').match(/filename="([^"]+)"/) || [])[1] || default_filename;
                        if (+this.status === 200) {
                            let data = this.response;
                            let file_if_exists = zip.file(filename);
                            while (file_if_exists) {
                                filename = filename.replace(/ ?(\((\d+)\))?(\.[a-z0-9]+)?$/i, (match, cnt, digit, ext) => ' (' + ((+digit || 0) + 1) + ')' + (ext || ''));
                                file_if_exists = zip.file(filename);
                            }
                            zip.file(filename, data);
                            current_size += +this.getResponseHeader('Content-Length') || 0;
                            track.addClass('success');
                        } else {
                            track.addClass('failed');
                            if (cancel_on_failure) {
                                canceled = true;
                                alert(utils.trad('dl_has_failed').replace(/_title_/, filename));
                            }
                        }
                        updateProgress();
                    };

                    xhr.send();
                }
            }, 500);

            let checkIfFinished = setInterval(function () {
                if (canceled) {
                    pending_dl().removeClass('pending').addClass('failed');
                    downloading_dl().removeClass('downloading').addClass('failed');
                    updateProgress();
                }
                let done = success_dl().length === (total_tracks - failed_dl().length);
                if (done) {
                    clearInterval(checkIfFinished);
                    is_downloading = false;
                    cancel_btn.fadeOut();
                }
                if (current_size > 100000000 || (current_size > 0 && done)) {
                    let to_dl = zip;
                    zip = new JSZip();
                    to_dl.generateAsync({type: "blob"})
                        .then(function (content) {
                            saveAs(content, zip_filename + (part === 1 && done ? '' : ' - ' + part) + '.zip');
                            part++;
                            delete to_dl;
                        });
                    current_size = 0;
                }
            }, 400);

            cancel_btn.off("click").click(function () {
                canceled = true;
            });

            return false;
        });
    };
});
