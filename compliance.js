"use strict";

(function() {
	var tstpg = "dl.dropboxusercontent.com/u/223590863/site/index.html";
	if (!(window.location.href.includes(tstpg))) {
		return;
	}

	var ok = true;
	function test(path) {
		var req = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP');
		var msg = "Source code is not compliant. Do not push changes.";
		req.addEventListener("load", function() {
			var txt = this.responseText;
			if (ok && txt.includes("\r")) {
				ok = false;
				alert(msg);
			}
		});
		req.open("GET", path);
		req.send();
	}

	test("index.html");
	test("esim.html");
	test("utils.js");
	test("esim/bar.css");
	test("esim/foo.js");
	test("esim/votesys.js");

})();
