Getter = require './getter'

lines = [
	"include standard input and outputs file",
	"define number a equals one number b equals two",
	"delete current line",
	"backspace",
	"delete current line",
	"define number a equals one number b equals two",
	"define the main function",
	"print the string hello world",
	"print the result of a plus b",
	"return zero and end"
]
x = 0
recording = false

similarity = (a, b) ->
	sa = a.split(' ')
	sb = b.split(' ')
	len = Math.max sa.length, sb.length
	cnt = 0
	for i in [0...len]
		ssa = if sa[i] then sa[i] else ""
		ssb = if sb[i] then sb[i] else ""
		slen = Math.max ssa.length, ssb.length
		for j in [0...slen]
			if ssa[j] and ssb[j] and ssa[j] == ssb[j]
				cnt += 1
	return (1.0 * cnt / Math.max(a.length, b.length)) >= 0.5

class Spoken

	config:
		enableTrigger:
			type: 'boolean'
			default: true

	activate: =>
		Getter.on 'message', (err, msg) =>
  		@onmessage err, msg
		atom.commands.add "atom-text-editor",
			'spoken:trigger': @toggle
	toggle: =>
		if recording == false
			recording = true
			Getter.record()
		else
			recording = false
			Getter.stop()
			x += 1

	onmessage: (err, data) ->
		console.log data
		if err
			console.log err
		else if data isnt {} and data.decoded
			string = data.decoded
			if similarity string, "include standard input and output file"
				atom.workspace.getActiveTextEditor().insertText('#include <stdio.h>\n')
			else if similarity string, "define number a equals one number b equals two"
				atom.workspace.getActiveTextEditor().insertText('int a = 1, b = 2;\n')
			else if similarity string, "define the main function"
				atom.workspace.getActiveTextEditor().insertText("int main() {\n")
				atom.workspace.getActiveTextEditor().insertText("\n")
				atom.workspace.getActiveTextEditor().insertText("}")
				atom.workspace.getActiveTextEditor().moveUp(1)
				atom.workspace.getActiveTextEditor().insertText("  ")
			else if similarity string, "print the string hello world"
				atom.workspace.getActiveTextEditor().insertText("printf(\"hello world\");\n")
				atom.workspace.getActiveTextEditor().insertText("  ")
			else if similarity string, "print the result of a plus b"
				atom.workspace.getActiveTextEditor().insertText("printf(\"%d\", a + b);\n")
				atom.workspace.getActiveTextEditor().insertText("  ")
			else if similarity string, "return zero and end"
				atom.workspace.getActiveTextEditor().insertText("return 0;")
				atom.workspace.getActiveTextEditor().moveDown(1)
				atom.workspace.getActiveTextEditor().moveRight(1)
			else if similarity string, "backspace"
				atom.workspace.getActiveTextEditor().backspace()
			else if similarity string, "delete current line"
				atom.workspace.getActiveTextEditor().moveToBeginningOfLine()
				atom.workspace.getActiveTextEditor().selectToEndOfLine()
				atom.workspace.getActiveTextEditor().delete()

module.exports = new Spoken()
