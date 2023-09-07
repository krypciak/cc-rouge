import { AreaBuilder } from './area/area-builder'
import DngGen from './plugin'
import { MapBuilder } from './room/map-builder'
import { FsUtil } from './util/fsutil'
import { assert } from './util/misc'

declare const dnggen: DngGen

interface DungeonConfig {
    paths: Record<string, string>
}

export class DungeonPaths {
    static baseName: string = 'dnggen'
    static registeredIds: Set<string> = new Set()

    /* example: getIdFromName('dnggen-0') -> '0' */
    static getIdFromName(name: string): string {
        return name.substring(DungeonPaths.baseName.length + 1)
    }

    static loadIfNeeded(mapName: string): string | undefined {
        if (mapName.startsWith(DungeonPaths.baseName)) {
            mapName = mapName.replace(/\//g, '.')
            const id: string = DungeonPaths.getIdFromName(mapName.substring(0, mapName.indexOf('.')))
            if (! DungeonPaths.registeredIds.has(id)) {
                const paths = new DungeonPaths(id)
                if (paths.loadConfig()) {
                    paths.registerFiles()
                } else {
                    return 'dnggen/limbo' /* set the loading map path to a fallback map */
                }
            }
        }
        return
    }

    baseDir: string
    nameAndId: string

    config: DungeonConfig
    configFile: string

    mapsDirGame: string = 'data/maps'
    mapsDir: string

    areaDirGame: string = 'data/areas'
    areaFileGame: string
    areaDir: string
    areaFile: string

    constructor(public id: string) {
        const name = dnggen.mod.isCCL3 ? dnggen.mod.id : dnggen.mod.name
        this.baseDir = `assets/mod-data/${name}/saves/${id}`
        this.nameAndId = `${DungeonPaths.baseName}-${id}`

        this.configFile = `${this.baseDir}/config.json`

        this.mapsDir = `${this.baseDir}/assets/${this.mapsDirGame}`

        this.areaFileGame = `${this.areaDirGame}/${this.nameAndId}.json`
        this.areaDir = `${this.baseDir}/assets/${this.areaDirGame}`
        this.areaFile = `${this.areaDir}/${this.nameAndId}.json`

        this.config = {
            paths: {}
        }
    }

    saveMap(builder: MapBuilder): Promise<void> {
        assert(builder.rpv)
        console.log('map: ', ig.copy(builder.rpv.map))
        FsUtil.mkdirs(`${this.mapsDir}/${builder.pathParent}`)
        const path = `${this.mapsDir}/${builder.path}.json`
        const gamePath = `${this.mapsDirGame}/${builder.path}.json`

        this.config.paths[gamePath] = path
        return FsUtil.writeFile(path, builder.rpv.map)
    }

    saveArea(builder: AreaBuilder) {
        assert(builder.builtArea, 'called saveToFile() before finalizing build') 
    
        FsUtil.mkdirs(this.areaDir)
        const path = this.areaFile
        this.config.paths[this.areaFileGame] = path
        FsUtil.writeFileSync(path, builder.builtArea)
    }

    saveConfig() {
        FsUtil.writeFileSync(this.configFile, this.config)
    }

    loadConfig(): boolean {
        if (! FsUtil.doesFileExist(this.configFile)) { return false }
        this.config = JSON.parse(FsUtil.readFileSync(this.configFile))

        return true
    }

    registerFiles() {
        if (dnggen.mod.isCCL3) {
            Object.entries(this.config.paths).forEach(e => {
                ccmod.resources.assetOverridesTable.set(e[0], e[1])
            })
        } else {
            dnggen.mod.runtimeAssets = this.config.paths
        }
        DungeonPaths.registeredIds.add(this.id)
    }
}
