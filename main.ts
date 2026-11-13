/**
 * Arcade Menu UI
 * A reusable menu and settings system for Microsoft MakeCode Arcade.
 */

namespace arcadeMenu {
    enum EntryType {
        Button = 0,
        Toggle = 1,
        Slider = 2,
        Choice = 3
    }

    class MenuEntry {
        label: string;
        type: number;
        value: number;
        minValue: number;
        maxValue: number;
        step: number;
        choices: string[];
        storageKey: string;

        constructor(label: string, type: number) {
            this.label = label;
            this.type = type;
            this.value = 0;
            this.minValue = 0;
            this.maxValue = 100;
            this.step = 1;
            this.choices = [];
            this.storageKey = "";
        }
    }

    /**
     * A menu instance. Create one with createMenu(), then add items to it.
     */
    export class Menu {
        title: string;
        items: MenuEntry[];
        selectedIndex: number;
        wrapNavigation: boolean;
        closeOnSelect: boolean;
        isOpen: boolean;
        id: number;

        backgroundColor: number;
        panelColor: number;
        accentColor: number;
        textColor: number;
        selectedTextColor: number;
        borderColor: number;

        buttonHandler: (index: number, label: string) => void;
        settingHandler: (index: number, value: number) => void;
        closedHandler: () => void;

        constructor(title: string, id: number) {
            this.title = title;
            this.items = [];
            this.selectedIndex = 0;
            this.wrapNavigation = true;
            this.closeOnSelect = true;
            this.isOpen = false;
            this.id = id;

            // Default dark purple theme using the standard Arcade palette.
            this.backgroundColor = 15;
            this.panelColor = 12;
            this.accentColor = 8;
            this.textColor = 1;
            this.selectedTextColor = 1;
            this.borderColor = 9;
        }
    }

    let nextMenuId = 1;
    let activeMenu: Menu = null;
    let inputInstalled = false;
    let rendererInstalled = false;

    function storageKey(menu: Menu, index: number): string {
        return "arcadeMenu_" + menu.id + "_" + index;
    }

    function clamp(value: number, low: number, high: number): number {
        if (value < low) return low;
        if (value > high) return high;
        return value;
    }

    function clipText(value: string, maxLength: number): string {
        if (value.length <= maxLength) return value;
        if (maxLength <= 2) return value.substr(0, maxLength);
        return value.substr(0, maxLength - 2) + "..";
    }

    function entryValueText(entry: MenuEntry): string {
        if (entry.type == EntryType.Toggle) {
            return entry.value > 0 ? "ON" : "OFF";
        } else if (entry.type == EntryType.Slider) {
            return "" + entry.value;
        } else if (entry.type == EntryType.Choice) {
            if (entry.choices.length > 0 && entry.value >= 0 && entry.value < entry.choices.length) {
                return clipText(entry.choices[entry.value], 7);
            }
        }
        return "";
    }

    function saveEntry(entry: MenuEntry): void {
        if (entry.type != EntryType.Button && entry.storageKey.length > 0) {
            settings.writeNumber(entry.storageKey, entry.value);
        }
    }

    function notifySetting(menu: Menu, index: number): void {
        if (menu.settingHandler && index >= 0 && index < menu.items.length) {
            menu.settingHandler(index, menu.items[index].value);
        }
    }

    function applyEntryValue(menu: Menu, index: number, newValue: number, notify: boolean): void {
        if (!menu || index < 0 || index >= menu.items.length) return;

        let entry = menu.items[index];
        let oldValue = entry.value;

        if (entry.type == EntryType.Toggle) {
            entry.value = newValue > 0 ? 1 : 0;
        } else if (entry.type == EntryType.Slider) {
            let safeStep = entry.step > 0 ? entry.step : 1;
            let snapped = Math.round((newValue - entry.minValue) / safeStep) * safeStep + entry.minValue;
            entry.value = clamp(snapped, entry.minValue, entry.maxValue);
        } else if (entry.type == EntryType.Choice) {
            if (entry.choices.length > 0) {
                entry.value = clamp(Math.round(newValue), 0, entry.choices.length - 1);
            }
        }

        if (entry.value != oldValue) {
            saveEntry(entry);
            if (notify) notifySetting(menu, index);
        }
    }

    function closeMenuInternal(menu: Menu): void {
        if (!menu || !menu.isOpen) return;
        menu.isOpen = false;
        if (activeMenu == menu) activeMenu = null;
        if (menu.closedHandler) menu.closedHandler();
    }

    function moveSelection(direction: number): void {
        if (!activeMenu || activeMenu.items.length == 0) return;

        let next = activeMenu.selectedIndex + direction;
        if (activeMenu.wrapNavigation) {
            if (next < 0) next = activeMenu.items.length - 1;
            if (next >= activeMenu.items.length) next = 0;
        } else {
            next = clamp(next, 0, activeMenu.items.length - 1);
        }
        activeMenu.selectedIndex = next;
    }

    function adjustSelected(direction: number): void {
        if (!activeMenu || activeMenu.items.length == 0) return;
        let index = activeMenu.selectedIndex;
        let entry = activeMenu.items[index];

        if (entry.type == EntryType.Toggle) {
            applyEntryValue(activeMenu, index, entry.value > 0 ? 0 : 1, true);
        } else if (entry.type == EntryType.Slider) {
            let safeStep = entry.step > 0 ? entry.step : 1;
            applyEntryValue(activeMenu, index, entry.value + direction * safeStep, true);
        } else if (entry.type == EntryType.Choice) {
            applyEntryValue(activeMenu, index, entry.value + direction, true);
        }
    }

    function activateSelected(): void {
        if (!activeMenu || activeMenu.items.length == 0) return;

        let menu = activeMenu;
        let index = menu.selectedIndex;
        let entry = menu.items[index];

        if (entry.type == EntryType.Button) {
            let handler = menu.buttonHandler;
            let label = entry.label;
            if (menu.closeOnSelect) closeMenuInternal(menu);
            if (handler) handler(index, label);
        } else if (entry.type == EntryType.Toggle) {
            applyEntryValue(menu, index, entry.value > 0 ? 0 : 1, true);
        } else if (entry.type == EntryType.Choice) {
            applyEntryValue(menu, index, entry.value + 1, true);
        }
    }

    function installInput(): void {
        if (inputInstalled) return;
        inputInstalled = true;

        controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
            if (activeMenu) moveSelection(-1);
        });
        controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
            if (activeMenu) moveSelection(1);
        });
        controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
            if (activeMenu) adjustSelected(-1);
        });
        controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
            if (activeMenu) adjustSelected(1);
        });
        controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
            if (activeMenu) activateSelected();
        });
        controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
            if (activeMenu) closeMenuInternal(activeMenu);
        });
    }

    function drawMenu(menu: Menu): void {
        if (!menu || !menu.isOpen) return;

        let width = screen.width;
        let height = screen.height;

        // Opaque background makes the menu readable above the game.
        screen.fillRect(0, 0, width, height, menu.backgroundColor);
        screen.fillRect(7, 5, width - 14, height - 10, menu.panelColor);
        screen.drawRect(7, 5, width - 14, height - 10, menu.borderColor);

        screen.print(clipText(menu.title, 22), 14, 11, menu.textColor);
        screen.drawLine(11, 23, width - 11, 23, menu.borderColor);

        let visibleRows = 5;
        let rowHeight = 13;
        let scrollOffset = 0;
        if (menu.selectedIndex >= visibleRows) {
            scrollOffset = menu.selectedIndex - visibleRows + 1;
        }

        if (menu.items.length == 0) {
            screen.print("No menu items", 16, 52, menu.textColor);
        } else {
            for (let row = 0; row < visibleRows; row++) {
                let index = scrollOffset + row;
                if (index >= menu.items.length) break;

                let entry = menu.items[index];
                let y = 28 + row * rowHeight;
                let foreground = menu.textColor;

                if (index == menu.selectedIndex) {
                    screen.fillRect(11, y - 1, width - 22, 11, menu.accentColor);
                    foreground = menu.selectedTextColor;
                    screen.print(">", 13, y, foreground);
                }

                let maxLabel = entry.type == EntryType.Button ? 20 : 14;
                screen.print(clipText(entry.label, maxLabel), 21, y, foreground);

                let valueText = entryValueText(entry);
                if (valueText.length > 0) {
                    screen.print(valueText, width - 47, y, foreground);
                }
            }
        }

        screen.drawLine(11, height - 19, width - 11, height - 19, menu.borderColor);
        screen.print("A: SELECT   B: BACK", 14, height - 14, menu.textColor);
    }

    function installRenderer(): void {
        if (rendererInstalled) return;
        rendererInstalled = true;

        // onShade draws after sprites, so the menu stays visible above the game.
        game.onShade(function () {
            if (activeMenu && activeMenu.isOpen) drawMenu(activeMenu);
        });
    }

    /**
     * Create a menu. Add buttons and settings, then call show menu.
     */
    //% blockId=arcade_menu_create block="create menu titled $title"
    //% blockSetVariable=menu
    //% blockNamespace=arcadeMenu
    //% weight=100 blockGap=8
    //% title.defl="Main menu"
    export function createMenu(title: string): Menu {
        let menu = new Menu(title, nextMenuId);
        nextMenuId++;
        return menu;
    }

    /** Add an action button to a menu. */
    //% blockId=arcade_menu_add_button block="add button $label to $menu"
    //% blockNamespace=arcadeMenu
    //% weight=90 blockGap=8
    //% label.defl="Play"
    export function addButton(menu: Menu, label: string): void {
        if (!menu) return;
        let entry = new MenuEntry(label, EntryType.Button);
        menu.items.push(entry);
    }

    /** Add a persistent ON/OFF setting. */
    //% blockId=arcade_menu_add_toggle block="add toggle $label default $defaultValue to $menu"
    //% blockNamespace=arcadeMenu
    //% weight=80 blockGap=8
    //% label.defl="Music"
    //% defaultValue.defl=true
    export function addToggle(menu: Menu, label: string, defaultValue: boolean): void {
        if (!menu) return;
        let entry = new MenuEntry(label, EntryType.Toggle);
        entry.value = defaultValue ? 1 : 0;
        entry.storageKey = storageKey(menu, menu.items.length);
        let savedValue = settings.readNumber(entry.storageKey);
        if (savedValue != null) entry.value = savedValue > 0 ? 1 : 0;
        menu.items.push(entry);
    }

    /** Add a persistent numeric slider. */
    //% blockId=arcade_menu_add_slider block="add slider $label from $minimum to $maximum default $initial step $step to $menu"
    //% blockNamespace=arcadeMenu
    //% weight=70 blockGap=8
    //% label.defl="Volume"
    //% minimum.defl=0 maximum.defl=10 initial.defl=5 step.defl=1
    export function addSlider(menu: Menu, label: string, minimum: number, maximum: number, initial: number, step: number): void {
        if (!menu) return;
        if (maximum < minimum) {
            let swap = maximum;
            maximum = minimum;
            minimum = swap;
        }
        if (step <= 0) step = 1;

        let entry = new MenuEntry(label, EntryType.Slider);
        entry.minValue = minimum;
        entry.maxValue = maximum;
        entry.step = step;
        entry.value = clamp(initial, minimum, maximum);
        entry.storageKey = storageKey(menu, menu.items.length);
        let savedValue = settings.readNumber(entry.storageKey);
        if (savedValue != null) entry.value = clamp(savedValue, minimum, maximum);
        menu.items.push(entry);
    }

    /**
     * Add a persistent choice setting. Separate choices with commas, for example:
     * "Easy,Normal,Hard".
     */
    //% blockId=arcade_menu_add_choice block="add choice $label options $options default index $defaultIndex to $menu"
    //% blockNamespace=arcadeMenu
    //% weight=60 blockGap=8
    //% label.defl="Difficulty"
    //% options.defl="Easy,Normal,Hard"
    //% defaultIndex.defl=1
    export function addChoice(menu: Menu, label: string, options: string, defaultIndex: number): void {
        if (!menu) return;
        let entry = new MenuEntry(label, EntryType.Choice);
        entry.choices = options.split(",");
        if (entry.choices.length == 0) entry.choices.push("Default");
        entry.value = clamp(Math.round(defaultIndex), 0, entry.choices.length - 1);
        entry.storageKey = storageKey(menu, menu.items.length);
        let savedValue = settings.readNumber(entry.storageKey);
        if (savedValue != null) entry.value = clamp(Math.round(savedValue), 0, entry.choices.length - 1);
        menu.items.push(entry);
    }

    /** Show a menu and enable its controller controls. */
    //% blockId=arcade_menu_show block="show menu $menu"
    //% blockNamespace=arcadeMenu
    //% weight=100 blockGap=8
    export function show(menu: Menu): void {
        if (!menu) return;
        if (activeMenu && activeMenu != menu) closeMenuInternal(activeMenu);
        activeMenu = menu;
        menu.isOpen = true;
        if (menu.selectedIndex >= menu.items.length) menu.selectedIndex = 0;
        installInput();
        installRenderer();
    }

    /** Close a menu. */
    //% blockId=arcade_menu_close block="close menu $menu"
    //% blockNamespace=arcadeMenu
    //% weight=95 blockGap=8
    export function close(menu: Menu): void {
        closeMenuInternal(menu);
    }

    /** Run code when an action button is selected. Index starts at zero. */
    //% blockId=arcade_menu_on_button block="on button selected in $menu"
    //% blockNamespace=arcadeMenu
    //% draggableParameters
    //% weight=85 blockGap=8
    export function onButtonPressed(menu: Menu, handler: (index: number, label: string) => void): void {
        if (menu) menu.buttonHandler = handler;
    }

    /** Run code when a toggle, slider, or choice changes. Toggle values are 0 or 1. */
    //% blockId=arcade_menu_on_setting block="on setting changed in $menu"
    //% blockNamespace=arcadeMenu
    //% draggableParameters
    //% weight=75 blockGap=8
    export function onSettingChanged(menu: Menu, handler: (index: number, value: number) => void): void {
        if (menu) menu.settingHandler = handler;
    }

    /** Run code when a menu is closed. */
    //% blockId=arcade_menu_on_closed block="on menu closed $menu"
    //% blockNamespace=arcadeMenu
    //% draggableParameters
    //% weight=65 blockGap=8
    export function onMenuClosed(menu: Menu, handler: () => void): void {
        if (menu) menu.closedHandler = handler;
    }

    /** Get a setting value. Toggle: 0/1, slider: number, choice: zero-based option index. */
    //% blockId=arcade_menu_get_value block="value of item $index in $menu"
    //% blockNamespace=arcadeMenu
    //% weight=55 blockGap=8
    //% index.min=0 index.defl=0
    export function getItemValue(menu: Menu, index: number): number {
        if (!menu || index < 0 || index >= menu.items.length) return 0;
        return menu.items[index].value;
    }

    /** Get the current text for a menu item. */
    //% blockId=arcade_menu_get_text block="text of item $index in $menu"
    //% blockNamespace=arcadeMenu
    //% weight=50 blockGap=8
    //% index.min=0 index.defl=0
    export function getItemText(menu: Menu, index: number): string {
        if (!menu || index < 0 || index >= menu.items.length) return "";
        let entry = menu.items[index];
        if (entry.type == EntryType.Button) return entry.label;
        return entryValueText(entry);
    }

    /** Change a setting by code. The new value is saved and triggers on setting changed. */
    //% blockId=arcade_menu_set_value block="set item $index in $menu to $value"
    //% blockNamespace=arcadeMenu
    //% weight=45 blockGap=8
    //% index.min=0 index.defl=0 value.defl=1
    export function setItemValue(menu: Menu, index: number, value: number): void {
        applyEntryValue(menu, index, value, true);
    }

    /** Change a menu title while the game is running. */
    //% blockId=arcade_menu_set_title block="set title of $menu to $title"
    //% blockNamespace=arcadeMenu
    //% weight=40 blockGap=8
    export function setTitle(menu: Menu, title: string): void {
        if (menu) menu.title = title;
    }

    /** Change the label of an item. Index starts at zero. */
    //% blockId=arcade_menu_set_label block="set label of item $index in $menu to $label"
    //% blockNamespace=arcadeMenu
    //% weight=35 blockGap=8
    //% index.min=0 index.defl=0
    export function setItemLabel(menu: Menu, index: number, label: string): void {
        if (menu && index >= 0 && index < menu.items.length) {
            menu.items[index].label = label;
        }
    }

    /** Set the menu's palette colors. Each color is a standard Arcade palette number (0-15). */
    //% blockId=arcade_menu_set_colors block="set colors of $menu background $background panel $panel accent $accent text $text border $border"
    //% blockNamespace=arcadeMenu
    //% weight=30 blockGap=8
    //% background.min=0 background.max=15 panel.min=0 panel.max=15 accent.min=0 accent.max=15 text.min=0 text.max=15 border.min=0 border.max=15
    //% background.defl=15 panel.defl=12 accent.defl=8 text.defl=1 border.defl=9
    export function setColors(menu: Menu, background: number, panel: number, accent: number, text: number, border: number): void {
        if (!menu) return;
        menu.backgroundColor = clamp(background, 0, 15);
        menu.panelColor = clamp(panel, 0, 15);
        menu.accentColor = clamp(accent, 0, 15);
        menu.textColor = clamp(text, 0, 15);
        menu.selectedTextColor = clamp(text, 0, 15);
        menu.borderColor = clamp(border, 0, 15);
    }

    /** Choose whether the selection wraps from the first item to the last. */
    //% blockId=arcade_menu_set_wrap block="set wrap navigation of $menu to $enabled"
    //% blockNamespace=arcadeMenu
    //% weight=25 blockGap=8
    export function setWrapNavigation(menu: Menu, enabled: boolean): void {
        if (menu) menu.wrapNavigation = enabled;
    }

    /** Choose whether action buttons automatically close the menu when selected. */
    //% blockId=arcade_menu_set_close_on_select block="close $menu after selecting an action button $enabled"
    //% blockNamespace=arcadeMenu
    //% weight=20 blockGap=8
    export function setCloseOnSelect(menu: Menu, enabled: boolean): void {
        if (menu) menu.closeOnSelect = enabled;
    }

    /** Check whether a menu is currently open. */
    //% blockId=arcade_menu_is_open block="is $menu open"
    //% blockNamespace=arcadeMenu
    //% weight=15 blockGap=8
    export function isOpen(menu: Menu): boolean {
        return !!menu && activeMenu == menu && menu.isOpen;
    }
}
