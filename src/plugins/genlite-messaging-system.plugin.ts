export class GenLiteMessagingSystem {

    static pluginName = 'GenLiteMessagingSystem';
    isPluginEnabled: boolean = false;

    private originalChatSend: Function;
    private originalOnFilterButtonClicked: Function;
    private originalAddMessage: Function;

    private chatBoxMap: Map<string, HTMLElement[]> = new Map<string, HTMLElement[]>;
    private currentChat: string = 'all';

    async init() {
        window.genlite.registerModule(this);

        this.originalChatSend = Network.prototype.chatSend;
        this.originalOnFilterButtonClicked = Chat.prototype.onFilterButtonClicked;
        this.originalAddMessage = Chat.prototype.addMessage;

        //SETTINGS

        this.isPluginEnabled = window.genlite.settings.add('GenLiteMessagingSystem.Enable', false, 'GenLite Messaging System', 'checkbox', this.handlePluginEnableDisable, this);

        //REGISTER COMMANDS

        window.genlite.commands.register('bill', () => this.loadChatMap('Bill Dipperly'));
        window.genlite.commands.register('reset', () => this.loadChatMap('all'));
    }

    handlePluginEnableDisable(state: boolean) {
        this.isPluginEnabled = state;
        this.loadChatMap('all');
    }

    //OVERRIDES

    //Only used to automatically send pm's with no command if the current tab is set to a private messages
    chatSend(plugin, originalFunction: Function, text) {
        const self = (this as any);

        if(!plugin.isPluginEnabled) {
            originalFunction.bind(self)(text);
            return;
        }

        if(!['all', 'game', 'quest', 'public'].includes(plugin.currentChat)) {
            NETWORK.action('chat_private', { to: plugin.currentChat, message: text });
        } else {
            originalFunction.bind(self)(text);
        }
    }

    //Changes filter button functionality to switch between chatMaps instead of default message filtering
    //TODO:
    // - Maybe I could find a way to make the normal filtering work with my system
    // - Selected filter icons are broken
    // - Right click to selectively hide filters broken
    // - Game.addMessageClickOptions is broken for messages not sent by player
    onFilterButtonClicked(plugin, originalFunction: Function, type, event) {
        const self = (this as any);

        if(!plugin.isPluginEnabled) {
            originalFunction.bind(self)(type, event);
            return;
        }

        if(type == 'private') {
            CHAT.addGameMessage("private filter clicked");
        } else {
            originalFunction.bind(self)(type, event);
            plugin.loadChatMap(type);
        }
    }

    //Records messages and adds to chatMap even if plugin is disabled. Pretty much just runs original function
    //and records it, loads the relevant chatMap if plugin enabled
    addMessage(plugin, originalFunction: Function, type, timestamp, speaker, text, icon = false) {
        const self = (this as any);

        let message = originalFunction.bind(self)(type, timestamp, speaker, text, icon = false);

        if(!plugin.isPluginEnabled) {
            plugin.pushToCorrectMap(message, type, speaker);
            return;
        }

        plugin.pushToCorrectMap(message, type, speaker);
        plugin.loadChatMap(plugin.currentChat);
    }

    //HOOKS

    //Only hooked to register my overrides
    loginOK() {
        NETWORK.chatSend = this.chatSend.bind(NETWORK, this, this.originalChatSend);
        CHAT.onFilterButtonClicked = this.onFilterButtonClicked.bind(CHAT, this, this.originalOnFilterButtonClicked);
        CHAT.addMessage = this.addMessage.bind(CHAT, this, this.originalAddMessage);
    }

    //PRIVATE FUNCTIONS

    //Formats the speaker string into a usable format. [0] = '(PM', [1] = 'to/from', [2] = name
    //TODO:
    // - Probably want to just slice the ( off PM
    private getPMSpeakerArray(speaker: string): string[] {
        let speakerArray = speaker.split(' ');
        if(speakerArray.length > 3) {
            let name = speakerArray[2];
            for(var i = 3; i <= speakerArray.length - 1; i++) {
                name = name + ' ' + speakerArray[i];
            }
            speakerArray = [speakerArray[0], speakerArray[1], name];
        }
        speakerArray[2] = speakerArray[2].slice(0, -1);
        return speakerArray;
    }

    //Decides which chat map(s) to add the message to, and does so.
    //Necessary because I want to keep track of messages while the plugin is disabled
    private pushToCorrectMap(message, type: string, speaker: string) {
        switch(type) {
            case 'private':
                let speakerArray = this.getPMSpeakerArray(speaker);
                if ((speakerArray[1] == 'from' && speakerArray[2] !== PLAYER.character.nickname) ||
                    (speakerArray[1] == 'to' && speakerArray[2] !== PLAYER.character.nickname)) {
                    this.addToMap(speakerArray[2], message);
                    if (this.isPluginEnabled) {
                        if (speakerArray[1] == 'to') {
                            this.loadChatMap(speakerArray[2]);
                        } else {
                            this.loadChatMap(this.currentChat);
                        }
                    }
                }
                break;

            case 'game':
                this.addToMap('game', message);
                this.addToMap('all', message);
                break;

            case 'public':
                this.addToMap('public', message);
                this.addToMap('all', message);
                break;

            case 'quest':
                this.addToMap('quest', message);
                this.addToMap('all', message);
                break;
        }
    }

    //Adds the message div to the chatBoxMap with the given key. Appends if key already exists.
    private addToMap(key: string, div: HTMLElement) {
        if(!this.chatBoxMap.has(key)) {
            this.chatBoxMap.set(key, [div]);
        } else {
            let messageArray = this.chatBoxMap.get(key);
            messageArray.push(div);
            this.chatBoxMap.set(key, messageArray);
        }
    }

    //Attempts to load the chat list from given key in the chatBoxMap
    //If string exists, clears current chat div, then loads in new list of messages
    //Returns whether or not chatmap was successfully loaded
    private loadChatMap(key: string): boolean {
        if(!this.chatBoxMap.has(key)) {
            CHAT.addGameMessage('GMS: No such key: ' + key);
            return false;
        }
        CHAT.reset();
        this.currentChat = key;
        let chatDiv = document.getElementById('new_ux-chat-dialog-box-content');
        let messageArray = this.chatBoxMap.get(key);
        for (var i = messageArray.length - 1; i >= 0; --i) {
            chatDiv.appendChild(messageArray[i]);
        }
        return true;
    }

    private filterChatMap() {
        //this.chatBoxMap.get('all').filter();
    }
}