//META{"name":"RepoUtils"}*//

// !!! Hey there! If you didn't come here from the BetterDiscord Discord server ( https://discord.gg/2HScm8j )  !!! //
// !!! then please do not use whatever you were using that led you here, getting plugins from places other than !!! //
// !!! the #plugin repo channel in the BD server can be dangerous, as they can be malicious and do bad things.  !!! //

class RepoUtils {
    getName() {
        return "Repo Utils";
    }
    getDescription() {
        return "Adds options to download/install/preview next to betterdiscord.net ghdl links.";
    }
    getVersion() {
        return "0.1.0";
    }
    getAuthor() {
        return "Qwerasd";
    }
    load() {
        this.infos = BdApi.loadData('RepoUtils', 'infos') || {};
        this.settings = BdApi.loadData('RepoUtils', 'settings') || {
            afterInstall: 'enable',
            previewType: 'inApp'
        };
        const path = require('path');
        const process = require('process');
        const platform = process.platform;
        this.dataPath = (platform === "win32" ? process.env.APPDATA : platform === "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.config") + "/BetterDiscord/";
        this.themeLoc = path.join(this.dataPath, 'themes');
        this.pluginLoc = path.join(this.dataPath, 'plugins');
        this.css = `
                .repoUtilsButtonGroup {
                    display: inline-block;
                    background-color: rgba(0,0,0,0.5);
                    color: white;
                    max-height: 2ex;
                    max-width: 2ex;
                    min-height: 2ex;
                    min-width: 2ex;
                    border-radius: 1.5ex;
                    line-height: calc(1ex - 2px);
                    text-align: center;
                    vertical-align: middle;
                    position: relative;
                    top: -0.1ch;
                    margin-left: 0.5ex;
                    cursor: pointer;
                    user-select: none;
                    transition: max-width 0.5s ease-in-out, max-height 0.2s linear, top 0.2s linear;
                    overflow: hidden;
                    white-space: nowrap;
                    text-indent: 0;
                    --button-opacity: 0.5;
                    --button-color: 0,0,0;
                    box-shadow: 0 1px 2px black;
                }

                .repoUtilsButtonGroup.open {
                    max-width: 500px; max-height: 500px;
                    top: -0.2ch;
                    padding: 2px;
                    box-shadow: 0 2px 5px black;
                }

                .repoUtilsButton {
                    display: inline-block;
                    font-size: 80%;
                    color: white;
                    background-color: rgba(var(--button-color),var(--button-opacity));
                    padding: 0.2ch 1ex;
                    border-radius: 2em;
                    margin: 0 0.25ex;
                    font-weight: 500;
                }

                .repoUtilsButton:hover {
                    --button-opacity: 0.8;
                }

                .repoUtilsButton:active {
                    --button-opacity: 0.35;
                }

                .repoUtilsButton:last-child {
                    margin-right: 0;
                }

                .repoUtilsButton.install {
                    --button-color: 20,200,20;
                }

                .repoUtilsButton.preview {
                    --button-color: 50,150,250;
                }

                .repoUtilsButton.download {
                    --button-color: 200,150,50;
                }

                .repoUtilsButton.close {
                    font-weight: bold;
                    margin-left: 0;
                }

                .repoUtilsHeader {
                    line-height: 2ch;
                    margin-bottom: 4px;
                    background: rgba(0,0,0,0.5);
                    outline: 2px solid rgba(0,0,0,0.5);
                    font-weight: 500;
                    height: 2ch;
                }
            `;
    }
    start() {
        BdApi.injectCSS('repoUtils', this.css);
        this.processLinks();
        $(document.body).on('click.repoUtils', _ => { this.collapseAllButtonGroups(this.collapseButtonGroup); });
        this.rnm = BdApi.getPlugin('Restart No More') ? true : false;
    }
    stop() {
        BdApi.clearCSS('repoUtils');
        Array.from(document.getElementsByClassName('repoUtilsButtonGroup')).forEach(b => {
            b.parentElement.removeChild(b);
        });
        Array.from(document.getElementsByClassName('repoUtils')).forEach(e => {
            e.classList.remove('repoUtils');
        });
        $(document.body).off('click.repoUtils');
        BdApi.saveData('RepoUtils', 'infos', this.infos);
        BdApi.saveData('RepoUtils', 'settings', this.settings);
    }
    /**
     * Generate button element
     */
    button(text, handler, extraClass) {
        let button = document.createElement('button');
        button.classList.add('repoUtilsButton');
        button.innerText = text;
        button.classList.add(extraClass);
        if (handler)
            button.addEventListener('click', e => {
                handler(e);
                e.stopPropagation();
            });
        return button;
    }
    /**
     * Get type and name of file at URL
     */
    getFileInfo(url) {
        return new Promise((resolve, reject) => {
            if (this.infos[url])
                return resolve(this.infos[url]);
            const req = require('request');
            req.head(url, (err, response, _) => {
                if (err)
                    return reject(err);
                try {
                    const result = {
                        name: response.headers['content-disposition'].split('filename=')[1].split(';')[0],
                        type: response.headers['content-type'].split(';')[0]
                    };
                    this.infos[url] = result;
                    resolve(result);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    /**
     * Download file from URL to destination in filesystem
     */
    downloadFile(url, destination, getMeta) {
        return new Promise((resolve, reject) => {
            const req = require('request');
            const fs = require('fs');
            const file = fs.createWriteStream(destination);
            req.get(url)
                .on('response', function (response) {
                response.pipe(file);
                file.on('finish', function () {
                    file.close();
                    const read = fs.createReadStream(destination);
                    let meta = '';
                    read.on('data', chunk => {
                        const index = chunk.indexOf('\n');
                        meta += chunk;
                        if (index !== -1)
                            read.close();
                    })
                        .on('close', _ => {
                        resolve(JSON.parse(meta.split('//META')[1].split('*//')[0]));
                    })
                        .on('error', err => {
                        reject(err);
                    });
                });
            }).on('error', function (err) {
                fs.unlink(destination, _ => { });
                reject(err);
            });
        });
    }
    /**
     * Install plugin or theme from URL
     */
    async install(url) {
        const path = require('path');
        const fs = require('fs');
        let info;
        try {
            info = await this.getFileInfo(url);
        }
        catch (e) {
            BdApi.showToast(`Error getting info for install!`, { type: 'error' });
            throw e;
        }
        const isTheme = info.type === 'text/css';
        const filename = info.name;
        const installPath = path.join(isTheme ? this.themeLoc : this.pluginLoc, filename);
        const backupPath = path.join(isTheme ? this.themeLoc : this.pluginLoc, 'backups');
        if (fs.existsSync(installPath)) {
            if (!fs.existsSync(backupPath))
                fs.mkdirSync(backupPath);
            let backupName = filename;
            while (fs.existsSync(path.join(backupPath, backupName)))
                backupName += '_';
            fs.renameSync(installPath, path.join(backupPath, filename));
        }
        this.downloadFile(url, installPath, true)
            .then(meta => {
            let name;
            if (isTheme) {
                name = meta.name;
            }
            this.collapseAllButtonGroups(this.collapseButtonGroup);
            BdApi.showToast(`${name} Installed Successfully!`, { type: 'success' });
            if (this.rnm) {
                switch (this.settings.afterInstall) {
                    case 'enable':
                        setTimeout(_ => {
                            if (isTheme) {
                                themeModule.enableTheme(name);
                                BdApi.showToast(`${name} enabled.`, { type: 'success' });
                            }
                            else {
                                BdApi.showToast(`Plugins can not be auto-enabled.`, { type: 'warn' });
                            }
                        }, 250);
                        break;
                    case 'reveal':
                        //@ts-ignore
                        document.querySelector('button[aria-label="User Settings"]').click();
                        requestAnimationFrame(_ => {
                            //@ts-ignore
                            document.querySelector(`.ui-tab-bar-item:nth-last-child(${isTheme ? 1 : 2})`).click();
                            if (isTheme) {
                                requestAnimationFrame(_ => {
                                    document.querySelector(`li[data-name="${name}"]`).scrollIntoView({
                                        behavior: 'auto',
                                        block: 'center',
                                        inline: 'center'
                                    });
                                });
                            }
                        });
                        break;
                    case 'nothing':
                        BdApi.showToast(`${name} is now available in settings.`, { type: 'info' });
                        break;
                }
            }
            else {
                BdApi.showToast(`Reload your Discord to see ${name} in settings.`, { type: 'info' });
            }
        })
            .catch(err => {
            BdApi.showToast(`There was an error installing the ${isTheme ? 'theme' : 'plugin'}!`, { type: 'error' });
            throw err;
        });
    }
    /**
     * Open 0x71.cc Discord Preview with URL
     */
    openPreview(url) {
        let a = document.createElement('a');
        a.target = '_blank';
        a.href = `https://0x71.cc/bd/theme/preview?file=${url}`;
        a.click();
    }
    /**
     * Start in-app preview
     */
    startPreview(url) {
        const link = document.createElement('link');
        link.href = url;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.id = 'repoUtilsPreviewSheet';
        link.addEventListener('load', _ => {
            requestAnimationFrame(_ => {
                const openGroup = document.querySelector('.repoUtilsButtonGroup.open');
                openGroup.scrollIntoView();
            });
        });
        document.head.appendChild(link);
        const previouslyEnabled = [];
        Object.keys(bdthemes).forEach(theme => {
            if (themeCookie[theme]) {
                previouslyEnabled.push(theme);
                themeModule.disableTheme(theme);
            }
        });
        BdApi.showToast('Theme preview started.', { type: 'success' });
        BdApi.showToast('Press shift to toggle theme.', { type: 'info', timeout: 5e3 });
        BdApi.showToast('Press CTRL to end preview.', { type: 'info', timeout: 5e3 });
        const endPreview = document.createElement('button');
        document.body.style.setProperty('--button-color', '50,150,250');
        document.body.style.setProperty('--button-opacity', '0.5');
        function cleanupPreview() {
            document.head.removeChild(link);
            $(document.body).off('keydown.repoUtilsPreview');
            document.body.style.removeProperty('--button-color');
            document.body.style.removeProperty('--button-opacity');
            document.body.removeChild(endPreview);
            previouslyEnabled.forEach(themeModule.enableTheme.bind(themeModule));
            BdApi.showToast('Theme preview ended.', { type: 'success' });
        }
        $(document.body).on('keydown.repoUtilsPreview', e => {
            switch (e.which) {
                case 16: //SHIFT
                    BdApi.showToast(`Theme toggled | ${(link.disabled = !link.disabled) ? 'Off' : 'On'}.`, { type: 'info', timeout: 5e3 });
                    break;
                case 17: //CTRL
                    cleanupPreview();
                    break;
            }
        });
        endPreview.addEventListener('click', cleanupPreview);
        endPreview.classList.add('repoUtilsButton');
        endPreview.textContent = 'End Preview';
        endPreview.style.position = 'absolute';
        endPreview.style.bottom = '20px';
        endPreview.style.right = '20px';
        endPreview.style.fontSize = '200%';
        endPreview.style.color = 'white';
        endPreview.id = 'repoUtilsEndPreview';
        document.body.appendChild(endPreview);
    }
    /**
     * Collapse all button groups
     */
    collapseAllButtonGroups(collapseFunction) {
        Array.from(document.querySelectorAll('.repoUtilsButtonGroup.open')).forEach(collapseFunction);
    }
    /**
     * Collapse button group
     */
    collapseButtonGroup(group) {
        group.classList.remove('open');
        while (group.firstChild) {
            group.removeChild(group.lastChild);
        }
        group.innerText = '...';
    }
    /**
     * Expand button group
     */
    async expandButtonGroup(group, a) {
        const open = document.querySelector('.repoUtilsButtonGroup.open');
        if (open)
            this.collapseButtonGroup(open);
        const download = this.button('Download', _ => {
            a.click();
        }, 'download');
        const install = this.button('Install', _ => {
            this.install(a.href);
        }, 'install');
        const previewFunction = this.settings.previewType === 'inApp' ? this.startPreview : this.openPreview;
        const preview = this.button('Preview', _ => {
            previewFunction(a.href);
        }, 'preview');
        const close = this.button('X  ', _ => {
            this.collapseButtonGroup(group);
        }, 'close');
        let header = document.createElement('div');
        header.classList.add('repoUtilsHeader');
        preview.style.display = 'none';
        this.getFileInfo(a.href)
            .then(info => {
            const isTheme = info.type === 'text/css';
            const name = info.name;
            header.innerText = name;
            if (isTheme)
                preview.style.display = '';
        })
            .catch(e => {
            this.collapseButtonGroup(group);
            BdApi.showToast(`There was an error getting info!`, { type: 'error' });
            throw e;
        });
        group.classList.add('open');
        group.innerText = '';
        group.appendChild(header);
        group.appendChild(close);
        group.appendChild(install);
        group.appendChild(preview);
        group.appendChild(download);
    }
    /**
     * Add button group to <a>
     */
    addButtonGroup(a) {
        a.classList.add('repoUtils');
        let buttonGroup = document.createElement('span');
        buttonGroup.classList.add('repoUtilsButtonGroup');
        buttonGroup.innerText = '...';
        buttonGroup.addEventListener('click', (function (e) {
            this.expandButtonGroup(buttonGroup, a);
            e.stopPropagation();
        }).bind(this));
        a.insertAdjacentElement('afterend', buttonGroup);
    }
    /**
     * Add button groups to all the <a>s
     */
    processLinks() {
        Array.from(document.getElementsByTagName('a'))
            .filter(a => {
            if (a.classList.contains('repoUtils'))
                return false;
            if (a.hostname === 'betterdiscord.net' && a.pathname === '/ghdl') {
                return true;
            }
            else {
                a.classList.add('repoUtils');
            }
        })
            .forEach((function (a) {
            this.addButtonGroup(a);
        }).bind(this));
    }
    observer() {
        this.processLinks();
    }
    getSettingsPanel() {
        function group(header) {
            const g = document.createElement('div');
            const h = document.createElement('h3');
            h.innerText = header;
            g.appendChild(h);
            return g;
        }
        function radioOption(name, value, id) {
            const o = document.createElement('input');
            o.type = 'radio';
            o.name = name;
            o.value = value;
            o.id = id;
            return o;
        }
        function label(forId, text) {
            const l = document.createElement('label');
            l.htmlFor = forId;
            l.innerText = text;
            return l;
        }
        function addOpt(group, opt, label) {
            group.appendChild(opt);
            group.appendChild(label);
            group.appendChild(document.createElement('br'));
        }
        const form = document.createElement('form');
        const group1 = group('Action after install:');
        const g1opt1 = radioOption('afterInstall', 'enable', 'afterInstallEnable');
        const g1label1 = label('afterInstallEnable', 'Enable theme / plugin.');
        const g1opt2 = radioOption('afterInstall', 'reveal', 'afterInstallReveal');
        const g1label2 = label('afterInstallReveal', 'Reveal theme / plugin in settings.');
        const g1opt3 = radioOption('afterInstall', 'nothing', 'afterInstallDoNothing');
        const g1label3 = label('afterInstallDoNothing', 'Do nothing.');
        switch (this.settings.afterInstall) {
            case 'enable':
                g1opt1.checked = true;
                break;
            case 'reveal':
                g1opt2.checked = true;
                break;
            case 'nothing':
                g1opt3.checked = true;
                break;
        }
        addOpt(group1, g1opt1, g1label1);
        addOpt(group1, g1opt2, g1label2);
        addOpt(group1, g1opt3, g1label3);
        const group2 = group('Preview type:');
        const g2opt1 = radioOption('previewType', 'inApp', 'previewTypeInApp');
        const g2label1 = label('previewTypeInApp', 'In app (Load CSS directly in to the window).');
        const g2opt2 = radioOption('previewType', 'inBrowser', 'previewTypeInBrowser');
        const g2label2 = label('previewTypeInBrowser', 'In browser (Using the 0x71.cc theme previewer).');
        switch (this.settings.previewType) {
            case 'inApp':
                g2opt1.checked = true;
                break;
            case 'inBrowser':
                g2opt2.checked = true;
                break;
        }
        addOpt(group2, g2opt1, g2label1);
        addOpt(group2, g2opt2, g2label2);
        form.appendChild(group1);
        form.appendChild(group2);
        form.addEventListener('click', _ => { this.updateSettings(form); });
        return form;
    }
    updateSettings(form) {
        this.settings = {
            afterInstall: form.afterInstall.value,
            previewType: form.previewType.value
        };
    }
}
