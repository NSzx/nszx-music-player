import { singleton } from "../../utils/injection"
import { inject } from "inversify"
import { MessagesHelper } from "../../utils/MessagesHelper"
import { BrowserHelper } from "../../utils/BrowserHelper"
import { ColorPicker } from "../ColorPicker"

interface Theme {
    i18n: string
    class: string
}

interface CustomColorTemplate {
    i18n: string
    css_var: string
}

const COLOR_THEMES: Map<string, Theme> =
    new Map<string, Theme>([
                               ["light-theme", {
                                   i18n: "light",
                                   class: "light-theme"
                               }],
                               ["dark-theme", {
                                   i18n: "dark",
                                   class: "dark-theme"
                               }],
                               ["blue-theme", {
                                   i18n: "tidal_wave",
                                   class: "blue-theme"
                               }],
                               ["pink-theme", {
                                   i18n: "strawberry_macaroon",
                                   class: "pink-theme"
                               }],
                               ["yellow-theme", {
                                   i18n: "sandstorm",
                                   class: "yellow-theme"
                               }]
                           ])
const WINDOW_THEMES: Map<string, Theme> =
    new Map<string, Theme>([
                               ["square-theme", {
                                   i18n: "sharp",
                                   class: "square-theme"
                               }],
                               ["round-theme", {
                                   i18n: "blunt",
                                   class: "round-theme"
                               }]
                           ])
const CUSTOM_COLORS: Map<string, CustomColorTemplate> =
    new Map<string, CustomColorTemplate>([
                                             ["main_background_color", {
                                                 css_var: "--main-bg-color",
                                                 i18n: "main_background_color"
                                             }],
                                             ["player_background_color", {
                                                 css_var: "--player-bg-color",
                                                 i18n: "player_background_color"
                                             }],
                                             ["popup_background_color", {
                                                 css_var: "--modal-bg-color",
                                                 i18n: "popup_background_color"
                                             }],
                                             ["progress_bar_background_color", {
                                                 css_var: "--progress-bg-color",
                                                 i18n: "progress_bar_background_color"
                                             }],
                                             ["tracks_background_color", {
                                                 css_var: "--tracks-bg-color",
                                                 i18n: "tracks_background_color"
                                             }],
                                             ["tracks_background_color_on_hover", {
                                                 css_var: "--tracks-bg-color-hover",
                                                 i18n: "tracks_background_color_on_hover"
                                             }],
                                             ["text_color", {
                                                 css_var: "--main-text-color",
                                                 i18n: "text_color"
                                             }],
                                             ["help_text_color", {
                                                 css_var: "--help-text-color",
                                                 i18n: "help_text_color"
                                             }],
                                             ["control_buttons_color", {
                                                 css_var: "--controls-color",
                                                 i18n: "control_buttons_color"
                                             }],
                                             ["control_buttons_color_on_hover", {
                                                 css_var: "--controls-color-hover",
                                                 i18n: "control_buttons_color_on_hover"
                                             }],
                                             ["disabled_control_buttons_color", {
                                                 css_var: "--controls-color-inactive",
                                                 i18n: "disabled_control_buttons_color"
                                             }],
                                             ["selected_control_buttons_color", {
                                                 css_var: "--controls-color-active",
                                                 i18n: "selected_control_buttons_color"
                                             }],
                                             ["playing_track_border_color", {
                                                 css_var: "--tracks-playing-border",
                                                 i18n: "playing_track_border_color"
                                             }],
                                             ["links_color", {
                                                 css_var: "--links-color",
                                                 i18n: "links_color"
                                             }],
                                             ["links_color_on_hover", {
                                                 css_var: "--links-color-hover",
                                                 i18n: "links_color_on_hover"
                                             }],
                                             ["border_color", {
                                                 css_var: "--main-border-color",
                                                 i18n: "border_color"
                                             }],
                                             ["shadow_color", {
                                                 css_var: "--shadow-color",
                                                 i18n: "shadow_color"
                                             }]
                                         ])

@singleton
export class ConfigurationModal {
    @inject(MessagesHelper)
    messages: MessagesHelper

    @inject(BrowserHelper)
    browserHelper: BrowserHelper

    @inject(ColorPicker)
    colorPicker: ColorPicker

    private conf: any = {}
    private colorThemeSelect: JQuery<HTMLElement> = $("#select_color_theme")
    private windowThemeSelect: JQuery<HTMLElement> = $("#select_window_theme")
    private customColorsFieldset: JQuery<HTMLElement> = $("#custom_colors_fieldset")
    private analyticsToggle: JQuery<HTMLElement> = $("#activate_ga")
    private analyticsToggleOn: JQuery<HTMLElement> = $("#activate_ga-1")
    private analyticsToggleOff: JQuery<HTMLElement> = $("#activate_ga-0")

    init() {
        for (let [key, theme] of COLOR_THEMES) {
            this.colorThemeSelect.append($("<option>", {
                value: key,
                text: this.messages.trad(theme.i18n)
            }))
        }
        for (let [key, theme] of WINDOW_THEMES) {
            this.windowThemeSelect.append($("<option>", {
                value: key,
                text: this.messages.trad(theme.i18n)
            }))
        }
        for (let [key, theme] of CUSTOM_COLORS) {
            this.customColorsFieldset.append(`
                <div class="form-group">
                    <label class="col-md-4 col-xs-4 control-label"
                           for="${ key }_input">${ this.messages.trad(theme.i18n) }</label>
                    <div class="col-md-' col-xs-4">
                        <input id="${ key }_input" name="${ key }_input"
                                class="form-control">
                    </div>
                    <div class="col-md-1 col-xs-1">
                        <span class="color-preview-container">
                            <span id="${ key }_preview" class="color-preview"><span class="glyphicon glyphicon-pencil"></span></span>
                        </span>
                    </div>
                    <div class="col-md-2 col-xs-3">
                        <label class="checkbox-inline" for="${ key }_is_active">
                            <input id="${ key }_is_active" name="${ key }_is_active" type="checkbox">
                            ${ this.messages.trad("active") }
                        </label>
                    </div>
                </div>`)
            let input: JQuery<HTMLInputElement> = $(`#${ key }_input`)
            let preview: JQuery<HTMLElement> = $(`#${ key }_preview`)
            input.on("input", () => {
                let color = input.val() as string
                preview.css("background", "transparent")
                preview.css("background", color)
                this.conf.appearance.custom_colors[key].value = color
                this.applyTheme()
                this.saveConfiguration()
            })
            preview.on("click", () => {
                this.colorPicker.openFor(preview, input)
            })
            let checkbox = $(`#${ key }_is_active`)
            checkbox.on("click", e => {
                this.conf.appearance.custom_colors[key].value = input.val() as string
                this.conf.appearance.custom_colors[key].is_active = checkbox.is(":checked")
                this.applyTheme()
                this.saveConfiguration()
            })
        }

        this.colorThemeSelect.on("change", () => {
            let value = this.colorThemeSelect.val() as string
            let theme = COLOR_THEMES.get(value)
            if (theme != null) {
                this.conf.appearance.color_theme = value
                this.applyTheme()
                this.saveConfiguration()
            }
        })
        this.windowThemeSelect.on("change", () => {
            let value = this.windowThemeSelect.val() as string
            let theme = WINDOW_THEMES.get(value)
            if (theme != null) {
                this.conf.appearance.window_theme = value
                this.applyTheme()
                this.saveConfiguration()
            }
        })
        $("#select_font_size").on("click", () => {
            this.conf.appearance.font_size = $("input[name=\"font_size\"]:checked").val()
            this.applyTheme()
            this.saveConfiguration()
        })

        this.analyticsToggle.on("click", () => {
            this.conf.behavior.activate_ga = this.analyticsToggleOn.is(":checked")
            this.saveConfiguration()
        })

        this.browserHelper.get("configuration")
            .then((configuration) => {
                this.conf = configuration || {}
                this.conf.appearance = this.conf.appearance || {}
                this.conf.appearance.color_theme = this.conf.appearance.color_theme || "light-theme"
                this.conf.appearance.custom_colors = this.conf.appearance.custom_colors || {}

                for (let key of CUSTOM_COLORS.keys()) {
                    let config = this.conf.appearance.custom_colors[key]
                    this.conf.appearance.custom_colors[key] = {
                        value: config == null ? "DEFAULT" : config.value,
                        is_active: config == null ? false : config.is_active
                    }
                }
                this.conf.appearance.window_theme = this.conf.appearance.window_theme || "round-theme"
                this.conf.appearance.font_size = this.conf.appearance.font_size || "font-regular"
                this.conf.behavior = this.conf.behavior || {}
                this.conf.behavior.activate_ga = this.conf.behavior.activate_ga == null ? this.browserHelper.getBrowser() === "Chrome" : this.conf.behavior.activate_ga

                this.updateConfigurationView()
                this.applyTheme()
            })
    }

    updateConfigurationView() {
        this.colorThemeSelect.val(this.conf.appearance.color_theme)
        this.windowThemeSelect.val(this.conf.appearance.window_theme)

        $("input[name=\"font_size\"][value=\"" + this.conf.appearance.font_size + "\"]").prop("checked", true)

        for (let key of CUSTOM_COLORS.keys()) {

            let config = this.conf.appearance.custom_colors[key]

            $(`#${ key }_input`).val(config.value)
            $(`#${ key }_preview`).css("background", config.value)
            $(`#${ key }_is_active`).prop("checked", config.is_active)
        }

        if (this.browserHelper.getBrowser() === "Chrome" && this.conf.behavior.activate_ga) {
            this.analyticsToggleOn.prop("checked", true)
        } else {
            this.analyticsToggleOff.prop("checked", true)
        }
    }

    saveConfiguration() {
        this.browserHelper.set("configuration", this.conf)
    }

    applyTheme() {
        let body = $("body")
        body.attr("class", this.conf.appearance.window_theme + " "
                           + this.conf.appearance.color_theme + " " + this.conf.appearance.font_size)
        for (let [key, template] of CUSTOM_COLORS) {
            let config = this.conf.appearance.custom_colors[key]
            if (config.is_active && config.value != "DEFAULT") {
                body[0].style.setProperty(template.css_var, config.value)
            } else {
                body[0].style.removeProperty(template.css_var)
            }
        }
    }

    isAnalyticsActive(): boolean {
        return this.conf.behavior.activate_ga
    }
}
