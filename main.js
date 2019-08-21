"use strict";

var DELUGE_API_ENDPOINT = 'http://torrent.ckserv.net/json';
var DELUGE_API_TORRENT_OPTIONS = { // should load this from deluge
    "file_priorities": [],
    "add_paused": false,
    "compact_allocation": false,
    "download_location": "/storage/media/data/downloading",
    "move_completed": true,
    "move_completed_path": "/storage/media/data/downloaded",
    "max_connections": -1,
    "max_download_speed": -1,
    "max_upload_slots": -1,
    "max_upload_speed": -1,
    "prioritize_first_last_pieces": false
};

var backgroundConsole = chrome.extension.getBackgroundPage().console;

var Client = (function (console, $) {
    function Client(endpoint) {
        this.endpoint = endpoint;

        this.default = {
            success: function () {},
            fail: function () {}
        };
    }

    Client.prototype.setDefaultCallbacks = function (defaultCallbacks) {
        this.default.success = defaultCallbacks.success || this.default.success;
        this.default.fail = defaultCallbacks.fail || this.default.fail;
    };

    Client.prototype.call = function (method, params, success, fail) {
        success = success || this.default.success;
        fail = fail || this.default.fail;

        return $.ajax({
            url: this.endpoint,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                id: 1,
                method: method,
                params: params
            }),
            success: function (data) {
                console.log(data);
                if (data === undefined) {
                    success.apply(this, []);
                } else if (data !== undefined && data !== null && data.result !== undefined && data.error === undefined || data.error === null) {
                    success.apply(this, [data.result]);
                } else {
                    fail.apply(this, [data]);
                }
            },
            error: function (data) {
                fail.apply(this, [data]);
            }
        });
    };

    return Client;
})(backgroundConsole, $);


var Deluge = (function (console, $) {
    function Deluge(client, torrentOptions) {
        this.client = client;
        this.torrentOptions = torrentOptions;

        this.client.setDefaultCallbacks({
            fail: this.fail.bind(this)
        });
    }

    Deluge.prototype.fail = function (result) {
        console.log('fail', result);

        alert('Something went wrong, make sure deluge is started (go to torrent.ckserv.net) or check the logs!');
    };

    Deluge.prototype.login = function (password, authenticatedCallback) {
        var self = this;

        var success = function (authenticated) {
            console.log('login-success', authenticated);

            self.handleAuthentication(authenticated, authenticatedCallback);
        };

        this.client.call('auth.login', [password], success);
    };

    Deluge.prototype.handleAuthentication = function (authenticated, authenticatedCallback) {
        if (!authenticated) {
            this.login(prompt('Enter Deluge Password:'), authenticatedCallback);
        } else {
            authenticatedCallback();
        }
    };

    Deluge.prototype.onceAuthenticated = function (authenticatedCallback) {
        var self = this;

        var success = function (authenticated) {
            console.log('check-success', authenticated);

            self.handleAuthentication(authenticated, authenticatedCallback);
        };

        this.client.call('auth.check_session', [], success);
    };

    Deluge.prototype.download = function (url) {
        var self = this;

        this.onceAuthenticated(function () {
            var onAdded = function () {
                alert('Deluge Torrent Added!');
            };

            var download = function (path) {
                self.client.call('web.add_torrents', [[{path: path, options: self.torrentOptions}]], onAdded);
            };

            var onMagnetSuccess = function () {
                download(url);
            };

            var onTorrentSuccess = function (filename) {
                download(filename);
            };

            if (self.isMagnet(url)) {
                self.client.call('web.get_magnet_info', [url], onMagnetSuccess);
            } else {
                self.client.call('web.download_torrent_from_url', [url], onTorrentSuccess);
            }
        });
    };

    Deluge.prototype.isMagnet = function (url) {
        return url.startsWith('magnet:?') || url.indexOf('xt=urn:btih') > -1;
    };

    Deluge.prototype.isTorrent = function (url) {
        return url.endsWith('.torrent');
    };

    return Deluge;
})(backgroundConsole, $);


var App = (function (console) {
    function App(deluge) {
        this.deluge = deluge;
    }

    App.prototype.onContextClick = function (context) {
        var url = context.linkUrl;
        var isApplicable = this.deluge.isMagnet(url) || this.deluge.isTorrent(url);

        if (!isApplicable) {
            alert("url isn't a torrent or a magnet... whatcha doin'?");
        } else {
            this.deluge.download(url);
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
    var client = new Client(DELUGE_API_ENDPOINT);
    var deluge = new Deluge(client, DELUGE_API_TORRENT_OPTIONS);
    var app = new App(deluge);
    app.run();
});

