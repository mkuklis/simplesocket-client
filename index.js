var Emitter = require('emitter');
var SimpleSocket = require('simplesocket');

var client = module.exports = {
	connect: function (url, options) {
		var self = this;
		this.socket = new SimpleSocket(url, null, options);
		
		this.socket.onmessage = function (event) {
			try {
				var data = JSON.parse(event.data);
				if (data.name) {
					self.emit(data.name, data.args);
				}
			}
			catch (error) {

			}
		}

		return this;
	}
};

Emitter(client);