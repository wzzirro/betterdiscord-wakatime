/**
 * @name wakatime
 * @description wakatime
 * @version 1.0.0
 * @author wzzirro
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    main: "index.js",
    id: "",
    name: "wakatime",
    author: "wzzirro",
    authorId: "",
    authorLink: "",
    version: "1.0.0",
    description: "wakatime",
    website: "",
    source: "",
    patreon: "",
    donate: "",
    invite: "",
    changelog: []
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
     const plugin = (Plugin, Library) => {

    const {DiscordModules, Logger} = Library;
    const {React} = DiscordModules;

    class Wakatime {
        wakatimeToken = null;
        wakatimeProxyUrl = 'https://api.wakatime-proxy.bug.land/v1/proxy';

        isAuth() {
            return !!(BdApi.loadData("wakatime", "wakatimeApiToken") && this.checkAuth())
        }

        sendHeartBeat() {
            Logger.info("Sending heartbeat");

            const heartBeatData = JSON.stringify({
                "url": "/users/current/heartbeats",
                "token": BdApi.loadData("wakatime", "wakatimeApiToken"),
                "method": 'POST',
                "data": {
                    "entity": "Messaging",
                    "type": "app",
                    "category": "researching",
                    "time": Math.floor(Date.now() / 1000),
                    "project": "Discord",
                    "language": "Meme"
                }
            });

            return fetch(this.wakatimeProxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: heartBeatData
            })
        }

        getCurrentUser() {
            Logger.info("Get Current User");

            const heartBeatData = JSON.stringify({
                "url": "/users/current",
                "token": BdApi.loadData("wakatime", "wakatimeApiToken"),
                "method": 'GET'
            });

            return fetch(this.wakatimeProxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: heartBeatData
            })
        }

        checkAuth() {
            Logger.info("Checking Auth");

            return this.getCurrentUser().then((response) => {
                return response.json().then((data) => {
                    return !!data?.data?.id
                });
            }).catch(() => {
                return false
            })
        }

        saveToken(token) {
            Logger.info("Saving Token");

            return BdApi.saveData("wakatime", "wakatimeApiToken", token);
        }
    }

    return class extends Plugin {
        pluginIsEnabled = true;
        windowIsFocused = false;
        wakatimeClient = null;
        isAuthenticated = false;

        async onStart() {
            Logger.info("Plugin enabled!");

            this.wakatimeClient = new Wakatime();
            this.isAuthenticated = this.wakatimeClient.isAuth();

            if (!this.isAuthenticated) {
                Logger.info("Not authenticated");

                this.showAuthModal()
            }

            this.initEvents();

            await this.loop();
        }

        onStop() {
            Logger.info("Plugin disabled!");
        }

        initEvents() {
            onfocus = (event) => {
                this.windowIsFocused = true;
                Logger.info("Window is focused. Start timetracking");
            };

            onblur = (event) => {
                this.windowIsFocused = false;
                Logger.info("Window is unfocused. Stopping timetracking");
            }
        }

        showAuthModal() {
            Logger.info("Not authenticated");
            let token = null;

            BdApi.showConfirmationModal(
                "Wakatime Token",
                React.createElement("input", {
                    placeholder: 'waka_tok_12345',
                    onChange: (event) => token = event.target.value
                }),
                {
                    onConfirm: () => {
                        this.wakatimeClient.saveToken(token);
                        this.isAuthenticated = this.wakatimeClient.isAuth();
                    }
                }
            )
        }

        async loop() {
            while (this.pluginIsEnabled) {
                if (this.windowIsFocused && this.isAuthenticated) {
                    this.wakatimeClient.sendHeartBeat().then((response) => {
                        if (response.status === 401 || response.status === 404) {
                            this.isAuthenticated = false;
                            this.showAuthModal()
                        }
                    }).catch(() => {
                        this.isAuthenticated = false;
                        this.showAuthModal()
                    });
                }

                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    };
};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/