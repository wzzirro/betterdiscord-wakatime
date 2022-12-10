/**
 *
 * @param {import("zerespluginlibrary").Plugin} Plugin
 * @param {import("zerespluginlibrary").BoundAPI} Library
 * @returns
 */
module.exports = (Plugin, Library) => {

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