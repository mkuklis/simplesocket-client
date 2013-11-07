var Emitter = require('emitter');
var SimpleSocket = require('simplesocket');

module.exports = {
  connect: function (url, options) {
    return new Client(url, options);
  }
}

function Client (url, options) {
  this.connect(url, options);
}

Emitter(Client.prototype);

Client.prototype.connect = function (url, options) {
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
      self.trigger('error', error);
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

Client.prototype.trigger = Client.prototype.emit;

Client.prototype.emit = function (name, data) {
  var message = { name: name, args: [ data ] };
  this.socket.send(JSON.stringify(message));
}

Client.prototype.disconnect = function () {
  this.removeAllListeners();
  this.socket.close();
}