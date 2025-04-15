import { getFrontMatterInfo, Notice, Plugin } from 'obsidian'
import type { AnyContainer, LayoutData } from './obsidianLayout'
import type { SavedLayout, Settings } from './settings'
import { NewLayoutModal } from './modals'
import { minimatch } from 'minimatch'

export default class LayoutManager extends Plugin {
    settings: Settings
    switching = false

    async onload(): Promise<void> {
		await this.loadSettings()

        this.addCommand({
            id: 'save-layout',
            name: 'Save Layout',
            callback: () => {
				const cont = this.getCurrentLayout()
				if (!cont) {
					return
				}

                new NewLayoutModal(this.app, (name, paths, platMode) => {
					this.settings.push({
						container: cont,
						name,
						patterns: paths.split('\n').filter(v => !!v),
						platformMode: platMode
					})
					this.saveSettings()
				}).open()
            }
        })

        this.registerEvent(
            this.app.workspace.on('file-open', (f) => {
                if (!f || this.switching || !this.settings) return

				const matched = this.findLayoutForPath(f.path)
				if (!matched) {
					return
				}

				this.loadLayout(matched.container, f.path)
            })
        )
    }

	findLayoutForPath(p: string): SavedLayout | null {
		for (const opt of this.settings) {
			for (const pattern of opt.patterns) {
				if (minimatch(p, pattern)) {
					return opt
				}
			}
		}

		return null
	}

	async saveSettings() {
		return this.saveData(this.settings)
	}

	async loadSettings() {
		const d = (await this.loadData()) ?? []

		this.settings = Array.isArray(d) ? d : []
	}

    getCurrentLayout(): AnyContainer | null {
        const fileSet = new Set<string>()
        const layoutData = this.app.workspace.getLayout() as LayoutData

        const layout = savableLayout(layoutData.main, fileSet, layoutData.active)
        if (fileSet.size > 1) {
            new Notice("Can't save: multiple files found in layout")
            return null
        }

        return layout
    }

    async loadLayout(layout: AnyContainer, path: string) {
        this.switching = true

        const curLayout = this.app.workspace.getLayout() as LayoutData

        let activeId = curLayout.active
        const main = targetedLayout(layout, path, (id) => (activeId = id))

        this.app.workspace.changeLayout({
            ...curLayout,
            main: main,
            active: activeId
        })

        window.setTimeout(() => {
            this.switching = false
        }, 300)
    }
}

function targetedLayout(l: AnyContainer, f: string, setActive: (id: string) => void): AnyContainer {
    if (l.active) {
        delete l.active
        l.id = randomId(16)
        setActive(l.id)
    }

    if (l.type != 'leaf') {
        l.children?.forEach((c) => targetedLayout(c, f, setActive))
        return l
    }
    if (l.state.type == 'markdown') {
        l.state.state.file = f
    }

    return l
}

/**
 * Makes savable data out of the raw one
 * l becomes dirty after this, do not use it again.
 */
function savableLayout(l: AnyContainer, fileSet: Set<string>, activeID: string): AnyContainer {
    // This is basically js referance abuse, which is always fun & reliable & easy to debug :3

    if (l.id == activeID) {
        l.active = true
    }

    delete l.id

    if (l.type == 'leaf') {
        if (l.state.type == 'markdown') {
            fileSet.add(l.state.state.file)

            // @ts-expect-error Title causes issues
            delete l.state.title

            // Avoid saving extra metadata
            l.state.state = {
                file: '',
                mode: l.state.state.mode,
                source: l.state.state.source
            }
        }
    } else {
        l.children?.forEach((c) => savableLayout(c, fileSet, activeID))
    }

    return l
}

const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function randomId(l: number) {
    return Array.from(
        { length: l },
        () => possible[Math.floor(Math.random() * possible.length)]
    ).join('')
}
