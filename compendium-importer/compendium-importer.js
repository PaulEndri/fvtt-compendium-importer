/**
 * Compendium Importer
 * @author Juan Sedano <Paul Endri>
 * @version 0.0.5
 */

class CompendiumImporter {
    constructor() {
        // Register hooks
        this.hookRenderCompendium();
        this.hookRenderDialog();
    }

    hookRenderDialog() {
        Hooks.on('renderDialog', (dialog, $dialog) => {
            if (dialog.data.title !== 'Create New Compendium') {
                return;
            }

            const $button = $(`
                <button class="import-compendium-button">
                    <i class="fas fa-upload"></i>
                    Import Compendium
                </button>
            `);

            $dialog
                .find('.window-content .dialog-buttons')
                .append($button);

            $button
                .on('click', (e) => {
                    e.preventDefault();

                    const $container = $("<div class='compendium-importer-container'></div>");
                    const $input = $(`<input type="file" accept="application/json" class="import-compendium" />`);

                    $container.html($input);

                    $dialog
                        .find('.window-content')
                        .append($container);

                    $input
                        .change((e) => {
                            $container.html("Importing, please wait");

                            try {
                                if (e.target.files.length > 0) {
                                    const file = e.target.files[0];
    
                                    const reader = new FileReader();
    
                                    reader.onload = async (e) => {
                                        const result = await this.importFile(JSON.parse(e.target.result));

                                        $container.append(result);
                                        game.initializeUI();
                                    }
    
                                    reader.readAsText(file);
                                }
                            } catch (e) {
                                console.error(e);
                                $container.html($input);
                                $container.append(`<div class="compendium-importer-error">Error: ${e.message}</div>`);
                            }
                        });
                });
        })
    }

    hookRenderCompendium() {
        Hooks.on('renderCompendium', async (compendium, $compendium) => {
            $compendium
                .find('header.window-header')
                .find('a.close')
                .replaceWith(`
                    <a class='exportCompendium'>
                        <i class='fas fa-download'></i>
                        Export
                    </a>
                    <a class='close'>
                        <i class='fas fa-times'></i>
                        Close
                    </a>
                `);
              
            const $newThing = $compendium.find('a.exportCompendium');

            $newThing[0].addEventListener('click', async () => {
                const file = await this.createFile(compendium);

                this.downloadFile(compendium.metadata, file);
            })
           
        })
    }

    /**
     * 
     * @param {{metadata: Compendium.metadata, db: {}}} json
     * @returns {Promise<String>}
     */
    async importFile(json) {
        const entity_map = {
            Actor,
            Item,
            Scene
        };

        if (!json.metadata) {
            throw "Invalid data imported";
        }

        json.metadata.name = `${json.metadata.name} ${new Date().getTime()}`

        return new Promise((resolve) => {
            game.socket.emit('compendiumCreate', json.metadata, async (metadata) => {
                const entityClass = entity_map[metadata.entity];
                const importedCompendium = new Compendium(metadata);

                json.db.forEach((entity) => {
                    importedCompendium.importEntity(new entityClass(entity));
                });

                game.packs.push(importedCompendium);

                resolve(`<div class='compendium-importer-success'>Successfully imported ${metadata.name}</div>`)
            });
        })

    }
    /**
     * Create an archive from a compendium
     *
     * @param {Compendium} compendium
     * @returns {Blob} importable json file
     */
    async createFile(compendium) {
        const index = await compendium.getIndex();
        const entities = await Promise.all(index.map(({id}) => compendium.getEntity(id)));
        const contents = {
            metadata: compendium.metadata,
            db: entities.map(({data}) => data)
        };

        const content = JSON.stringify(contents);
        return new Blob([content], { type: 'application/json' });
    }

    /**
     * @param {Compendium.metadata} metadata 
     * @param {Blob} file 
     */
    downloadFile(metadata, file) {
        const element = document.createElement('a');
        element.setAttribute('href', window.URL.createObjectURL(file));
        element.setAttribute('download', `${metadata.system}.${metadata.name}.json`);
    
        element.dispatchEvent(
            new MouseEvent("click", { bubbles: !0, cancelable: !0, view: window })
        )
        
        setTimeout(() => window.URL.revokeObjectURL(element.href), 5000);
    }
};

let compendiumImporter = new CompendiumImporter();