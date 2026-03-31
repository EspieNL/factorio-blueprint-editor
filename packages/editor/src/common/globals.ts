import { Application, Texture, Assets, Renderer } from 'pixi.js'
import { Blueprint } from '../core/Blueprint'
import { UIContainer } from '../UI/UIContainer'
import { BlueprintContainer } from '../containers/BlueprintContainer'
import { ActionRegistry } from '../actions'

const debug = false

export interface ILogMessage {
    text: string
    type: 'success' | 'info' | 'warning' | 'error'
}

export type Logger = (msg: ILogMessage) => void

const logger: Logger = msg => {
    switch (msg.type) {
        case 'error':
            console.error(msg.text)
            break
        case 'warning':
            console.warn(msg.text)
            break
        case 'info':
            console.info(msg.text)
            break
        case 'success':
            console.log(msg.text)
            break
    }
}

let app: Application<Renderer<HTMLCanvasElement>>
let BPC: BlueprintContainer
let UI: UIContainer
let bp: Blueprint
let actions: ActionRegistry

const started = new Map<string, Promise<Texture>>()
const textureCache = new Map<string, Texture>()
const missingTextures = new Set<string>()

let count = 0
let T: number

function getMissingTexture(): Texture {
    return Texture.WHITE
}

function isMissingTexture(path: string): boolean {
    return missingTextures.has(path)
}

function getBT(path: string): Promise<Texture> {
    if (count === 0) {
        T = performance.now()
    }
    count += 1

    const done = () => {
        count -= 1
        if (count <= 0) {
            console.log('done', performance.now() - T)
        }
    }

    // Pre-check with HEAD to avoid sending 404 URLs to the Basis worker,
    // which throws unhandled rejections that never propagate back to Assets.load
    return fetch(path, { method: 'HEAD' }).then(
        response => {
            if (!response.ok) {
                done()
                missingTextures.add(path)
                return getMissingTexture()
            }
            return Assets.load(path).then(
                bt => {
                    done()
                    return bt
                },
                err => {
                    done()
                    missingTextures.add(path)
                    console.warn(`Failed to load texture ${path}; using placeholder texture instead.`, err)
                    return getMissingTexture()
                }
            )
        },
        () => {
            done()
            missingTextures.add(path)
            return getMissingTexture()
        }
    )
}

function getTexture(path: string, x = 0, y = 0, w = 0, h = 0): Texture {
    const key = `/data/${path.replace('.png', '.basis')}`
    const KK = `${key}-${x}-${y}-${w}-${h}`
    let t = textureCache.get(KK)
    if (t) return t
    t = new Texture({ source: Texture.EMPTY.source, dynamic: true })
    t.noFrame = false
    textureCache.set(KK, t)
    let prom = started.get(key)
    if (!prom) {
        prom = getBT(key)
        started.set(key, prom)
    }
    prom.then(
        bt => {
            // If the texture is the missing placeholder (Texture.WHITE), use it as-is
            // without trying to carve a sub-frame that exceeds its dimensions
            if (bt === Texture.WHITE || bt.source === Texture.WHITE.source) {
                t.source = bt.source
                t.frame.x = 0
                t.frame.y = 0
                t.frame.width = w || 1
                t.frame.height = h || 1
                t.update()
                t.dynamic = false
                return
            }
            t.source = bt.source
            t.frame.x = x
            t.frame.y = y
            t.frame.width = w || bt.width
            t.frame.height = h || bt.height
            t.update()
            t.dynamic = false
        },
        err => console.error(err)
    )
    return t
}

export default {
    debug,
    BPC,
    UI,
    app,
    bp,
    actions,
    getTexture,
    isMissingTexture,
    logger,
}
