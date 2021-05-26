"use strict";

var backgroundConsole = chrome.extension.getBackgroundPage().console;

var TorrentService = (function (console, $) {
    function TorrentService() {
    }

    TorrentService.prototype.fail = function (result) {
        console.log('fail', result);

        alert('Something went wrong, make sure deluge is started (go to torrent.ckserv.net) or check the logs!');
    };

    TorrentService.prototype.download = function (url) {
        $.ajax({
            url: 'http://manage.m.ckserv.net/api/download',
            // url: 'http://127.0.0.1:8000/api/download',
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                url: url
            }),
            success: function () {
                alert('SUCCESS');
            },
            error: function (data) {
                alert('FAILED')
            }
        })
    };

    TorrentService.prototype.isMagnet = function (url) {
        return url.startsWith('magnet:?') || url.indexOf('xt=urn:btih') > -1;
    };

    TorrentService.prototype.isTorrent = function (url) {
        return url.endsWith('.torrent');
    };

    return TorrentService;
})(backgroundConsole, $);


var App = (function (console) {
    function App(torrents) {
        this.torrents = torrents;
    }

    App.prototype.onContextClick = function (context) {
        var url = context.linkUrl;
        var isApplicable = this.torrents.isMagnet(url) || this.deluge.isTorrent(url);

        if (!isApplicable) {
            alert("URL isn't a torrent or a magnet... whatcha doin'?");
        } else {
            this.torrents.download(url);
        }
    };

    App.prototype.createContextMenu = function () {
        chrome.contextMenus.create({
            title: "Deluge Download",
            contexts: ["link"],
            onclick: this.onContextClick.bind(this)
        });
    };

    App.prototype.run = function () {
        this.createContextMenu();
    };

    return App;
})(backgroundConsole);

chrome.runtime.onInstalled.addListener(function() {
    var torrents = new TorrentService();
    var app = new App(torrents);
    app.run();
});

