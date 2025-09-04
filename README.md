# Sidebar Progress Bar

Sidebar Progress Bar is an Obsidian plugin that displays a progress bar in the file explorer sidebar, showing how many tasks have been completed across your notes.
It supports daily, weekly, monthly, or custom notes and can track either the latest, today’s, or all notes in a folder.
The progress bar color dynamically changes based on completion percentage for quick visual feedback.

---
## Features

✅ Shows a progress bar in the sidebar, always visible.

📅 Supports daily, weekly, monthly, and custom note types.

🔍 Tracking modes: latest note, today’s note, or all notes in a folder.

🎨 Progress bar color changes through 12 levels depending on completion.

🗂️ Works with both single notes and entire folders.

⚡ Automatically updates when notes are modified.

---
## Releasing new versions

Update your manifest.json with a new version number.

Update versions.json with "new-version": "minimum-obsidian-version".

Create a GitHub Release with manifest.json, main.js, and styles.css.

Example:

```
npm version patch
git push --tags
```

---
## How to use

Go to Settings → Sidebar Progress Bar.

Choose a note or folder to track.

Select the note type (Daily, Weekly, Monthly, Custom).

Choose a tracking mode:

Latest → only the most recent note.

Today → today’s note (or this week/month if selected).

All → all notes inside the folder.

The progress bar will appear in your sidebar automatically.

---
## Manually installing the plugin

Copy main.js, styles.css, and manifest.json to:

VaultFolder/.obsidian/plugins/sidebar-progress-bar/

Reload Obsidian and enable the plugin.
## Funding

If you like this plugin, you can support its development by giving feedback.

---
## API Documentation

See the official Obsidian API docs here:
👉 https://github.com/obsidianmd/obsidian-api