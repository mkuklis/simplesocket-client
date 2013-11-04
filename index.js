var Emitter = require('emitter');
var SimpleSocket = require('simplesocket');

var client = module.exports = {};

Emitter(client);

client.connect = function (url, options) {
  var self = this;
  this.socket = new SimpleSocket(url, undefined, options);
  
  this.socket.onmessage = function (event) {
    try {
      var data = JSON.parse(event.data);

      if (data.name) {
        self.trigger.apply(self, [data.name].concat(data.args));
      }
    }
    catch (error) {
      self.trigger(error, error);
    }
  }
  
  this.socket.onerror = function (event) {
    self.trigger('error', event);
  }

  this.socket.onconnecting = function () {
    self.trigger('connecting');
  }

  this.socket.onclose = function () {
    self.trigger('disconnect');
  }
  
  return this;
}

client.trigger = client.emit;

client.emit = function (name, data) {
  var message = { name: name, args: [ data ] };
  this.socket.send(JSON.stringify(message));
}