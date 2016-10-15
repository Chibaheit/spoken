path = require 'path'
fs = require 'fs'
{$$, SelectListView} = require "atom-space-pen-views"

class SpokenView extends SelectListView
    initialize: (@file) ->
        super()
        console.log('111')

module.exports = SpokenView
