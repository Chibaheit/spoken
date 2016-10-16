'use babel';

import {EventEmitter} from 'events';

import Recorder from './recorder.js';

function resample2(buf) {
  var t = buf.length;
  var sampleRate = 44;
  var outputSampleRate = 16;
  var s = 0,
      o = sampleRate / outputSampleRate,
      u = Math.ceil(t * outputSampleRate / sampleRate),
      a = new Float32Array(u);
  for (i = 0; i < u; i++) {
    a[i] = buf[Math.floor(s)];
    s += o;
  }
  return a;
}
function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}
function transformToPCM(samples) {
  var buffer = new ArrayBuffer(samples.length * 2);
  var view = new DataView(buffer);
  floatTo16BitPCM(view, 0, samples);
  return buffer;
}
var extractResult = function(resultBuffer, metaLen, startPos) {
  var metaStartPos = 4;
  var bufView = new Uint8Array(resultBuffer);
  var metaBufView = bufView.subarray(metaStartPos, metaStartPos + metaLen);
  var str = String.fromCharCode.apply(null, metaBufView);
  return JSON.parse(str);
}

class LiulishuoSender {
  constructor(callback, timeout = 0){
    let ws = new WebSocket("ws://54.223.187.43:8281/llcup/stream/upload");
    this.ws = ws;
    this.sendBuf = [];
    this.callback = callback;
    this.callbackTimes = 0;
    this.timeout = timeout;

    this.sendHead();

    ws.onopen = () => {
      this.sendBuf.forEach((msg) => {
        console.log("ws.send buffer");
        ws.send(msg);
      })
      this.sendBuf = [];
    }
    ws.onmessage = (e) => {
      this.handleSesameResult(e.data);
    }
    ws.onclose = (e) => {
      console.log('clossed', e);
    }
    ws.onerror = (e) => {
      console.log(e);
    }
  }
  handleSesameResult(data){
    this.callbackTimes++;
    var reader = new FileReader();
    reader.addEventListener("loadend", () => {
      var resultBuffer = reader.result;
      var resultView = new DataView(resultBuffer);
      var metaLen = resultView.getUint32(0);
      var meta = extractResult(resultBuffer, metaLen, 4);
      var realResult = '';
      if(meta.result.length > 0) {
        var ans = atob(meta.result);
        realResult = ans;
        try{
          realResult = JSON.parse(realResult);
        }catch(e){}
      }
      if (this.callback){
        this.callback(null, realResult);
      }
    });
    reader.readAsArrayBuffer(data);
  }
  sendHead(){
    let metadata = 'eyJ0eXBlIjoiYXNyIiwicXVhbGl0eSI6LTF9';
    let buf = new ArrayBuffer(4 + metadata.length);
    let offset = 0;

    let view = new DataView(buf);
    offset += 4;
    view.setUint32(0, metadata.length, false);

    let meta = new Uint8Array(buf, offset, metadata.length);
    offset += metadata.length;
    meta.set(metadata.split('').map(function(item){return item.charCodeAt(0);}));

    this.sendmsg(buf);
  }
  sendEOF(){
    var eof = new ArrayBuffer(3);
    var eofView = new Uint8Array(eof);
    eofView[0] = 0x45;
    eofView[1] = 0x4f;
    eofView[2] = 0x53;
    this.sendmsg(eof);

    if (this.timeout > 0){
      setTimeout(() => {
        if (this.callbackTimes == 0 && this.callback){
          this.callback(this.timeout, null);
          this.callback = null;
        }
      }, this.timeout);
    }
  }
  sendmsg(msg){
    if (this.ws.readyState == 1){
      console.log('ws.send directly');
      this.ws.send(msg);
    }else{
      this.sendBuf.push(msg);
    }
  }
  send(inputBuffer){
    console.log(inputBuffer);
    this.sendPart(inputBuffer);
    this.sendEOF();
  }
  sendPart(inputBuffer){
    this.sendmsg(transformToPCM(resample2(inputBuffer)));
  }
}

let audio_context = new AudioContext();

window.AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
window.URL = window.URL || window.webkitURL;

class Getter extends EventEmitter {
  constructor() {
    super();
    navigator.getUserMedia({audio: true}, this.startUserMedia.bind(this), function(e) {
      console.log('No live audio input: ' + e);
    });
    this.createSender();
  }
  createSender() {
    this.sender = new LiulishuoSender((err, msg) => {
      this.emit('message', err, msg);
    });
  }
  startUserMedia(stream){
    let input = audio_context.createMediaStreamSource(stream);
    this.recorder = new Recorder(input, {
      sampleRate: 16,
    });
    console.log("can record");
  }
  canRecord(){
    return !!this.recorder;
  }
  record(){
    if (this.recorder){
      this.recorder.record();
      this.recorder.recordBuffer((inputArray) => {
        this.sender.sendPart(inputArray);
      });
    }
  }
  stop(){
    if (this.recorder){
      this.recorder.stop();
      this.recorder.clear();
    }
    this.sender.sendEOF();
    this.createSender();
  }
}

let getter = new Getter();

export default getter;
