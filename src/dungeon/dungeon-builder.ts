import { AreaPoint } from 'cc-map-util/pos'
import { AreaBuilder, AreaInfo } from '@root/area/area-builder'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'
import { DungeonArranger, DungeonGenerateConfig } from '@root/dungeon/dungeon-arrange'
import { MapBuilder } from '@root/room/map-builder'
import { ArmRuntime, ArmRuntimeEntry, flatOutArmTopDown } from '@root/dungeon/dungeon-arm'
import { DungeonConfigMainFactory } from '@root/dungeon/configs/main'
import { DungeonConfigSimpleFactory } from '@root/dungeon/configs/simple'
import { Item } from '@root/room/item-handler'
import { randomSeedInt } from '@root/util/misc'

export interface DungeonConfigFactory {
    get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig>
}

export class DungeonBuilder {
    async build(
        id: string,
        seed: string,
        configFactory: DungeonConfigFactory = new DungeonConfigSimpleFactory()
        // configFactory: DungeonConfigFactory = new DungeonConfigMainFactory()
    ) {
        if (seed === '') {
            Math.seedrandomSeed(Math.random().toString())
            seed = randomSeedInt(0, 99999999).toString()
        }
        const dngPaths = new DungeonPaths(id)
        dngPaths.registerSelections()
        dngPaths.clearDir()

        const boosterItem: number = 100000
        const areaInfo: AreaInfo = new AreaInfo(
            dngPaths,
            'Generated Dungeon',
            'generic description, ' + dngPaths.nameAndId,
            'DUNGEON',
            Vec2.createC(150, 70),
            Item.FajroKey,
            Item.FajroKeyMaster,
            boosterItem
        )

        const dngGenConfig: DungeonGenerateConfig = await configFactory.get(areaInfo, seed)
        console.log('dngGenConfig:', dngGenConfig)

        const arranger: DungeonArranger = new DungeonArranger(dngGenConfig)
        let dngConfig = await arranger.arrangeDungeon()
        console.log(dngConfig)
        if (!dngConfig.arm) {
            console.log('build failed')
            await this.build(id, seed + randomSeedInt(0, 9).toString())
            return
        }

        const obj1 = AreaBuilder.trimArm(dngConfig.arm)
        const size: AreaPoint = obj1.size

        const areaBuilder: AreaBuilder = new AreaBuilder(areaInfo, dngConfig.arm, size)
        await areaBuilder.build()
        console.log(areaBuilder.builtArea)
        areaBuilder.createDbEntry()
        areaBuilder.saveToFile()

        // dnggen.areaDrawer.drawArea(dngConfig, size)
        // dnggen.areaDrawer.copyToClipboard()

        const flatEntries: { entry: ArmRuntimeEntry; arm: ArmRuntime }[] = flatOutArmTopDown(dngConfig.arm)

        await MapBuilder.placeBuilders(flatEntries)

        dngPaths.saveConfig()
        dngPaths.registerFiles()

        await blitzkrieg.sels.puzzle.save()
        await blitzkrieg.sels.battle.save()

        if (!dnggen.debug.dontFlushCacheOnGen) {
            if (sc.AreaLoadable.cache) {
                const entry = sc.AreaLoadable.cache[areaInfo.name]
                if (entry) {
                    entry.debugReload = true
                    entry.reload()
                    entry.debugReload = false
                }
            }
        }
        ig.game.varsChangedDeferred()

        const firstBuilder = flatEntries[dnggen.debug.roomTp].entry.builder
        ig.game.teleport(
            firstBuilder.path!,
            ig.TeleportPosition.createFromJson({
                marker: firstBuilder.entarenceRoom.primaryEntarence.getTpr().name,
                level: 0,
                baseZPos: 0,
                size: { x: 0, y: 0 },
            })
        )
        console.log('------------------------')
        console.log('SEED: ' + seed)
        console.log('------------------------')
        // AreaBuilder.openAreaViewerGui(areaInfo.name, flatEntries[0].builder.name!, 0)
    }
}
