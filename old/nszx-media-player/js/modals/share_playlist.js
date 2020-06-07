share_playlist = {}

$(function () {
    const modal = $('#share_playlist')
    const do_share = $('#do_share_playlist')
    const do_share_label = $('label[for="do_share_playlist"]')
    const results = $('#share_playlist_results')
    const view_link = $('#view_playlist_link')
    const share_link = $('#share_playlist_link')
    const playlist_selector = $('#share_playlist_selector')
    const playlist_rename = $('#share_playlist_name')

    $('.copy-link').click(e => {
        const button = $(e.target).closest('.copy-link')
        const target = $('#' + button.data('target'))
        target.focus().select()
        let succeed;
        try {
            succeed = document.execCommand("copy");
        } catch(e) {
            succeed = false;
        }
        if(succeed) {
            button.find('.glyphicon').removeClass('glyphicon-copy').addClass('glyphicon-ok-circle')
            button.find('.i18n').text(utils.trad('copied'))
        } else {
            button.find('.glyphicon').removeClass('glyphicon-copy').addClass('glyphicon-remove-circle')
            button.find('.i18n').text(utils.trad('error'))
        }
    })

    const toggleDoShare = function (disabled) {
            do_share.attr('disabled', disabled)
        if (disabled) do_share_label.text(utils.trad('cannot_share_empty_playlist'))
        else do_share_label.text('')
    }
    let displayPlaylist = function (playlist_id, availablePlaylists) {
        let playlist = availablePlaylists[playlist_id]
        playlist_rename.val(playlist.name)
        toggleDoShare(playlist.tracks.length === 0)
    }

    share_playlist.openFor = (playlist_id, availablePlaylists) => {
        reset()
        playlist_selector.html(Object.values(availablePlaylists)
            .map(pl => '<option'
                + (pl.id === playlist_id ? ' selected="selected"' : '')
                + ' value="' + pl.id + '"'
                + '>' + pl.name + '</option>').join(''));
        playlist_selector.change(e => displayPlaylist(playlist_selector.val(), availablePlaylists))
        displayPlaylist(playlist_id, availablePlaylists)
        do_share.click(e => {
            const toShareId = playlist_selector.val()
            const toShare = {
                name: playlist_rename.val(),
                tracks: availablePlaylists[toShareId].tracks
            }
            if (toShare) {
                $.post('https://nszx.fr/media-player-share/share.php', JSON.stringify(toShare), result => {
                    view_link.val(result.link)
                    share_link.val(chrome.extension.getURL('import.html') + '?id=' +result.id)
                    results.fadeIn()
                })
                    .fail(e => alert(utils.trad('share_playlist_failed') + ' :('))
            }
        })

        modal.modal('show')
    }

    const reset = function () {
        playlist_selector.html('')
        playlist_selector.off('change')
        do_share.off('click')
        results.hide()
        view_link.val('')
        share_link.val('')
        $('.copy-link').find('.i18n').text(utils.trad('copy'))
        $('.copy-link').find('.glyphicon')
            .addClass('glyphicon-copy')
            .removeClass('glyphicon-ok-circle glyphicon-remove-circle')
    }
    modal.on('hidden.bs.modal', reset)
})
