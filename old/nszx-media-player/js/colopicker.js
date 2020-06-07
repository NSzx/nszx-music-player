colorpicker = {}

$(function () {
    let $container = $('#colorpicker_container')
    let slider_red = $('#colorpicker_red')
    let slider_green = $('#colorpicker_green')
    let slider_blue = $('#colorpicker_blue')
    let slider_alpha = $('#colorpicker_alpha')

    let colorInput
    const updateColorPreview = () => {
        if (colorInput != null) {
            let r = slider_red.val()
            let g = slider_green.val()
            let b = slider_blue.val()
            let a = slider_alpha.val()/100
            colorInput.val(`rgba(${r}, ${g}, ${b}, ${a})`)
            colorInput.trigger('input')
        }
    }

    $container.find('.input-slider').change(function () {
        let v = $(this).val()
        $(`#${this.id}_value`).text(v)
    })

    $container.find('.input-slider').on('input', function () {
        let v = $(this).val()
        $(`#${this.id}_value`).text(v)
        updateColorPreview()
    })

    let ignoreNextClick = false
    $('body').click(() => {
        if (ignoreNextClick) {
            ignoreNextClick = false
            return
        }
        $container.fadeOut()
        colorInput = null
    })
    $container.click(e => {
        e.stopPropagation()
        return false
    })

    const placeCpAt = (x, y) => {
        const w = $container.outerWidth()
        const h = $container.outerHeight()
        const max_x = $('body').innerWidth()
        const max_y = $('body').innerHeight()
        if (x + w > max_x) x -= w
        if (y + h > max_y) y -= h
        $container.css('left', x).css('top', y)
        $container.fadeIn()
    }


    function setColorFrom(cp) {
        let [r, g, b, a] = cp.css('background-color').replace(/[^0-9,.]/g, '').split(',').map(v => +v)
        a = a == null ? 1 : a
        slider_red.val(r).change()
        slider_green.val(g).change()
        slider_blue.val(b).change()
        slider_alpha.val(Math.floor(a*100)).change()
    }

    colorpicker.openFor = (cp, input) => {
        colorInput = input
        setColorFrom(cp)
        let offset = cp.offset()
        placeCpAt(offset.left + cp.width() + 5, offset.top - 1)
        ignoreNextClick = true
    }
    $container.fadeOut()
})
