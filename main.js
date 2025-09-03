'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, [])).next());
    });
}

const DEFAULT_SETTINGS = {
    notePath: '',
    noteType: 'daily',
    trackMode: 'latest',
    colorMode: 'theme'
};
// Main Plugin Class
class SidebarProgressBar extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            console.log("Sidebar Progress Bar loaded");
            // Ribbon icon
            const ribbonIconEl = this.addRibbonIcon('dice', 'Sidebar Progress Bar', () => {
                new obsidian.Notice('Sidebar Progress Bar clicked!');
            });
            ribbonIconEl.addClass('sidebar-progress-bar-ribbon');
            // Status bar (optional)
            const statusBarItemEl = this.addStatusBarItem();
            statusBarItemEl.setText('Sidebar Progress Bar active');
            // Command to open modal
            this.addCommand({
                id: 'open-sidebar-progress-bar-modal',
                name: 'Open Sidebar Progress Bar Modal',
                callback: () => {
                    new SidebarProgressBarModal(this.app).open();
                }
            });
            // Add settings tab
            this.addSettingTab(new SidebarProgressBarSettingTab(this.app, this));
            // Wait for workspace to load
            this.app.workspace.onLayoutReady(() => __awaiter(this, void 0, void 0, function* () {
                const leftLeaves = this.app.workspace.getLeavesOfType('file-explorer');
                if (!leftLeaves.length) {
                    console.warn('Sidebar Progress Bar: no file explorer found');
                    return;
                }
                const leaf = leftLeaves[0];
                const container = leaf.view.containerEl;
                // Create progress bar container
                const sidebarContainer = document.createElement('div');
                sidebarContainer.id = 'sidebar-progress-bar-container';
                sidebarContainer.style.display = 'flex';
                sidebarContainer.style.alignItems = 'center';
                sidebarContainer.style.justifyContent = 'flex-start';
                sidebarContainer.style.height = '24px';
                sidebarContainer.style.width = '100%';
                sidebarContainer.style.marginTop = '8px';
                sidebarContainer.style.padding = '0 6px';
                sidebarContainer.style.backgroundColor = 'var(--background-secondary)';
                // Progress bar wrapper (for border)
                const progressWrapper = document.createElement('div');
                progressWrapper.style.height = '10px';
                progressWrapper.style.width = '100%';
                progressWrapper.style.backgroundColor = 'var(--background-secondary)';
                progressWrapper.style.border = '1px solid var(--divider-color)';
                progressWrapper.style.borderRadius = '4px';
                progressWrapper.style.overflow = 'hidden';
                progressWrapper.style.position = 'relative';
                // Progress bar itself
                const progressBar = document.createElement('div');
                progressBar.id = 'sidebar-progress-bar';
                progressBar.style.height = '100%';
                progressBar.style.width = '0%';
                progressBar.style.backgroundColor = '#29a329';
                progressBar.style.borderRadius = '4px 0 0 4px';
                progressBar.style.transition = 'width 0.2s ease';
                // Percentage label
                const percentLabel = document.createElement('span');
                percentLabel.id = 'sidebar-progress-bar-percent';
                percentLabel.style.color = 'var(--text-normal)';
                percentLabel.style.fontSize = '12px';
                percentLabel.style.marginRight = '6px';
                percentLabel.textContent = '0%';
                sidebarContainer.appendChild(percentLabel);
                progressWrapper.appendChild(progressBar);
                sidebarContainer.appendChild(progressWrapper);
                container.appendChild(sidebarContainer);
                yield this.updateProgressBar();
                // Watch for file changes
                this.registerEvent(this.app.vault.on('modify', (file) => __awaiter(this, void 0, void 0, function* () {
                    if (!this.settings.notePath)
                        return;
                    const trackedPath = this.settings.notePath;
                    // If the tracked path is a folder, also watch all files inside it
                    if (file.path === trackedPath || file.path.startsWith(trackedPath + '/')) {
                        yield this.updateProgressBar();
                    }
                })));
                // Optional: refresh periodically for folder tracking
                setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.updateProgressBar();
                }), 2000);
            }));
        });
    }
    onunload() {
        console.log("Sidebar Progress Bar unloaded");
    }
    updateProgressBar() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.settings.notePath)
                return;
            let filesToCheck = [];
            const abstractFile = this.app.vault.getAbstractFileByPath(this.settings.notePath);
            if (abstractFile instanceof obsidian.TFile) {
                filesToCheck = [abstractFile];
            }
            else if (abstractFile instanceof obsidian.TFolder) {
                filesToCheck = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(this.settings.notePath + '/'));
            }
            else {
                // fallback: custom path string
                filesToCheck = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(this.settings.notePath));
            }
            if (!filesToCheck.length)
                return;
            const now = new Date();
            // Filter by "trackMode"
            if (this.settings.trackMode === 'latest') {
                filesToCheck.sort((a, b) => b.stat.mtime - a.stat.mtime);
                filesToCheck = [filesToCheck[0]];
            }
            else if (this.settings.trackMode === 'today') {
                // Exception: if the tracked path is a single file, behave like "all"
                if (abstractFile instanceof obsidian.TFile) ;
                else {
                    // Apply noteType logic only if it's a folder
                    if (this.settings.noteType === 'daily') {
                        const todayStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
                        filesToCheck = filesToCheck.filter(f => f.basename.includes(todayStr));
                    }
                    else if (this.settings.noteType === 'weekly') {
                        const getISOWeek = (date) => {
                            const tempDate = new Date(date.getTime());
                            tempDate.setHours(0, 0, 0, 0);
                            tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
                            const yearStart = new Date(tempDate.getFullYear(), 0, 1);
                            return Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                        };
                        const weekStr = `W${getISOWeek(now)}-${now.getFullYear()}`;
                        filesToCheck = filesToCheck.filter(f => f.basename.includes(weekStr));
                    }
                    else if (this.settings.noteType === 'monthly') {
                        const monthStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
                        filesToCheck = filesToCheck.filter(f => f.basename.includes(monthStr));
                    }
                    // noteType 'custom' already behaves like 'all'
                }
            }
            // else 'all': keep all files
            try {
                let totalTasks = 0;
                let doneTasks = 0;
                for (const f of filesToCheck) {
                    const content = yield this.app.vault.read(f);
                    totalTasks += ((_a = content.match(/- \[ \]/g)) === null || _a === void 0 ? void 0 : _a.length) || 0;
                    doneTasks += ((_b = content.match(/- \[x\]/gi)) === null || _b === void 0 ? void 0 : _b.length) || 0;
                }
                const percent = totalTasks + doneTasks > 0
                    ? Math.round((doneTasks / (totalTasks + doneTasks)) * 100)
                    : 0;
                const progressBar = document.getElementById('sidebar-progress-bar');
                const percentLabel = document.getElementById('sidebar-progress-bar-percent');
                if (progressBar) {
                    progressBar.style.width = `${percent}%`;
                    if (this.settings.colorMode === 'multicolor') {
                        if (percent <= 8.33)
                            progressBar.style.backgroundColor = '#ff0000'; // red
                        else if (percent <= 16.66)
                            progressBar.style.backgroundColor = '#ff3300';
                        else if (percent <= 25)
                            progressBar.style.backgroundColor = '#ff6600';
                        else if (percent <= 33.33)
                            progressBar.style.backgroundColor = '#ff9900';
                        else if (percent <= 41.66)
                            progressBar.style.backgroundColor = '#ffcc00';
                        else if (percent <= 50)
                            progressBar.style.backgroundColor = '#ffff00'; // yellow
                        else if (percent <= 58.33)
                            progressBar.style.backgroundColor = '#c1e703ff';
                        else if (percent <= 66.66)
                            progressBar.style.backgroundColor = '#a7e400ff';
                        else if (percent <= 75)
                            progressBar.style.backgroundColor = '#84e103ff';
                        else if (percent <= 83.33)
                            progressBar.style.backgroundColor = '#57cd02ff';
                        else if (percent <= 91.66)
                            progressBar.style.backgroundColor = '#00be09ff';
                        else
                            progressBar.style.backgroundColor = '#01a80cff'; // dark green
                    }
                    else if (this.settings.colorMode === 'bw') {
                        // Adapt to theme type
                        const isDark = document.body.classList.contains('theme-dark');
                        progressBar.style.backgroundColor = isDark ? 'white' : 'black';
                    }
                    else {
                        // Theme accent color
                        progressBar.style.backgroundColor = 'var(--interactive-accent)';
                    }
                }
                if (percentLabel)
                    percentLabel.textContent = `${percent}%`;
            }
            catch (e) {
                console.error("Sidebar Progress Bar: failed to read files", e);
            }
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}
// Modal Example
class SidebarProgressBarModal extends obsidian.Modal {
    constructor(app) { super(app); }
    onOpen() { this.contentEl.setText('Sidebar Progress Bar Modal Opened!'); }
    onClose() { this.contentEl.empty(); }
}
// Settings Tab
class SidebarProgressBarSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        this.plugin;
        new obsidian.Setting(containerEl)
            .setName('Track Note / Folder')
            .setDesc('Choose the note or folder to track')
            .addText(text => {
            var _a;
            text.setPlaceholder('Start typing note/folder name')
                .setValue(this.plugin.settings.notePath)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.notePath = value;
                yield this.plugin.saveSettings();
            }));
            text.inputEl.style.width = '100%';
            text.inputEl.style.fontSize = '14px';
            text.inputEl.style.padding = '6px 28px 6px 8px'; // space for clear button
            // ---- Wrap input in relative container ----
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.width = '100%';
            (_a = text.inputEl.parentElement) === null || _a === void 0 ? void 0 : _a.appendChild(wrapper);
            wrapper.appendChild(text.inputEl);
            // ---- Add clear ❌ button ----
            const clearBtn = document.createElement('div');
            clearBtn.style.position = 'absolute';
            clearBtn.style.right = '8px';
            clearBtn.style.top = '50%';
            clearBtn.style.transform = 'translateY(-50%)';
            clearBtn.style.cursor = 'pointer';
            clearBtn.style.fontSize = '12px';
            clearBtn.style.color = 'var(--text-muted)';
            clearBtn.style.background = 'var(--background-primary)';
            clearBtn.style.borderRadius = '50%';
            clearBtn.style.width = '16px';
            clearBtn.style.height = '16px';
            clearBtn.style.display = 'flex';
            clearBtn.style.alignItems = 'center';
            clearBtn.style.justifyContent = 'center';
            clearBtn.addEventListener('mouseenter', () => {
                clearBtn.style.background = 'var(--background-modifier-hover)';
                clearBtn.style.color = 'var(--text-normal)';
            });
            clearBtn.addEventListener('mouseleave', () => {
                clearBtn.style.background = 'var(--background-primary)';
                clearBtn.style.color = 'var(--text-muted)';
            });
            const cross = document.createElement('span');
            cross.textContent = '✕';
            cross.style.transform = 'translate(0.4px, -0.8px)'; // relative adjustment
            clearBtn.appendChild(cross);
            clearBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                text.setValue('');
                this.plugin.settings.notePath = '';
                yield this.plugin.saveSettings();
            }));
            wrapper.appendChild(clearBtn);
            // ---- Create custom dropdown ----
            const dropdown = document.createElement('div');
            dropdown.style.position = 'absolute';
            dropdown.style.backgroundColor = 'var(--background-secondary)';
            dropdown.style.border = '1px solid var(--interactive-border)';
            dropdown.style.borderRadius = '6px';
            dropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            dropdown.style.maxHeight = '250px';
            dropdown.style.overflowY = 'auto';
            dropdown.style.display = 'none';
            dropdown.style.zIndex = '9999';
            // Position directly under the input
            dropdown.style.top = `${text.inputEl.offsetHeight + 2}px`;
            dropdown.style.left = '0';
            dropdown.style.width = `${text.inputEl.offsetWidth}px`;
            dropdown.style.textAlign = 'left';
            dropdown.style.padding = '3px 4px';
            wrapper.appendChild(dropdown);
            // ---- Input listener for suggestions ----
            text.inputEl.addEventListener('input', (evt) => {
                const input = evt.target.value.toLowerCase();
                const suggestions = this.plugin.app.vault.getAllLoadedFiles()
                    .filter(f => f instanceof obsidian.TFile || f instanceof obsidian.TFolder)
                    .filter(f => f.path.toLowerCase().includes(input))
                    .map(f => {
                    if (f instanceof obsidian.TFile)
                        return f.path; // keep extension
                    if (f instanceof obsidian.TFolder)
                        return f.path + '/'; // folder with /
                    return '';
                });
                dropdown.innerHTML = '';
                if (suggestions.length > 0) {
                    dropdown.style.display = 'block';
                    suggestions.forEach(s => {
                        const item = document.createElement('div');
                        item.textContent = s;
                        item.style.padding = '2px 8px';
                        item.style.textAlign = 'left';
                        item.style.borderRadius = '3px';
                        item.style.minHeight = '20px';
                        item.style.fontSize = '1em';
                        item.style.lineHeight = '1.6em';
                        item.style.cursor = 'pointer';
                        item.addEventListener('mouseenter', () => {
                            item.style.background = 'var(--interactive-hover)';
                        });
                        item.addEventListener('mouseleave', () => {
                            item.style.background = 'transparent';
                        });
                        item.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                            text.setValue(s); // set file/folder path
                            dropdown.style.display = 'none';
                            this.plugin.settings.notePath = text.getValue();
                            yield this.plugin.saveSettings();
                        }));
                        dropdown.appendChild(item);
                    });
                }
                else {
                    dropdown.style.display = 'none';
                }
            });
            // ---- Hide dropdown on blur ----
            text.inputEl.addEventListener('blur', () => {
                setTimeout(() => { dropdown.style.display = 'none'; }, 100);
            });
        });
        new obsidian.Setting(containerEl)
            .setName('Note Type')
            .setDesc('Daily, Weekly, Monthly, or Custom note')
            .addDropdown(dropdown => dropdown
            .addOption('daily', 'Daily')
            .addOption('weekly', 'Weekly')
            .addOption('monthly', 'Monthly')
            .addOption('custom', 'Custom Note')
            .setValue(this.plugin.settings.noteType)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.noteType = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName('Tracking Mode')
            .setDesc('Choose which notes to track')
            .addDropdown(dropdown => dropdown
            .addOption('latest', 'Latest note only')
            .addOption('today', 'Today\'s note only')
            .addOption('all', 'All notes in folder')
            .setValue(this.plugin.settings.trackMode || 'latest')
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.trackMode = value;
            yield this.plugin.saveSettings();
            yield this.plugin.updateProgressBar();
        })));
        new obsidian.Setting(containerEl)
            .setName('Progress Bar Color Mode')
            .setDesc('Choose how the progress bar is colored')
            .addDropdown(dropdown => dropdown
            .addOption('theme', 'Theme accent color')
            .addOption('multicolor', 'Multicolor scale')
            .addOption('bw', 'Black/White (based on theme)')
            .setValue(this.plugin.settings.colorMode)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.colorMode = value;
            yield this.plugin.saveSettings();
            yield this.plugin.updateProgressBar();
        })));
    }
}

module.exports = SidebarProgressBar;
//# sourceMappingURL=main.js.map
