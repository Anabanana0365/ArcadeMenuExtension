# Arcade Menu UI

A menu and settings extension for Microsoft MakeCode Arcade.

## Features

- Create menus with a title.
- Add action buttons, ON/OFF toggles, numeric sliders, and choice lists.
- Navigate with the D-pad / arrow keys.
- Press **A** to activate a button or toggle; use **left/right** to change toggles, sliders, and choices.
- Press **B** to close the menu.
- React to button selections, setting changes, and menu closing with event blocks.
- Save toggle, slider, and choice values using Arcade's settings storage.
- Change the menu palette, title, item labels, and values while the game is running.
- Scroll automatically when there are more than five menu items.

## Add to a MakeCode Arcade project

This folder is a complete MakeCode extension package. To add it through the Extensions picker, publish the folder as a GitHub repository and import that repository URL in MakeCode Arcade:

1. Create a new **public** GitHub repository.
2. Upload the files in this folder (`pxt.json`, `main.ts`, and `README.md`) to the repository's root.
3. In MakeCode Arcade, open **Extensions** from the gear menu.
4. Paste the GitHub repository URL and import it.

The ZIP itself is a source package; the Extensions picker imports extension repositories by URL rather than directly importing a ZIP file.

## Quick start (JavaScript / TypeScript)

```typescript
let mainMenu = arcadeMenu.createMenu("MY GAME")
arcadeMenu.addButton(mainMenu, "Start game")
arcadeMenu.addButton(mainMenu, "How to play")
arcadeMenu.addToggle(mainMenu, "Music", true)
arcadeMenu.addSlider(mainMenu, "Volume", 0, 10, 5, 1)
arcadeMenu.addChoice(mainMenu, "Difficulty", "Easy,Normal,Hard", 1)

arcadeMenu.onButtonPressed(mainMenu, function (index, label) {
    if (index == 0) {
        // Start your game here.
    } else if (index == 1) {
        game.showLongText("Use the arrow keys to move. Press A to select.", DialogLayout.Full)
    }
})

arcadeMenu.onSettingChanged(mainMenu, function (index, value) {
    // Index 2 is Music (0 = off, 1 = on).
    // Index 3 is Volume (0 to 10).
    // Index 4 is Difficulty (0 = Easy, 1 = Normal, 2 = Hard).
})

arcadeMenu.show(mainMenu)
```

## Block workflow

1. Use **create menu titled** to make a menu variable.
2. Add **button**, **toggle**, **slider**, and/or **choice** items.
3. Add **on button selected** and **on setting changed** event blocks.
4. Use **show menu** when you want the menu to appear.
5. Read or update settings with **value of item**, **text of item**, and **set item** blocks.

Item indexes start at **0** and follow the order in which items were added. Toggle values are `0` (off) and `1` (on). Choice values are zero-based indexes into the comma-separated option list.

## Saving behavior

Toggle, slider, and choice values are stored using MakeCode Arcade's `settings` API. Each setting is identified by the menu's creation order and the item's position in that menu. Keep menu creation order and item order stable between game versions if you want saved values to remain associated with the same settings.

## Controls

| Control | Action |
|---|---|
| Up / Down | Move selection |
| Left / Right | Change a toggle, slider, or choice |
| A | Activate a button or toggle; cycle a choice |
| B | Close the menu |

## Notes

- The menu is drawn over the game after sprites, so the game remains underneath it.
- This extension is designed for the standard 160×120 MakeCode Arcade screen and uses the current Arcade screen dimensions when drawing.
- Action buttons close the menu by default. Use **close menu after selecting an action button** to change this behavior.
