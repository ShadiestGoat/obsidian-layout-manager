import { App, PluginSettingTab } from 'obsidian'
import type { AnyContainer } from './obsidianLayout'
import { mount, unmount } from 'svelte'
import Settings from './components/settings/Settings.svelte'
import { writable } from 'svelte/store'
import type LayoutManager from './main'

export enum PlatformMode {
    BOTH = 'both',
    COMPUTER = 'computer',
    MOBILE = 'mobile'
}

export interface SavedLayout {
    platformMode: PlatformMode
    container: AnyContainer
    name: string
    patterns: string
}

export type SettingData = SavedLayout[]

export class LayoutMgrSettings extends PluginSettingTab {
    svelteContent: Settings
	plugin: LayoutManager

	constructor(app: App, plugin: LayoutManager) {
		super(app, plugin)

		this.plugin = plugin
	}

    display(): void {
		this.containerEl.addClass("lm-settings")

		const settingProxy = writable(this.plugin.settings)
		settingProxy.subscribe((v) => {
			this.plugin.settings = v
			this.plugin.saveSettings()
		})

        this.svelteContent = mount(Settings, {
            target: this.containerEl,
            props: {
				settings: settingProxy,
				app: this.app,
            }
        })
    }

	hide() {
		unmount(this.svelteContent, { outro: true })
	}
}
