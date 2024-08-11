import { DungeonBuilder } from '@root/dungeon/dungeon-builder'
import { AreaDrawer } from '@root/area/area-drawer'
import { overrideMapAreaContainer } from '@root/area/custom-MapAreaContainer'
import { poststartGameStart, prestartGameStart, startDnggenGame } from '@root/game-start'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'
import { Mod1 } from 'cc-blitzkrieg/src/types'
import { godlikeStats } from './util/misc'
import './util/modify-prototypes'

declare global {
    const dnggen: DngGen
    interface Window {
        dnggen: DngGen
    }
}

function addVimBindings() {
    if (window.vim) {
        /* optional dependency https://github.com/krypciak/cc-vim */
        const isInGenMap = (ingame: boolean) => ingame && ig.game.mapName.startsWith('dnggen')
        vim.addAlias(
            'dnggen',
            'generate-dungeon',
            'Generate dungeon',
            'global',
            (seed = '', roomTp: string = '0') => {
                vim.executeString('title-screen')
                dnggen.debug.roomTp = parseInt(roomTp)
                dnggen.debug.seed = seed
                startDnggenGame()
            },
            [
                {
                    type: 'string',
                    description: 'seed',
                },
                {
                    type: 'number',
                    description: 'room to teleport to',
                },
            ]
        )
        vim.addAlias('dnggen', 'skip-battle', 'Skips the battle', isInGenMap, () => {
            ig.vars.set('map.battle1done', true)
        })
    }
}

interface DngGenDebug {
    pastePuzzle: boolean
    decorateBattleRoom: boolean
    trimAreas: boolean
    collisionlessMapArrange: boolean
    dontDiscoverAllMaps: boolean
    areaMapConnections: boolean
    dontFlushCacheOnGen: boolean
    /* used only in debug functions */
    roomTp: number
    seed: string
}

export default class DngGen {
    dir: string
    mod: Mod1
    dungeonBuilder!: DungeonBuilder
    areaDrawer!: AreaDrawer

    godStats = godlikeStats

    debug: DngGenDebug = {
        /* if all all true everything should be as intended */
        pastePuzzle: true,
        decorateBattleRoom: false,
        trimAreas: true,
        collisionlessMapArrange: true,
        dontDiscoverAllMaps: false,
        areaMapConnections: true,
        dontFlushCacheOnGen: false,
        roomTp: 0,
        seed: '',
    }

    constructor(mod: Mod1) {
        this.dir = mod.baseDirectory
        this.mod = mod
        window.dnggen = this
        this.mod.isCCL3 = mod.findAllAssets ? true : false
        this.mod.isCCModPacked = mod.baseDirectory.endsWith('.ccmod/')
    }

    async prestart() {
        if (!blitzkrieg) {
            return
        }

        this.dungeonBuilder = new DungeonBuilder()

        DungeonPaths.registerAutoLoadDungeon()
        addVimBindings()
        prestartGameStart()

        this.areaDrawer = new AreaDrawer()
    }

    async poststart() {
        overrideMapAreaContainer()
        poststartGameStart()

        // startDnggenGame()
    }
}
