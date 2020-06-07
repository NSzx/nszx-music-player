import { singleton } from "../utils/injection"
import ChangeEvent = JQuery.ChangeEvent

@singleton
export class ColorPicker {

    private $container: JQuery<HTMLElement> = $("#colorpicker_container")
    private redSlider: JQuery<HTMLInputElement> = $("#colorpicker_red")
    private greenSlider: JQuery<HTMLInputElement> = $("#colorpicker_green")
    private blueSlider: JQuery<HTMLInputElement> = $("#colorpicker_blue")
    private alphaSlider: JQuery<HTMLInputElement> = $("#colorpicker_alpha")

    private colorInput: JQuery<HTMLInputElement>
    private ignoreNextClick: boolean = false

    init() {
        this.$container.find(".input-slider")
            .on("change", (e: ChangeEvent) => {
                let v = $(e.target).val() as string
                $(`#${ e.target.id }_value`).text(v)
            })

        this.$container.find(".input-slider")
            .on("input", (e: ChangeEvent) => {
                let v = $(e.target).val() as string
                $(`#${ e.target.id }_value`).text(v)
                this.updateColorPreview()
            })

        $("body").on("click", () => {
            if (this.ignoreNextClick) {
                this.ignoreNextClick = false
                return
            }
            this.$container.fadeOut()
            this.colorInput = null
        })
        this.$container.on("click", e => {
            e.stopPropagation()
            return false
        })

        this.$container.fadeOut()
    }

    openFor(cp: JQuery<HTMLElement>, input: JQuery<HTMLInputElement>) {
        this.colorInput = input
        this.setColorFrom(cp)
        let offset = cp.offset()
        this.placeCpAt(offset.left + cp.width() + 5, offset.top - 1)
        this.ignoreNextClick = true
    }

    private updateColorPreview() {
        if (this.colorInput != null) {
            let r = +this.redSlider.val()
            let g = +this.greenSlider.val()
            let b = +this.blueSlider.val()
            let a = +this.alphaSlider.val() / 100
            this.colorInput.val(`rgba(${ r }, ${ g }, ${ b }, ${ a })`)
            this.colorInput.trigger("input")
        }
    }

    private placeCpAt(x: number, y: number) {
        const w = this.$container.outerWidth()
        const h = this.$container.outerHeight()
        const max_x = $("body").innerWidth()
        const max_y = $("body").innerHeight()
        if (x + w > max_x) {
            x -= w
        }
        if (y + h > max_y) {
            y -= h
        }
        this.$container.css("left", x).css("top", y)
        this.$container.fadeIn()
    }

    private setColorFrom(cp: JQuery<HTMLElement>) {
        let [r, g, b, a] = cp.css("background-color")
                             .replace(/[^0-9,.]/g, "")
                             .split(",")
                             .map((v: string) => +v)
        a = a == null ? 1 : a
        this.redSlider.val(r).trigger("change")
        this.greenSlider.val(g).trigger("change")
        this.blueSlider.val(b).trigger("change")
        this.alphaSlider.val(Math.floor(a * 100)).trigger("change")
    }
}
