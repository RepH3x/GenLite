export class SamualInventoryNotificationPlugin {

    static pluginName = 'FullInventoryNotificationPlugin';

    isPluginEnabled : boolean = false;
    spellDiv : HTMLElement;
    HE_DIV : string = "new_ux-spells-abilities__inner__list__row new_ux-spell-available"

    lastSpell = "";

    async init() {
        window.genlite.registerModule(this);
        this.isPluginEnabled = window.genlite.settings.add("FullInventory.Enable", false, "Full Inventory Notification", "checkbox", this.handlePluginEnableDisable, this);
    }

    handlePluginEnableDisable(state: boolean) {
        this.isPluginEnabled = state;

        if(state === false) {
            this.lastSpell = "";
            this.spellDiv.style.backgroundColor = "";
            this.spellDiv = null;
        }
    }

    playerAction(e) {
        if(this.isPluginEnabled === false)
            return;

        if(e.type == "spell-success" && this.lastSpell == "skill_mining_heated") {
            switch(Object.keys(INVENTORY.items).length) {
                case 28: {
                    //Pretty sure this will color the wrong div if any other spells are added that
                    //are castable with only fire and earth cards, or if any other cards are in the
                    //inventory so that other spells are castable
                    this.spellDiv = <HTMLElement>document.getElementsByClassName(this.HE_DIV)[1];
                    this.spellDiv.style.backgroundColor = "red";
                    break;
                }
                case 29: {
                    SFX_PLAYER.play("inventory-full", 0.3);
                    this.spellDiv.style.backgroundColor = "";
                    this.lastSpell = "";
                    break;
                }
            }
        }
    }

    action(verb, params) {
        if(this.isPluginEnabled === false)
            return;

        if(verb == "cast_spell" && this.lastSpell != params.spellId) {
            this.lastSpell = params.spellId;
        }
    }
}