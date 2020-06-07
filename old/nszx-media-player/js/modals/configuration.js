configuration = {}

$(function () {
    configuration.init = function (utils, colorpicker) {
        let conf = {}
        let select_color_theme = $('#select_color_theme')
        let select_window_theme = $('#select_window_theme')
        let custom_colors_fieldset = $('#custom_colors_fieldset')
        let available_color_themes = {
            'light-theme': {
                'i18n': 'light',
                'class': 'light-theme'
            },
            'dark-theme': {
                'i18n': 'dark',
                'class': 'dark-theme'
            },
            'blue-theme': {
                'i18n': 'tidal_wave',
                'class': 'blue-theme'
            },
            'pink-theme': {
                'i18n': 'strawberry_macaroon',
                'class': 'pink-theme'
            },
            'yellow-theme': {
                'i18n': 'sandstorm',
                'class': 'yellow-theme'
            }
        }
        let available_window_themes = {
            'square-theme': {
                'i18n': 'sharp',
                'class': 'square-theme'
            },
            'round-theme': {
                'i18n': 'blunt',
                'class': 'round-theme'
            }
        }
        let custom_colors = {
            main_background_color: {
                css_var: '--main-bg-color',
                i18n: 'main_background_color'
            },
            player_background_color: {
                css_var: '--player-bg-color',
                i18n: 'player_background_color'
            },
            popup_background_color: {
                css_var: '--modal-bg-color',
                i18n: 'popup_background_color'
            },
            progress_bar_background_color: {
                css_var: '--progress-bg-color',
                i18n: 'progress_bar_background_color'
            },
            tracks_background_color: {
                css_var: '--tracks-bg-color',
                i18n: 'tracks_background_color'
            },
            tracks_background_color_on_hover: {
                css_var: '--tracks-bg-color-hover',
                i18n: 'tracks_background_color_on_hover'
            },
            text_color: {
                css_var: '--main-text-color',
                i18n: 'text_color'
            },
            help_text_color: {
                css_var: '--help-text-color',
                i18n: 'help_text_color'
            },
            control_buttons_color: {
                css_var: '--controls-color',
                i18n: 'control_buttons_color'
            },
            control_buttons_color_on_hover: {
                css_var: '--controls-color-hover',
                i18n: 'control_buttons_color_on_hover'
            },
            disabled_control_buttons_color: {
                css_var: '--controls-color-inactive',
                i18n: 'disabled_control_buttons_color'
            },
            selected_control_buttons_color: {
                css_var: '--controls-color-active',
                i18n: 'selected_control_buttons_color'
            },
            playing_track_border_color: {
                css_var: '--tracks-playing-border',
                i18n: 'playing_track_border_color'
            },
            links_color: {
                css_var: '--links-color',
                i18n: 'links_color'
            },
            links_color_on_hover: {
                css_var: '--links-color-hover',
                i18n: 'links_color_on_hover'
            },
            border_color: {
                css_var: '--main-border-color',
                i18n: 'border_color'
            },
            shadow_color: {
                css_var: '--shadow-color',
                i18n: 'shadow_color'
            }
        }

        Object.values(available_color_themes).forEach(theme => {
            select_color_theme.append($('<option>', {
                value: theme.class,
                text: utils.trad(theme.i18n)
            }))
        })

        Object.values(available_window_themes).forEach(theme => {
            select_window_theme.append($('<option>', {
                value: theme.class,
                text: utils.trad(theme.i18n)
            }))
        })

        Object.keys(custom_colors).forEach(key => {
            let config = custom_colors[key]
            custom_colors_fieldset.append(`
                <div class="form-group">
                    <label class="col-md-4 col-xs-4 control-label"
                           for="${key}_input">${utils.trad(config.i18n)}</label>
                    <div class="col-md-' col-xs-4">
                        <input id="${key}_input" name="${key}_input"
                                class="form-control">
                    </div>
                    <div class="col-md-1 col-xs-1">
                        <span class="color-preview-container">
                            <span id="${key}_preview" class="color-preview"><span class="glyphicon glyphicon-pencil"></span></span>
                        </span>
                    </div>
                    <div class="col-md-2 col-xs-3">
                        <label class="checkbox-inline" for="${key}_is_active">
                            <input id="${key}_is_active" name="${key}_is_active" type="checkbox">
                            ${utils.trad('active')}
                        </label>
                    </div>
                </div>`)
            let input = $(`#${key}_input`)
            let preview = $(`#${key}_preview`)
            input.on('input', () => {
                preview.css('background', input.val())
                conf.appearance.custom_colors[key].value = input.val()
                apply_themes()
                saveConfiguration()
            })
            preview.click(() => {
                colorpicker.openFor(preview, input)
            })
            let checkbox = $(`#${key}_is_active`)
            checkbox.click(e => {
                conf.appearance.custom_colors[key].value = input.val()
                conf.appearance.custom_colors[key].is_active = checkbox.is(':checked')
                apply_themes()
                saveConfiguration()
            })
        })

        let saveConfiguration = function () {
            chrome.storage.local.set({configuration: conf})
        }

        let apply_themes = () => {
            let body = $('body')
            body.attr('class', conf.appearance.window_theme + ' '
                + conf.appearance.color_theme + ' ' + conf.appearance.font_size)
            Object.keys(conf.appearance.custom_colors).forEach(key => {
                let config = conf.appearance.custom_colors[key]
                let css_var = custom_colors[key].css_var
                if (config.is_active) {
                    body[0].style.setProperty(css_var, config.value)
                } else {
                    body[0].style.removeProperty(css_var)
                }
            })
        }
        select_color_theme.change(() => {
            let value = select_color_theme.val()
            let theme = available_color_themes[value] || null
            if (theme) {
                conf.appearance.color_theme = value
                apply_themes()
                saveConfiguration()
            }
        })
        select_window_theme.change(() => {
            let value = select_window_theme.val()
            let theme = available_window_themes[value] || null
            if (theme) {
                conf.appearance.window_theme = value
                apply_themes()
                saveConfiguration()
            }
        })
        $('#select_font_size').click(() => {
            conf.appearance.font_size = $('input[name="font_size"]:checked').val()
            apply_themes()
            saveConfiguration()
        })

        let updateConfigurationView = function () {
            select_color_theme.val(conf.appearance.color_theme)
            select_window_theme.val(conf.appearance.window_theme)
            if (utils.getBrowser() === 'Chrome' && conf.behavior.activate_ga) {
                $('#activate_ga-1').prop('checked', true)
            } else {
                $('#activate_ga-0').prop('checked', true)
            }
            $('input[name="font_size"][value="' + conf.appearance.font_size + '"]').prop('checked', true)
            Object.keys(conf.appearance.custom_colors).forEach(key => {
                let config = conf.appearance.custom_colors[key]
                $(`#${key}_input`).val(config.value)
                $(`#${key}_preview`).css('background', config.value)
                $(`#${key}_is_active`).prop('checked', config.is_active)
            })
        }

        $('#activate_ga').click(() => {
            conf.behavior.activate_ga = $('#activate_ga-1').is(':checked')
            saveConfiguration()
        })

        chrome.storage.local.get('configuration', function (items) {
            conf = items.configuration || {}
            conf.appearance = conf.appearance || {}
            conf.appearance.color_theme = conf.appearance.color_theme || 'light-theme'
            conf.appearance.custom_colors = conf.appearance.custom_colors || {}
            Object.keys(custom_colors).forEach(key => {
                conf.appearance.custom_colors[key] = conf.appearance.custom_colors[key] || {
                    value: 'white',
                    is_active: false
                }
            })
            conf.appearance.window_theme = conf.appearance.window_theme || 'round-theme'
            conf.appearance.font_size = conf.appearance.font_size || 'font-regular'
            conf.behavior = conf.behavior || {}
            conf.behavior.activate_ga = conf.behavior.activate_ga == null ? utils.getBrowser() === 'Chrome' : conf.behavior.activate_ga
            updateConfigurationView()
            apply_themes()
        })

        configuration.activeGA = () => conf.behavior.activate_ga
    }
})
