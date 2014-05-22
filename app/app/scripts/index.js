'use strict';
document.addEventListener('DOMContentLoaded', function() {
    chrome.gdgkr.greeting('importre', function (response) {
        var h1 = document.getElementsByTagName('h1');
        if (h1.length > 0) {
            h1[0].innerText = response.message;
        }
    });
}, false);
