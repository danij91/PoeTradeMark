# PoE TradeMark

A Chrome extension that bookmarks official Path of Exile and Path of Exile 2 trade searches and converts listing prices with poe.ninja exchange rates.

This is an unofficial fan tool and is not affiliated with Grinding Gear Games. It is read-only on the trade site: it never auto-whispers, auto-buys, or auto-travels.

## Features

- Save the current search and reopen it from a right-hand sidebar
- Rename, copy, delete, drag to reorder, and search your bookmarks
- Split PoE1 (`/trade`) and PoE2 (`/trade2`) lists by URL
- Korean, global, Taiwan, and other regional trade sites
- Price conversion from poe.ninja, a base-currency picker, and a two-currency rate table
- UI languages: 한국어, English, 日本語, Español, Français, Deutsch, ไทย, Русский, Português, 繁體中文
- Header links to PoEDB, poe.ninja, and this repository

## Install (Chrome unpacked)

1. Clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the **`extension`** folder inside the repo.
   - Load `extension`, not the repository root.
5. Refresh the trade tab. After code changes, **Reload** the extension, then refresh the tab.

## Supported trade sites

- Korea: `https://poe.kakaogames.com/trade`, `/trade2`
- Global: `https://www.pathofexile.com/trade`, `/trade2`, and language subdomains
- Taiwan: `https://pathofexile.tw/trade`, `/trade2`

## Usage

1. Open a trade search or currency exchange page.
2. Use the **Bookmark** button (bottom right) to save the current search.
3. Open the **list** button for the sidebar. The jump icon on a row returns you to that search.
4. Use the sidebar for a base currency and the rate table. Rates come from poe.ninja and are cached for about 30 minutes.

## License / assets

The code follows this repository. Currency icons are Path of Exile game assets owned by GGG, bundled only for display in the extension.
