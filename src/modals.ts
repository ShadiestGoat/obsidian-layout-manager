import type { App} from 'obsidian'
import { Modal } from 'obsidian'
import { mount, unmount } from 'svelte'
import type { PlatformMode } from './settings'
import NewLayout from './components/NewLayout.svelte'

export type NewLayoutCallback = (name: string, paths: string, platformMode: PlatformMode) => void

export class NewLayoutModal extends Modal {
    svelteContent: Record<string, never>
    callback: NewLayoutCallback

    constructor(app: App, cb: NewLayoutCallback) {
        super(app)

        this.callback = cb
    }

    onOpen(): void {
        this.setTitle('New Layout...')
        this.shouldRestoreSelection = true

        this.svelteContent = mount(NewLayout, {
            target: this.contentEl,
            props: {
                onSubmit: (a, b, c) => {
					this.callback(a, b, c)
					this.close()
				}
            }
        })
    }

    async onClose() {
        unmount(this.svelteContent, { outro: true })
    }
}
