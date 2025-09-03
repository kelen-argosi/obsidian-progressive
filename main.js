import { __awaiter } from "tslib";
import { Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, SuggestModal } from 'obsidian';
const DEFAULT_SETTINGS = {
    notePath: '',
    noteType: 'daily',
    trackMode: 'latest'
};
// File/Folder Suggestion Modal
class FileFolderSuggest extends SuggestModal {
    constructor(app, plugin, inputEl) {
        super(app);
        this.plugin = plugin;
        this.inputEl = inputEl;
        this.setPlaceholder("Start typing to search files/folders...");
    }
    getSuggestions(query) {
        query = query.toLowerCase();
        const files = this.plugin.app.vault.getMarkdownFiles().map(f => f.path);
        const folders = this.plugin.app.vault.getAllLoadedFiles()
            .filter(f => !(f instanceof TFile))
            .map(f => f.path);
        const allPaths = [...files, ...folders];
        return allPaths
            .filter(p => p.toLowerCase().contains(query))
            .map(p => {
            const parts = p.split('/');
            const name = parts[parts.length - 1];
            return name.replace(/\.md$/, '');
        })
            .slice(0, 20);
    }
    renderSuggestion(item, el) {
        el.createEl('div', { text: item, cls: 'suggestion-item' });
    }
    onChooseSuggestion(item) {
        const allFiles = this.plugin.app.vault.getFiles().map(f => f.path);
        const allFolders = this.plugin.app.vault.getAllLoadedFiles().filter(f => !(f instanceof TFile)).map(f => f.path);
        const allPaths = [...allFiles, ...allFolders];
        const fullPath = allPaths.find(p => p.endsWith(item) || p.split('/').pop() === item);
        if (fullPath) {
            this.inputEl.value = fullPath;
            this.plugin.settings.notePath = fullPath;
            this.plugin.saveSettings();
        }
    }
}
// Main Plugin Class
export default class SidebarProgressBar extends Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            console.log("Sidebar Progress Bar loaded");
            // Ribbon icon
            const ribbonIconEl = this.addRibbonIcon('dice', 'Sidebar Progress Bar', () => {
                new Notice('Sidebar Progress Bar clicked!');
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
                sidebarContainer.style.backgroundColor = '#2A2A2A';
                // Progress bar wrapper (for border)
                const progressWrapper = document.createElement('div');
                progressWrapper.style.height = '10px';
                progressWrapper.style.width = '100%';
                progressWrapper.style.backgroundColor = '#2A2A2A';
                progressWrapper.style.border = '1px solid gray';
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
                percentLabel.style.color = 'white';
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
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.settings.notePath)
                return;
            let filesToCheck = [];
            const abstractFile = this.app.vault.getAbstractFileByPath(this.settings.notePath);
            if (abstractFile instanceof TFile) {
                filesToCheck = [abstractFile];
            }
            else if (abstractFile instanceof TFolder) {
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
                if (abstractFile instanceof TFile) {
                    // Do nothing, keep all filesToCheck
                }
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
class SidebarProgressBarModal extends Modal {
    constructor(app) { super(app); }
    onOpen() { this.contentEl.setText('Sidebar Progress Bar Modal Opened!'); }
    onClose() { this.contentEl.empty(); }
}
// Settings Tab
class SidebarProgressBarSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        const plugin = this.plugin;
        new Setting(containerEl)
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
                    .filter(f => f instanceof TFile || f instanceof TFolder)
                    .filter(f => f.path.toLowerCase().includes(input))
                    .map(f => {
                    if (f instanceof TFile)
                        return f.path; // keep extension
                    if (f instanceof TFolder)
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
        new Setting(containerEl)
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
        new Setting(containerEl)
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
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBNkIsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBU3JJLE1BQU0sZ0JBQWdCLEdBQStCO0lBQ2pELFFBQVEsRUFBRSxFQUFFO0lBQ1osUUFBUSxFQUFFLE9BQU87SUFDakIsU0FBUyxFQUFFLFFBQVE7Q0FDdEIsQ0FBQztBQUVGLCtCQUErQjtBQUMvQixNQUFNLGlCQUFrQixTQUFRLFlBQW9CO0lBSWhELFlBQVksR0FBUSxFQUFFLE1BQTBCLEVBQUUsT0FBeUI7UUFDdkUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBYTtRQUN4QixLQUFLLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTVCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUU7YUFDcEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQzthQUNsQyxHQUFHLENBQUMsQ0FBQyxDQUFD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LENBQUM7YUFDdkMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUM7YUFDcEQsUUFBUSxDQUFDLENBQU0sS0FBSyxFQUFDLEVBQUU7WUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLEtBQW1DLENBQUM7WUFDckUsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZDLENBQUMsQ0FBQSxDQUFDLENBQUMsQ0FBQztJQUVKLENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgRWRpdG9yLCBNYXJrZG93blZpZXcsIE1vZGFsLCBOb3RpY2UsIFBsdWdpbiwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgVEZpbGUsIFRGb2xkZXIsIFN1Z2dlc3RNb2RhbCB9IGZyb20gJ29ic2lkaWFuJztcclxuXHJcbi8vIFBsdWdpbiBTZXR0aW5ncyBJbnRlcmZhY2VcclxuaW50ZXJmYWNlIFNpZGViYXJQcm9ncmVzc0JhclNldHRpbmdzIHtcclxuICAgIG5vdGVQYXRoOiBzdHJpbmc7ICAgICAgICAvLyBQYXRoIHRvIHNwZWNpZmljIG5vdGUgb3IgZm9sZGVyXHJcbiAgICBub3RlVHlwZTogJ2RhaWx5JyB8ICd3ZWVrbHknIHwgJ21vbnRobHknIHwgJ2N1c3RvbSc7IC8vIFR5cGUgb2Ygbm90ZSB0cmFja2luZ1xyXG4gICAgdHJhY2tNb2RlOiAnbGF0ZXN0JyB8ICd0b2RheScgfCAnYWxsJyAgICAvLyB0cnVlID0gbGF0ZXN0IG5vdGUsIGZhbHNlID0gdG9kYXnigJlzIG5vdGVcclxufVxyXG5cclxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU2lkZWJhclByb2dyZXNzQmFyU2V0dGluZ3MgPSB7XHJcbiAgICBub3RlUGF0aDogJycsXHJcbiAgICBub3RlVHlwZTogJ2RhaWx5JyxcclxuICAgIHRyYWNrTW9kZTogJ2xhdGVzdCdcclxufTtcclxuXHJcbi8vIEZpbGUvRm9sZGVyIFN1Z2dlc3Rpb24gTW9kYWxcclxuY2xhc3MgRmlsZUZvbGRlclN1Z2dlc3QgZXh0ZW5kcyBTdWdnZXN0TW9kYWw8c3RyaW5nPiB7XHJcbiAgICBwbHVnaW46IFNpZGViYXJQcm9ncmVzc0JhcjtcclxuICAgIGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblxyXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lkZWJhclByb2dyZXNzQmFyLCBpbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50KSB7XHJcbiAgICAgICAgc3VwZXIoYXBwKTtcclxuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuICAgICAgICB0aGlzLmlucHV0RWwgPSBpbnB1dEVsO1xyXG4gICAgICAgIHRoaXMuc2V0UGxhY2Vob2xkZXIoXCJTdGFydCB0eXBpbmcgdG8gc2VhcmNoIGZpbGVzL2ZvbGRlcnMuLi5cIik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0U3VnZ2VzdGlvbnMocXVlcnk6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgICAgICBxdWVyeSA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKS5tYXAoZiA9PiBmLnBhdGgpO1xyXG4gICAgICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKVxyXG4gICAgICAgICAgICAuZmlsdGVyKGYgPT4gIShmIGluc3RhbmNlb2YgVEZpbGUpKVxyXG4gICAgICAgICAgICAubWFwKGYgPT4gZi5wYXRoKTtcclxuXHJcbiAgICAgICAgY29uc3QgYWxsUGF0aHMgPSBbLi4uZmlsZXMsIC4uLmZvbGRlcnNdO1xyXG5cclxuICAgICAgICByZXR1cm4gYWxsUGF0aHNcclxuICAgICAgICAgICAgLmZpbHRlcihwID0+IHAudG9Mb3dlckNhc2UoKS5jb250YWlucyhxdWVyeSkpXHJcbiAgICAgICAgICAgIC5tYXAocCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHAuc3BsaXQoJy8nKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuYW1lLnJlcGxhY2UoL1xcLm1kJC8sICcnKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnNsaWNlKDAsIDIwKTtcclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJTdWdnZXN0aW9uKGl0ZW06IHN0cmluZywgZWw6IEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgZWwuY3JlYXRlRWwoJ2RpdicsIHsgdGV4dDogaXRlbSwgY2xzOiAnc3VnZ2VzdGlvbi1pdGVtJyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBvbkNob29zZVN1Z2dlc3Rpb24oaXRlbTogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgYWxsRmlsZXMgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZXMoKS5tYXAoZiA9PiBmLnBhdGgpO1xyXG4gICAgICAgIGNvbnN0IGFsbEZvbGRlcnMgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKS5maWx0ZXIoZiA9PiAhKGYgaW5zdGFuY2VvZiBURmlsZSkpLm1hcChmID0+IGYucGF0aCk7XHJcbiAgICAgICAgY29uc3QgYWxsUGF0aHMgPSBbLi4uYWxsRmlsZXMsIC4uLmFsbEZvbGRlcnNdO1xyXG5cclxuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IGFsbFBhdGhzLmZpbmQocCA9PiBwLmVuZHNXaXRoKGl0ZW0pIHx8IHAuc3BsaXQoJy8nKS5wb3AoKSA9PT0gaXRlbSk7XHJcbiAgICAgICAgaWYgKGZ1bGxQYXRoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRFbC52YWx1ZSA9IGZ1bGxQYXRoO1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlUGF0aCA9IGZ1bGxQYXRoO1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIE1haW4gUGx1Z2luIENsYXNzXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNpZGViYXJQcm9ncmVzc0JhciBleHRlbmRzIFBsdWdpbiB7XHJcbiAgICBzZXR0aW5nczogU2lkZWJhclByb2dyZXNzQmFyU2V0dGluZ3M7XHJcblxyXG4gICAgYXN5bmMgb25sb2FkKCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTaWRlYmFyIFByb2dyZXNzIEJhciBsb2FkZWRcIik7XHJcblxyXG4gICAgICAgIC8vIFJpYmJvbiBpY29uXHJcbiAgICAgICAgY29uc3QgcmliYm9uSWNvbkVsID0gdGhpcy5hZGRSaWJib25JY29uKCdkaWNlJywgJ1NpZGViYXIgUHJvZ3Jlc3MgQmFyJywgKCkgPT4ge1xyXG4gICAgICAgICAgICBuZXcgTm90aWNlKCdTaWRlYmFyIFByb2dyZXNzIEJhciBjbGlja2VkIScpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJpYmJvbkljb25FbC5hZGRDbGFzcygnc2lkZWJhci1wcm9ncmVzcy1iYXItcmliYm9uJyk7XHJcblxyXG4gICAgICAgIC8vIFN0YXR1cyBiYXIgKG9wdGlvbmFsKVxyXG4gICAgICAgIGNvbnN0IHN0YXR1c0Jhckl0ZW1FbCA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpO1xyXG4gICAgICAgIHN0YXR1c0Jhckl0ZW1FbC5zZXRUZXh0KCdTaWRlYmFyIFByb2dyZXNzIEJhciBhY3RpdmUnKTtcclxuXHJcbiAgICAgICAgLy8gQ29tbWFuZCB0byBvcGVuIG1vZGFsXHJcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgICAgICAgaWQ6ICdvcGVuLXNpZGViYXItcHJvZ3Jlc3MtYmFyLW1vZGFsJyxcclxuICAgICAgICAgICAgbmFtZTogJ09wZW4gU2lkZWJhciBQcm9ncmVzcyBCYXIgTW9kYWwnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbmV3IFNpZGViYXJQcm9ncmVzc0Jhck1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHNldHRpbmdzIHRhYlxyXG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2lkZWJhclByb2dyZXNzQmFyU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xyXG5cclxuICAgICAgICAvLyBXYWl0IGZvciB3b3Jrc3BhY2UgdG8gbG9hZFxyXG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbGVmdExlYXZlcyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoJ2ZpbGUtZXhwbG9yZXInKTtcclxuICAgICAgICAgICAgaWYgKCFsZWZ0TGVhdmVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdTaWRlYmFyIFByb2dyZXNzIEJhcjogbm8gZmlsZSBleHBsb3JlciBmb3VuZCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGxlYWYgPSBsZWZ0TGVhdmVzWzBdO1xyXG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBsZWFmLnZpZXcuY29udGFpbmVyRWw7XHJcblxyXG4gICAgICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyIGNvbnRhaW5lclxyXG4gICAgICAgICAgICBjb25zdCBzaWRlYmFyQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgIHNpZGViYXJDb250YWluZXIuaWQgPSAnc2lkZWJhci1wcm9ncmVzcy1iYXItY29udGFpbmVyJztcclxuICAgICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICBzaWRlYmFyQ29udGFpbmVyLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LXN0YXJ0JztcclxuICAgICAgICAgICAgc2lkZWJhckNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSAnMjRweCc7XHJcbiAgICAgICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUud2lkdGggPSAnMTAwJSc7XHJcbiAgICAgICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUubWFyZ2luVG9wID0gJzhweCc7XHJcbiAgICAgICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUucGFkZGluZyA9ICcwIDZweCc7XHJcbiAgICAgICAgICAgIHNpZGViYXJDb250YWluZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyMyQTJBMkEnO1xyXG5cclxuICAgICAgICAgICAgLy8gUHJvZ3Jlc3MgYmFyIHdyYXBwZXIgKGZvciBib3JkZXIpXHJcbiAgICAgICAgICAgIGNvbnN0IHByb2dyZXNzV3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICBwcm9ncmVzc1dyYXBwZXIuc3R5bGUuaGVpZ2h0ID0gJzEwcHgnO1xyXG4gICAgICAgICAgICBwcm9ncmVzc1dyYXBwZXIuc3R5bGUud2lkdGggPSAnMTAwJSc7XHJcbiAgICAgICAgICAgIHByb2dyZXNzV3JhcHBlci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzJBMkEyQSc7XHJcbiAgICAgICAgICAgIHByb2dyZXNzV3JhcHBlci5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIGdyYXknO1xyXG4gICAgICAgICAgICBwcm9ncmVzc1dyYXBwZXIuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzRweCc7XHJcbiAgICAgICAgICAgIHByb2dyZXNzV3JhcHBlci5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xyXG4gICAgICAgICAgICBwcm9ncmVzc1dyYXBwZXIuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xyXG5cclxuICAgICAgICAgICAgLy8gUHJvZ3Jlc3MgYmFyIGl0c2VsZlxyXG4gICAgICAgICAgICBjb25zdCBwcm9ncmVzc0JhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICBwcm9ncmVzc0Jhci5pZCA9ICdzaWRlYmFyLXByb2dyZXNzLWJhcic7XHJcbiAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcclxuICAgICAgICAgICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAnMCUnO1xyXG4gICAgICAgICAgICBwcm9ncmVzc0Jhci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzI5YTMyOSc7XHJcbiAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc0cHggMCAwIDRweCc7XHJcbiAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLnRyYW5zaXRpb24gPSAnd2lkdGggMC4ycyBlYXNlJztcclxuXHJcbiAgICAgICAgICAgIC8vIFBlcmNlbnRhZ2UgbGFiZWxcclxuICAgICAgICAgICAgY29uc3QgcGVyY2VudExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG4gICAgICAgICAgICBwZXJjZW50TGFiZWwuaWQgPSAnc2lkZWJhci1wcm9ncmVzcy1iYXItcGVyY2VudCc7XHJcbiAgICAgICAgICAgIHBlcmNlbnRMYWJlbC5zdHlsZS5jb2xvciA9ICd3aGl0ZSc7XHJcbiAgICAgICAgICAgIHBlcmNlbnRMYWJlbC5zdHlsZS5mb250U2l6ZSA9ICcxMnB4JztcclxuICAgICAgICAgICAgcGVyY2VudExhYmVsLnN0eWxlLm1hcmdpblJpZ2h0ID0gJzZweCc7XHJcbiAgICAgICAgICAgIHBlcmNlbnRMYWJlbC50ZXh0Q29udGVudCA9ICcwJSc7XHJcblxyXG4gICAgICAgICAgICBzaWRlYmFyQ29udGFpbmVyLmFwcGVuZENoaWxkKHBlcmNlbnRMYWJlbCk7XHJcbiAgICAgICAgICAgIHByb2dyZXNzV3JhcHBlci5hcHBlbmRDaGlsZChwcm9ncmVzc0Jhcik7XHJcbiAgICAgICAgICAgIHNpZGViYXJDb250YWluZXIuYXBwZW5kQ2hpbGQocHJvZ3Jlc3NXcmFwcGVyKTtcclxuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHNpZGViYXJDb250YWluZXIpO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVQcm9ncmVzc0JhcigpO1xyXG5cclxuICAgICAgICAgICAvLyBXYXRjaCBmb3IgZmlsZSBjaGFuZ2VzXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbignbW9kaWZ5JywgYXN5bmMgKGZpbGUpID0+IHtcclxuICAgIFx0XHRcdGlmICghdGhpcy5zZXR0aW5ncy5ub3RlUGF0aCkgcmV0dXJuO1xyXG5cclxuICAgIFx0XHRcdGNvbnN0IHRyYWNrZWRQYXRoID0gdGhpcy5zZXR0aW5ncy5ub3RlUGF0aDtcclxuXHJcbiAgICBcdFx0XHQvLyBJZiB0aGUgdHJhY2tlZCBwYXRoIGlzIGEgZm9sZGVyLCBhbHNvIHdhdGNoIGFsbCBmaWxlcyBpbnNpZGUgaXRcclxuICAgIFx0XHRcdGlmIChmaWxlLnBhdGggPT09IHRyYWNrZWRQYXRoIHx8IGZpbGUucGF0aC5zdGFydHNXaXRoKHRyYWNrZWRQYXRoICsgJy8nKSkge1xyXG4gICAgICAgIFx0XHRcdGF3YWl0IHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pKTtcclxuXHJcblxyXG4gICAgICAgICAgICAvLyBPcHRpb25hbDogcmVmcmVzaCBwZXJpb2RpY2FsbHkgZm9yIGZvbGRlciB0cmFja2luZ1xyXG4gICAgICAgICAgICBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKCk7XHJcbiAgICAgICAgICAgIH0sIDIwMDApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9udW5sb2FkKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU2lkZWJhciBQcm9ncmVzcyBCYXIgdW5sb2FkZWRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgdXBkYXRlUHJvZ3Jlc3NCYXIoKSB7XHJcblx0XHRpZiAoIXRoaXMuc2V0dGluZ3Mubm90ZVBhdGgpIHJldHVybjtcclxuXHJcblx0XHRsZXQgZmlsZXNUb0NoZWNrOiBURmlsZVtdID0gW107XHJcblx0XHRjb25zdCBhYnN0cmFjdEZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5zZXR0aW5ncy5ub3RlUGF0aCk7XHJcblxyXG5cdFx0aWYgKGFic3RyYWN0RmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcblx0XHRcdGZpbGVzVG9DaGVjayA9IFthYnN0cmFjdEZpbGVdO1xyXG5cdFx0fSBlbHNlIGlmIChhYnN0cmFjdEZpbGUgaW5zdGFuY2VvZiBURm9sZGVyKSB7XHJcblx0XHRcdGZpbGVzVG9DaGVjayA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKS5maWx0ZXIoZiA9PlxyXG5cdFx0XHRcdGYucGF0aC5zdGFydHNXaXRoKHRoaXMuc2V0dGluZ3Mubm90ZVBhdGggKyAnLycpXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBmYWxsYmFjazogY3VzdG9tIHBhdGggc3RyaW5nXHJcblx0XHRcdGZpbGVzVG9DaGVjayA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKS5maWx0ZXIoZiA9PlxyXG5cdFx0XHRcdGYucGF0aC5zdGFydHNXaXRoKHRoaXMuc2V0dGluZ3Mubm90ZVBhdGgpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFmaWxlc1RvQ2hlY2subGVuZ3RoKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHJcblx0XHQvLyBGaWx0ZXIgYnkgXCJ0cmFja01vZGVcIlxyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3MudHJhY2tNb2RlID09PSAnbGF0ZXN0Jykge1xyXG5cdFx0XHRmaWxlc1RvQ2hlY2suc29ydCgoYSwgYikgPT4gYi5zdGF0Lm10aW1lIC0gYS5zdGF0Lm10aW1lKTtcclxuXHRcdFx0ZmlsZXNUb0NoZWNrID0gW2ZpbGVzVG9DaGVja1swXV07XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MudHJhY2tNb2RlID09PSAndG9kYXknKSB7XHJcblx0XHRcdC8vIEV4Y2VwdGlvbjogaWYgdGhlIHRyYWNrZWQgcGF0aCBpcyBhIHNpbmdsZSBmaWxlLCBiZWhhdmUgbGlrZSBcImFsbFwiXHJcblx0XHRcdGlmIChhYnN0cmFjdEZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xyXG5cdFx0XHRcdC8vIERvIG5vdGhpbmcsIGtlZXAgYWxsIGZpbGVzVG9DaGVja1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBBcHBseSBub3RlVHlwZSBsb2dpYyBvbmx5IGlmIGl0J3MgYSBmb2xkZXJcclxuXHRcdFx0XHRcdGlmICh0aGlzLnNldHRpbmdzLm5vdGVUeXBlID09PSAnZGFpbHknKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHRvZGF5U3RyID0gYCR7U3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyl9LSR7U3RyaW5nKG5vdy5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKX0tJHtub3cuZ2V0RnVsbFllYXIoKX1gO1xyXG5cdFx0XHRcdFx0XHRmaWxlc1RvQ2hlY2sgPSBmaWxlc1RvQ2hlY2suZmlsdGVyKGYgPT4gZi5iYXNlbmFtZS5pbmNsdWRlcyh0b2RheVN0cikpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLnNldHRpbmdzLm5vdGVUeXBlID09PSAnd2Vla2x5Jykge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBnZXRJU09XZWVrID0gKGRhdGU6IERhdGUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0ZW1wRGF0ZSA9IG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpKTtcclxuXHRcdFx0XHRcdFx0XHR0ZW1wRGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdFx0XHRcdFx0XHR0ZW1wRGF0ZS5zZXREYXRlKHRlbXBEYXRlLmdldERhdGUoKSArIDQgLSAodGVtcERhdGUuZ2V0RGF5KCkgfHwgNykpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHllYXJTdGFydCA9IG5ldyBEYXRlKHRlbXBEYXRlLmdldEZ1bGxZZWFyKCksIDAsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBNYXRoLmNlaWwoKCgodGVtcERhdGUuZ2V0VGltZSgpIC0geWVhclN0YXJ0LmdldFRpbWUoKSkgLyA4NjQwMDAwMCkgKyAxKSAvIDcpO1xyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRjb25zdCB3ZWVrU3RyID0gYFcke2dldElTT1dlZWsobm93KX0tJHtub3cuZ2V0RnVsbFllYXIoKX1gO1xyXG5cdFx0XHRcdFx0XHRmaWxlc1RvQ2hlY2sgPSBmaWxlc1RvQ2hlY2suZmlsdGVyKGYgPT4gZi5iYXNlbmFtZS5pbmNsdWRlcyh3ZWVrU3RyKSk7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3Mubm90ZVR5cGUgPT09ICdtb250aGx5Jykge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBtb250aFN0ciA9IGAke1N0cmluZyhub3cuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyl9LSR7bm93LmdldEZ1bGxZZWFyKCl9YDtcclxuXHRcdFx0XHRcdFx0ZmlsZXNUb0NoZWNrID0gZmlsZXNUb0NoZWNrLmZpbHRlcihmID0+IGYuYmFzZW5hbWUuaW5jbHVkZXMobW9udGhTdHIpKTtcclxuXHRcdFx0XHRcdH0gXHJcblx0XHRcdFx0XHQvLyBub3RlVHlwZSAnY3VzdG9tJyBhbHJlYWR5IGJlaGF2ZXMgbGlrZSAnYWxsJ1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0Ly8gZWxzZSAnYWxsJzoga2VlcCBhbGwgZmlsZXNcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRsZXQgdG90YWxUYXNrcyA9IDA7XHJcblx0XHRcdGxldCBkb25lVGFza3MgPSAwO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBmIG9mIGZpbGVzVG9DaGVjaykge1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGYpO1xyXG5cdFx0XHRcdHRvdGFsVGFza3MgKz0gY29udGVudC5tYXRjaCgvLSBcXFsgXFxdL2cpPy5sZW5ndGggfHwgMDtcclxuXHRcdFx0XHRkb25lVGFza3MgKz0gY29udGVudC5tYXRjaCgvLSBcXFt4XFxdL2dpKT8ubGVuZ3RoIHx8IDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSB0b3RhbFRhc2tzICsgZG9uZVRhc2tzID4gMFxyXG5cdFx0XHRcdD8gTWF0aC5yb3VuZCgoZG9uZVRhc2tzIC8gKHRvdGFsVGFza3MgKyBkb25lVGFza3MpKSAqIDEwMClcclxuXHRcdFx0XHQ6IDA7XHJcblxyXG5cdFx0XHRjb25zdCBwcm9ncmVzc0JhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaWRlYmFyLXByb2dyZXNzLWJhcicpIGFzIEhUTUxEaXZFbGVtZW50O1xyXG5cdFx0XHRjb25zdCBwZXJjZW50TGFiZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2lkZWJhci1wcm9ncmVzcy1iYXItcGVyY2VudCcpO1xyXG5cdFx0XHRpZiAocHJvZ3Jlc3NCYXIpIHtcclxuXHRcdFx0XHRwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IGAke3BlcmNlbnR9JWA7XHJcblx0XHRcdFx0aWYgKHBlcmNlbnQgPD0gOC4zMykgcHJvZ3Jlc3NCYXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNmZjAwMDAnOyAvLyByZWRcclxuICAgIFx0XHRcdGVsc2UgaWYgKHBlcmNlbnQgPD0gMTYuNjYpIHByb2dyZXNzQmFyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjZmYzMzAwJztcclxuICAgIFx0XHRcdGVsc2UgaWYgKHBlcmNlbnQgPD0gMjUpIHByb2dyZXNzQmFyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjZmY2NjAwJztcclxuXHRcdFx0XHRlbHNlIGlmIChwZXJjZW50IDw9IDMzLjMzKSBwcm9ncmVzc0Jhci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnI2ZmOTkwMCc7XHJcblx0XHRcdFx0ZWxzZSBpZiAocGVyY2VudCA8PSA0MS42NikgcHJvZ3Jlc3NCYXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNmZmNjMDAnO1xyXG5cdFx0XHRcdGVsc2UgaWYgKHBlcmNlbnQgPD0gNTApIHByb2dyZXNzQmFyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjZmZmZjAwJzsgLy8geWVsbG93XHJcblx0XHRcdFx0ZWxzZSBpZiAocGVyY2VudCA8PSA1OC4zMykgcHJvZ3Jlc3NCYXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNjMWU3MDNmZic7XHJcblx0XHRcdFx0ZWxzZSBpZiAocGVyY2VudCA8PSA2Ni42NikgcHJvZ3Jlc3NCYXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNhN2U0MDBmZic7XHJcblx0XHRcdFx0ZWxzZSBpZiAocGVyY2VudCA8PSA3NSkgcHJvZ3Jlc3NCYXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyM4NGUxMDNmZic7XHJcblx0XHRcdFx0ZWxzZSBpZiAocGVyY2VudCA8PSA4My4zMykgcHJvZ3Jlc3NCYXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyM1N2NkMDJmZic7XHJcblx0XHRcdFx0ZWxzZSBpZiAocGVyY2VudCA8PSA5MS42NikgcHJvZ3Jlc3NCYXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyMwMGJlMDlmZic7XHJcblx0XHRcdFx0ZWxzZSBwcm9ncmVzc0Jhci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzAxYTgwY2ZmJzsgLy8gZGFyayBncmVlblxyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChwZXJjZW50TGFiZWwpIHBlcmNlbnRMYWJlbC50ZXh0Q29udGVudCA9IGAke3BlcmNlbnR9JWA7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJTaWRlYmFyIFByb2dyZXNzIEJhcjogZmFpbGVkIHRvIHJlYWQgZmlsZXNcIiwgZSk7XHJcblx0XHR9XHJcbn1cclxuXHJcblxyXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBNb2RhbCBFeGFtcGxlXHJcbmNsYXNzIFNpZGViYXJQcm9ncmVzc0Jhck1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHApIHsgc3VwZXIoYXBwKTsgfVxyXG5cclxuICAgIG9uT3BlbigpIHsgdGhpcy5jb250ZW50RWwuc2V0VGV4dCgnU2lkZWJhciBQcm9ncmVzcyBCYXIgTW9kYWwgT3BlbmVkIScpOyB9XHJcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XHJcbn1cclxuXHJcbi8vIFNldHRpbmdzIFRhYlxyXG5jbGFzcyBTaWRlYmFyUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgICBwbHVnaW46IFNpZGViYXJQcm9ncmVzc0JhcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaWRlYmFyUHJvZ3Jlc3NCYXIpIHtcclxuICAgICAgICBzdXBlcihhcHAsIHBsdWdpbik7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB9XHJcblxyXG4gICAgZGlzcGxheSgpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHBsdWdpbiA9IHRoaXMucGx1Z2luO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUoJ1RyYWNrIE5vdGUgLyBGb2xkZXInKVxyXG5cdFx0XHQuc2V0RGVzYygnQ2hvb3NlIHRoZSBub3RlIG9yIGZvbGRlciB0byB0cmFjaycpXHJcblx0XHRcdC5hZGRUZXh0KHRleHQgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoJ1N0YXJ0IHR5cGluZyBub3RlL2ZvbGRlciBuYW1lJylcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlUGF0aClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90ZVBhdGggPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLnN0eWxlLndpZHRoID0gJzEwMCUnOyAgXHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLnN0eWxlLmZvbnRTaXplID0gJzE0cHgnOyBcclxuXHRcdFx0XHR0ZXh0LmlucHV0RWwuc3R5bGUucGFkZGluZyA9ICc2cHggMjhweCA2cHggOHB4JzsgLy8gc3BhY2UgZm9yIGNsZWFyIGJ1dHRvblxyXG5cclxuXHRcdFx0XHQvLyAtLS0tIFdyYXAgaW5wdXQgaW4gcmVsYXRpdmUgY29udGFpbmVyIC0tLS1cclxuXHRcdFx0XHRjb25zdCB3cmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcblx0XHRcdFx0d3JhcHBlci5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XHJcblx0XHRcdFx0d3JhcHBlci5zdHlsZS53aWR0aCA9ICcxMDAlJztcclxuXHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLnBhcmVudEVsZW1lbnQ/LmFwcGVuZENoaWxkKHdyYXBwZXIpO1xyXG5cdFx0XHRcdHdyYXBwZXIuYXBwZW5kQ2hpbGQodGV4dC5pbnB1dEVsKTtcclxuXHJcblx0XHRcdFx0Ly8gLS0tLSBBZGQgY2xlYXIg4p2MIGJ1dHRvbiAtLS0tXHJcblx0XHRcdFx0Y29uc3QgY2xlYXJCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHRcdFx0XHRjbGVhckJ0bi5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcblx0XHRcdFx0Y2xlYXJCdG4uc3R5bGUucmlnaHQgPSAnOHB4JztcclxuXHRcdFx0XHRjbGVhckJ0bi5zdHlsZS50b3AgPSAnNTAlJztcclxuXHRcdFx0XHRjbGVhckJ0bi5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWSgtNTAlKSc7XHJcblx0XHRcdFx0Y2xlYXJCdG4uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xyXG5cdFx0XHRcdGNsZWFyQnRuLnN0eWxlLmZvbnRTaXplID0gJzEycHgnO1xyXG5cdFx0XHRcdGNsZWFyQnRuLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtbXV0ZWQpJztcclxuXHRcdFx0XHRjbGVhckJ0bi5zdHlsZS5iYWNrZ3JvdW5kID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeSknO1xyXG5cdFx0XHRcdGNsZWFyQnRuLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc1MCUnO1xyXG5cdFx0XHRcdGNsZWFyQnRuLnN0eWxlLndpZHRoID0gJzE2cHgnO1xyXG5cdFx0XHRcdGNsZWFyQnRuLnN0eWxlLmhlaWdodCA9ICcxNnB4JztcclxuXHRcdFx0XHRjbGVhckJ0bi5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG5cdFx0XHRcdGNsZWFyQnRuLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuXHRcdFx0XHRjbGVhckJ0bi5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdjZW50ZXInO1xyXG5cclxuXHRcdFx0XHRjbGVhckJ0bi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y2xlYXJCdG4uc3R5bGUuYmFja2dyb3VuZCA9ICd2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWhvdmVyKSc7XHJcblx0XHRcdFx0XHRjbGVhckJ0bi5zdHlsZS5jb2xvciA9ICd2YXIoLS10ZXh0LW5vcm1hbCknO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNsZWFyQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRjbGVhckJ0bi5zdHlsZS5iYWNrZ3JvdW5kID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeSknO1xyXG5cdFx0XHRcdFx0Y2xlYXJCdG4uc3R5bGUuY29sb3IgPSAndmFyKC0tdGV4dC1tdXRlZCknO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb25zdCBjcm9zcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuXHRcdFx0XHRjcm9zcy50ZXh0Q29udGVudCA9ICfinJUnO1xyXG5cdFx0XHRcdGNyb3NzLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMC40cHgsIC0wLjhweCknOyAvLyByZWxhdGl2ZSBhZGp1c3RtZW50XHJcblx0XHRcdFx0Y2xlYXJCdG4uYXBwZW5kQ2hpbGQoY3Jvc3MpO1xyXG5cclxuXHJcblx0XHRcdFx0Y2xlYXJCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKCcnKTtcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLm5vdGVQYXRoID0gJyc7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0d3JhcHBlci5hcHBlbmRDaGlsZChjbGVhckJ0bik7XHJcblxyXG5cdFx0XHRcdC8vIC0tLS0gQ3JlYXRlIGN1c3RvbSBkcm9wZG93biAtLS0tXHJcblx0XHRcdFx0Y29uc3QgZHJvcGRvd24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHRcdFx0XHRkcm9wZG93bi5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcblx0XHRcdFx0ZHJvcGRvd24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtc2Vjb25kYXJ5KSc7XHJcblx0XHRcdFx0ZHJvcGRvd24uc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCB2YXIoLS1pbnRlcmFjdGl2ZS1ib3JkZXIpJztcclxuXHRcdFx0XHRkcm9wZG93bi5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNnB4JztcclxuXHRcdFx0XHRkcm9wZG93bi5zdHlsZS5ib3hTaGFkb3cgPSAnMCAycHggNXB4IHJnYmEoMCwwLDAsMC4yKSc7XHJcblx0XHRcdFx0ZHJvcGRvd24uc3R5bGUubWF4SGVpZ2h0ID0gJzI1MHB4JztcclxuXHRcdFx0XHRkcm9wZG93bi5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XHJcblx0XHRcdFx0ZHJvcGRvd24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRcdFx0XHRkcm9wZG93bi5zdHlsZS56SW5kZXggPSAnOTk5OSc7XHJcblxyXG5cdFx0XHRcdC8vIFBvc2l0aW9uIGRpcmVjdGx5IHVuZGVyIHRoZSBpbnB1dFxyXG5cdFx0XHRcdGRyb3Bkb3duLnN0eWxlLnRvcCA9IGAke3RleHQuaW5wdXRFbC5vZmZzZXRIZWlnaHQgKyAyfXB4YDtcclxuXHRcdFx0XHRkcm9wZG93bi5zdHlsZS5sZWZ0ID0gJzAnO1xyXG5cdFx0XHRcdGRyb3Bkb3duLnN0eWxlLndpZHRoID0gYCR7dGV4dC5pbnB1dEVsLm9mZnNldFdpZHRofXB4YDtcclxuXHJcblx0XHRcdFx0ZHJvcGRvd24uc3R5bGUudGV4dEFsaWduID0gJ2xlZnQnO1xyXG5cdFx0XHRcdGRyb3Bkb3duLnN0eWxlLnBhZGRpbmcgPSAnM3B4IDRweCc7XHJcblxyXG5cdFx0XHRcdHdyYXBwZXIuYXBwZW5kQ2hpbGQoZHJvcGRvd24pO1xyXG5cclxuXHRcdFx0XHQvLyAtLS0tIElucHV0IGxpc3RlbmVyIGZvciBzdWdnZXN0aW9ucyAtLS0tXHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGV2dCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5wdXQgPSAoZXZ0LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHN1Z2dlc3Rpb25zID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEFsbExvYWRlZEZpbGVzKClcclxuXHRcdFx0XHRcdFx0LmZpbHRlcihmID0+IGYgaW5zdGFuY2VvZiBURmlsZSB8fCBmIGluc3RhbmNlb2YgVEZvbGRlcilcclxuXHRcdFx0XHRcdFx0LmZpbHRlcihmID0+IGYucGF0aC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGlucHV0KSlcclxuXHRcdFx0XHRcdFx0Lm1hcChmID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoZiBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gZi5wYXRoOyAgICAgICAvLyBrZWVwIGV4dGVuc2lvblxyXG5cdFx0XHRcdFx0XHRcdGlmIChmIGluc3RhbmNlb2YgVEZvbGRlcikgcmV0dXJuIGYucGF0aCArICcvJzsgLy8gZm9sZGVyIHdpdGggL1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiAnJztcclxuXHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0ZHJvcGRvd24uaW5uZXJIVE1MID0gJyc7XHJcblx0XHRcdFx0XHRpZiAoc3VnZ2VzdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0XHRkcm9wZG93bi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuXHRcdFx0XHRcdFx0c3VnZ2VzdGlvbnMuZm9yRWFjaChzID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBpdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS50ZXh0Q29udGVudCA9IHM7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5zdHlsZS5wYWRkaW5nID0gJzJweCA4cHgnO1xyXG5cdFx0XHRcdFx0XHRcdGl0ZW0uc3R5bGUudGV4dEFsaWduID0gJ2xlZnQnO1xyXG5cdFx0XHRcdFx0XHRcdGl0ZW0uc3R5bGUuYm9yZGVyUmFkaXVzID0gJzNweCc7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5zdHlsZS5taW5IZWlnaHQgPSAnMjBweCc7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5zdHlsZS5mb250U2l6ZSA9ICcxZW0nO1xyXG5cdFx0XHRcdFx0XHRcdGl0ZW0uc3R5bGUubGluZUhlaWdodCA9ICcxLjZlbSc7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGl0ZW0uc3R5bGUuYmFja2dyb3VuZCA9ICd2YXIoLS1pbnRlcmFjdGl2ZS1ob3ZlciknO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGl0ZW0uc3R5bGUuYmFja2dyb3VuZCA9ICd0cmFuc3BhcmVudCc7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUocyk7IC8vIHNldCBmaWxlL2ZvbGRlciBwYXRoXHJcblx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90ZVBhdGggPSB0ZXh0LmdldFZhbHVlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0ZHJvcGRvd24uYXBwZW5kQ2hpbGQoaXRlbSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0ZHJvcGRvd24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gLS0tLSBIaWRlIGRyb3Bkb3duIG9uIGJsdXIgLS0tLVxyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7IGRyb3Bkb3duLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7IH0sIDEwMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ05vdGUgVHlwZScpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdEYWlseSwgV2Vla2x5LCBNb250aGx5LCBvciBDdXN0b20gbm90ZScpXHJcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkcm9wZG93biA9PiBkcm9wZG93blxyXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbignZGFpbHknLCAnRGFpbHknKVxyXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbignd2Vla2x5JywgJ1dlZWtseScpXHJcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdtb250aGx5JywgJ01vbnRobHknKVxyXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbignY3VzdG9tJywgJ0N1c3RvbSBOb3RlJylcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlVHlwZSlcclxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90ZVR5cGUgPSB2YWx1ZSBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSgnVHJhY2tpbmcgTW9kZScpXHJcblx0XHRcdC5zZXREZXNjKCdDaG9vc2Ugd2hpY2ggbm90ZXMgdG8gdHJhY2snKVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4gZHJvcGRvd25cclxuXHRcdFx0XHQuYWRkT3B0aW9uKCdsYXRlc3QnLCAnTGF0ZXN0IG5vdGUgb25seScpXHJcblx0XHRcdFx0LmFkZE9wdGlvbigndG9kYXknLCAnVG9kYXlcXCdzIG5vdGUgb25seScpXHJcblx0XHRcdFx0LmFkZE9wdGlvbignYWxsJywgJ0FsbCBub3RlcyBpbiBmb2xkZXInKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmFja01vZGUgfHwgJ2xhdGVzdCcpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jIHZhbHVlID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRyYWNrTW9kZSA9IHZhbHVlIGFzICdsYXRlc3QnIHwgJ3RvZGF5JyB8ICdhbGwnO1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi51cGRhdGVQcm9ncmVzc0JhcigpO1xyXG5cdFx0XHRcdH0pKTtcclxuXHJcbiAgICB9XHJcbn1cclxuIl19