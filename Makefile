build: components index.js
	@component build --dev

components: component.json
	@component install --dev

uglify:
	@component build -s SSClient
	@uglifyjs -nc --unsafe -mt -o ssclient.min.js build/build.js
	@mv build/build.js ssclient.js

clean:
	rm -fr build components

.PHONY: clean
