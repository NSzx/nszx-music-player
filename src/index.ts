import "chrome"
import "jquery"
import "jqueryui"
import "bootstrap"
import { Main } from "./Main"
import { resolve } from "./utils/injection"

$(function() {
    resolve(Main).run()
})
