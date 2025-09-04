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
    constructor() {
        super(...arguments);
        this.sidebarProgressBarContainer = null;
        this.cssEl = null;
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.addSettingTab(new SidebarProgressBarSettingTab(this.app, this));
            yield this.loadSettings();
            // Wait for workspace to load
            this.app.workspace.onLayoutReady(() => __awaiter(this, void 0, void 0, function* () {
                const leftLeaves = this.app.workspace.getLeavesOfType('file-explorer');
                if (!leftLeaves.length)
                    return;
                const leaf = leftLeaves[0];
                const fileExplorerContainer = leaf.view.containerEl;
                // Create sidebar progress bar container
                const sidebarProgressBarContainer = document.createElement('div');
                sidebarProgressBarContainer.id = 'sidebar-progress-bar-container';
                sidebarProgressBarContainer.style.display = 'flex';
                sidebarProgressBarContainer.style.alignItems = 'center';
                sidebarProgressBarContainer.style.justifyContent = 'flex-start';
                sidebarProgressBarContainer.style.height = '24px';
                sidebarProgressBarContainer.style.width = '100%';
                sidebarProgressBarContainer.style.marginTop = '8px';
                sidebarProgressBarContainer.style.padding = '0 6px';
                sidebarProgressBarContainer.style.backgroundColor = 'var(--background-secondary)';
                // Progress bar wrapper (for border)
                const sidebarProgressBarWrapper = document.createElement('div');
                sidebarProgressBarWrapper.style.height = '10px';
                sidebarProgressBarWrapper.style.width = '100%';
                sidebarProgressBarWrapper.style.backgroundColor = 'var(--background-secondary)';
                sidebarProgressBarWrapper.style.border = '1px solid var(--text-normal)';
                sidebarProgressBarWrapper.style.borderRadius = '4px';
                sidebarProgressBarWrapper.style.overflow = 'hidden';
                sidebarProgressBarWrapper.style.position = 'relative';
                // Progress bar itself
                const sidebarProgressBarFill = document.createElement('div');
                sidebarProgressBarFill.id = 'sidebar-progress-bar';
                sidebarProgressBarFill.style.height = '100%';
                sidebarProgressBarFill.style.width = '0%';
                sidebarProgressBarFill.style.backgroundColor = '#29a329';
                sidebarProgressBarFill.style.borderRadius = '4px 0 0 4px';
                sidebarProgressBarFill.style.transition = 'width 0.2s ease';
                // Percentage label
                const sidebarProgressBarPercentLabel = document.createElement('span');
                sidebarProgressBarPercentLabel.id = 'sidebar-progress-bar-percent';
                sidebarProgressBarPercentLabel.style.color = 'var(--text-normal)';
                sidebarProgressBarPercentLabel.style.fontSize = '12px';
                sidebarProgressBarPercentLabel.style.marginRight = '6px';
                sidebarProgressBarPercentLabel.textContent = '0%';
                sidebarProgressBarContainer.appendChild(sidebarProgressBarPercentLabel);
                sidebarProgressBarWrapper.appendChild(sidebarProgressBarFill);
                sidebarProgressBarContainer.appendChild(sidebarProgressBarWrapper);
                fileExplorerContainer.appendChild(sidebarProgressBarContainer);
                yield this.updateProgressBar();
                // Watch for file changes
                this.registerEvent(this.app.vault.on('modify', (file) => __awaiter(this, void 0, void 0, function* () {
                    if (!this.settings.notePath)
                        return;
                    const trackedPath = this.settings.notePath;
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
        const sidebarProgressBarContainer = document.querySelector('#sidebar-progress-bar-container');
        if (sidebarProgressBarContainer)
            sidebarProgressBarContainer.remove();
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
                filesToCheck = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(this.settings.notePath));
            }
            if (!filesToCheck.length)
                return;
            const now = new Date();
            if (this.settings.trackMode === 'latest') {
                filesToCheck.sort((a, b) => b.stat.mtime - a.stat.mtime);
                filesToCheck = [filesToCheck[0]];
            }
            else if (this.settings.trackMode === 'today' && !(abstractFile instanceof obsidian.TFile)) {
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
            }
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
                const sidebarProgressBarFill = document.getElementById('sidebar-progress-bar');
                const sidebarProgressBarPercentLabel = document.getElementById('sidebar-progress-bar-percent');
                if (sidebarProgressBarFill) {
                    sidebarProgressBarFill.style.width = `${percent}%`;
                    if (this.settings.colorMode === 'multicolor') {
                        if (percent <= 8.33)
                            sidebarProgressBarFill.style.backgroundColor = '#ff0000';
                        else if (percent <= 16.66)
                            sidebarProgressBarFill.style.backgroundColor = '#ff3300';
                        else if (percent <= 25)
                            sidebarProgressBarFill.style.backgroundColor = '#ff6600';
                        else if (percent <= 33.33)
                            sidebarProgressBarFill.style.backgroundColor = '#ff9900';
                        else if (percent <= 41.66)
                            sidebarProgressBarFill.style.backgroundColor = '#ffcc00';
                        else if (percent <= 50)
                            sidebarProgressBarFill.style.backgroundColor = '#ffff00';
                        else if (percent <= 58.33)
                            sidebarProgressBarFill.style.backgroundColor = '#c1e703ff';
                        else if (percent <= 66.66)
                            sidebarProgressBarFill.style.backgroundColor = '#a7e400ff';
                        else if (percent <= 75)
                            sidebarProgressBarFill.style.backgroundColor = '#84e103ff';
                        else if (percent <= 83.33)
                            sidebarProgressBarFill.style.backgroundColor = '#57cd02ff';
                        else if (percent <= 91.66)
                            sidebarProgressBarFill.style.backgroundColor = '#00be09ff';
                        else
                            sidebarProgressBarFill.style.backgroundColor = '#01a80cff';
                    }
                    else if (this.settings.colorMode === 'bw') {
                        const isDark = document.body.classList.contains('theme-dark');
                        sidebarProgressBarFill.style.backgroundColor = isDark ? 'white' : 'black';
                    }
                    else {
                        sidebarProgressBarFill.style.backgroundColor = 'var(--interactive-accent)';
                    }
                }
                if (sidebarProgressBarPercentLabel)
                    sidebarProgressBarPercentLabel.textContent = `${percent}%`;
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
// Settings Tab
class SidebarProgressBarSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        new obsidian.Setting(containerEl)
            .setName('Track Note / Folder')
            .setDesc('Choose the note or folder to track')
            .addText(text => {
            text.setPlaceholder('Start typing note/folder name')
                .setValue(this.plugin.settings.notePath)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.notePath = value;
                yield this.plugin.saveSettings();
            }));
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
            .setValue(this.plugin.settings.trackMode)
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
