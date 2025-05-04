import type { App } from 'obsidian'
import { Modal, Notice } from 'obsidian'
import { mount, unmount, type Component } from 'svelte'
import type { PlatformMode, SavedLayout, SettingData } from './settings'
import NewLayout from './components/modals/NewLayout.svelte'
import PickLayout from './components/modals/PickLayout.svelte'
import Confirmation from './components/modals/Confirmation.svelte'

abstract class genericSvelteModal<
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	F extends Function,
	C extends Component,
	P extends Record<string, unknown> = C extends Component<infer Props> ? Props : never
> extends Modal {
	svelteContent: Record<string, never>
	callback: F

	cbFuncName = 'onSubmit'
	props: Partial<P> = {}

	private inputProps: Partial<P> = {}
	abstract title: string
	abstract component: C

	constructor(app: App, cb: F, props: Partial<P> = {}) {
		super(app)

		this.callback = cb
		this.inputProps = props
	}

	onOpen(): void {
		this.setTitle(this.title)
		this.shouldRestoreSelection = true

		this.svelteContent = mount(this.component, {
			target: this.contentEl,
			props: {
				...this.props,
				...this.inputProps,
				[this.cbFuncName]: (...args: unknown[]) => {
					this.callback(...args)
					this.close()
				}
			}
		})
	}

	async onClose() {
		unmount(this.svelteContent, { outro: true })
	}
}

export type NewLayoutCallback = (name: string, paths: string, platformMode: PlatformMode) => void

export class NewLayoutModal extends genericSvelteModal<NewLayoutCallback, typeof NewLayout> {
	title = 'New layout'
	component = NewLayout
}

export type PickLayoutCallback = (name: string) => void

abstract class PickLayoutModal extends genericSvelteModal<PickLayoutCallback, typeof PickLayout> {
	component = PickLayout

	constructor(app: App, settings: SettingData, cb: (l: SavedLayout) => void) {
		super(app, (name) => {
			const i = settings.findIndex((s) => s.name == name)
			if (i == -1) {
				new Notice("Can't find this layout")
				return
			}
			cb(settings[i])
		}, {
			options: settings.map(o => o.name)
		})
		console.log("Post props", this.props)
	}
}

export class LoadLayoutModal extends PickLayoutModal {
	title = 'Pick layout'
	props = {
		submitText: 'Load'
	}
}

export class OverrideLayoutModal extends PickLayoutModal {
	title = 'Override layout'
	props = {
		submitText: 'Save'
	}
}

export type ConfirmationModalCallback = (confirmed: boolean) => void

export class ConfirmModal extends genericSvelteModal<
	ConfirmationModalCallback,
	typeof Confirmation
> {
	title = 'Are you sure?'
	component = Confirmation
}
