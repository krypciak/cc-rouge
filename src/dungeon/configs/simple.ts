import { Dir, DirUtil } from 'cc-map-util/pos'
import { AreaInfo } from '@root/area/area-builder'
import { DungeonGenerateConfig } from '@root/dungeon/dungeon-arrange'
import { SimpleMultipleExitMapBuilder, SimpleSingleTunnelEndMapBuilder } from '@root/room/simple-map-builder'
import { ArmEnd, ArmItemType, MapBuilderArrayGenerate } from '@root/dungeon/dungeon-arm'
import { DungeonConfigFactory } from '@root/dungeon/dungeon-builder'

export class DungeonConfigSimpleFactory implements DungeonConfigFactory {
    private areaInfo!: AreaInfo
    private seed!: string
    private bPool!: MapBuilderArrayGenerate[]

    async get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig> {
        this.areaInfo = areaInfo
        this.seed = seed
        this.bPool = []

        const dngGenConfig: DungeonGenerateConfig = this.armsimple() // this.armverycomplex()
        return dngGenConfig
    }

    getSbBuilders(multi: number, exclusive: boolean = true): MapBuilderArrayGenerate {
        const _sb: MapBuilderArrayGenerate = { arr: [], randomize: true, index: this.bPool.length }
        DirUtil.forEachUniqueDir2((d1, d2) => {
            const b = Object.assign(new SimpleSingleTunnelEndMapBuilder(this.areaInfo, d1, d2), { exclusive })
            for (let i = 0; i < multi; i++) {
                _sb.arr.push(b)
            }
        })
        this.bPool.push(_sb)
        return _sb
    }

    getDbBuilders(exitCount: number, multi: number, exclusive: boolean = true): MapBuilderArrayGenerate {
        if (exitCount < 1 || exitCount > 3) {
            throw new Error('invalid exit count')
        }
        const _db: MapBuilderArrayGenerate = { arr: [], randomize: true, index: this.bPool.length }

        ;(exitCount == 1
            ? DirUtil.forEachUniqueDir2
            : exitCount == 2
              ? DirUtil.forEachUniqueDir3
              : exitCount == 3
                ? DirUtil.forEachUniqueDir4
                : () => {
                      throw new Error()
                  })((...arr: Dir[]) => {
            const b = Object.assign(new SimpleMultipleExitMapBuilder(this.areaInfo, arr[0], arr[1], arr[2], arr[3]), {
                exclusive,
            })
            for (let i = 0; i < multi; i++) {
                _db.arr.push(b)
            }
        })
        this.bPool.push(_db)
        return _db
    }

    noarm(): DungeonGenerateConfig {
        const _sb = this.getSbBuilders(2)
        return {
            seed: this.seed,
            areaInfo: this.areaInfo,
            arm: {
                bPool: this.bPool,
                length: 10,
                builderPool: _sb.index,
                endBuilderPool: _sb.index,
                end: ArmEnd.Item,
                itemType: ArmItemType.Tresure,
            },
        }
    }

    armsimple(): DungeonGenerateConfig {
        const _sb = this.getSbBuilders(3)
        const _db = this.getDbBuilders(2, 1)
        return {
            seed: this.seed,
            areaInfo: this.areaInfo,
            arm: {
                bPool: this.bPool,
                length: 3,
                builderPool: _sb.index,
                endBuilderPool: _db.index,
                end: ArmEnd.Arm,
                arms: [
                    {
                        length: 10,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.Tresure,
                    },
                    {
                        length: 10,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.Tresure,
                    },
                ],
            },
        }
    }

    problematic(): DungeonGenerateConfig {
        /* fixed :) */
        const _sb1: MapBuilderArrayGenerate = {
            arr: [
                Object.assign(
                    Object.assign(new SimpleSingleTunnelEndMapBuilder(this.areaInfo, Dir.SOUTH, Dir.NORTH), {
                        exclusive: true,
                    })
                ),
                Object.assign(
                    Object.assign(new SimpleSingleTunnelEndMapBuilder(this.areaInfo, Dir.SOUTH, Dir.WEST), {
                        exclusive: true,
                    })
                ),
                Object.assign(
                    Object.assign(new SimpleSingleTunnelEndMapBuilder(this.areaInfo, Dir.EAST, Dir.SOUTH), {
                        exclusive: true,
                    })
                ),
            ],
            randomize: false,
            index: this.bPool.length,
        }
        this.bPool.push(_sb1)

        const _sb2: MapBuilderArrayGenerate = {
            arr: [
                Object.assign(
                    Object.assign(new SimpleSingleTunnelEndMapBuilder(this.areaInfo, Dir.WEST, Dir.NORTH), {
                        exclusive: true,
                    })
                ),
                Object.assign(
                    Object.assign(new SimpleSingleTunnelEndMapBuilder(this.areaInfo, Dir.SOUTH, Dir.NORTH), {
                        exclusive: true,
                    })
                ),
            ],
            randomize: false,
            index: this.bPool.length,
        }
        this.bPool.push(_sb2)

        const _sb3: MapBuilderArrayGenerate = {
            arr: [
                Object.assign(
                    Object.assign(new SimpleSingleTunnelEndMapBuilder(this.areaInfo, Dir.EAST, Dir.NORTH), {
                        exclusive: true,
                    })
                ),
            ],
            randomize: false,
            index: this.bPool.length,
        }
        this.bPool.push(_sb3)

        const _db1: MapBuilderArrayGenerate = {
            arr: [
                Object.assign(new SimpleMultipleExitMapBuilder(this.areaInfo, Dir.SOUTH, Dir.NORTH, Dir.EAST), {
                    exclusive: true,
                }),
            ],
            randomize: false,
            index: this.bPool.length,
        }
        this.bPool.push(_db1)

        const _db2: MapBuilderArrayGenerate = {
            arr: [
                Object.assign(new SimpleMultipleExitMapBuilder(this.areaInfo, Dir.SOUTH, Dir.WEST), {
                    exclusive: true,
                }),
            ],
            randomize: false,
            index: this.bPool.length,
        }
        this.bPool.push(_db2)

        return {
            seed: this.seed,
            areaInfo: this.areaInfo,
            arm: {
                bPool: this.bPool,
                length: 0,
                builderPool: NaN,
                endBuilderPool: _db1.index,
                end: ArmEnd.Arm,
                arms: [
                    {
                        length: 1,
                        builderPool: _sb1.index,
                        endBuilderPool: _sb1.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    },
                    {
                        length: 2,
                        builderPool: _sb2.index,
                        endBuilderPool: _db2.index,
                        end: ArmEnd.Arm,
                        arms: [
                            {
                                length: 0,
                                builderPool: NaN,
                                endBuilderPool: _sb3.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                        ],
                    },
                ],
            },
        }
    }

    armcomplex(): DungeonGenerateConfig {
        const _sb = this.getSbBuilders(3)
        const _db = this.getDbBuilders(3, 1)
        return {
            seed: this.seed,
            areaInfo: this.areaInfo,
            arm: {
                bPool: this.bPool,
                length: 1,
                builderPool: _sb.index,
                endBuilderPool: _db.index,
                end: ArmEnd.Arm,
                arms: [
                    {
                        length: 2,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    },
                    {
                        length: 3,
                        builderPool: _sb.index,
                        endBuilderPool: _db.index,
                        end: ArmEnd.Arm,
                        arms: [
                            {
                                length: 0,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 0,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 0,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                        ],
                    },
                    {
                        length: 0,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    },
                ],
            },
        }
    }

    armverycomplex(): DungeonGenerateConfig {
        const _sb = this.getSbBuilders(15)
        const _db = this.getDbBuilders(3, 2)
        return {
            seed: this.seed,
            areaInfo: this.areaInfo,
            arm: {
                bPool: this.bPool,
                length: 3,
                builderPool: _sb.index,
                endBuilderPool: _db.index,
                end: ArmEnd.Arm,
                arms: [
                    {
                        length: 3,
                        builderPool: _sb.index,
                        endBuilderPool: _db.index,
                        end: ArmEnd.Arm,
                        arms: [
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                        ],
                    },
                    {
                        length: 3,
                        builderPool: _sb.index,
                        endBuilderPool: _db.index,
                        end: ArmEnd.Arm,
                        arms: [
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                        ],
                    },
                    {
                        length: 3,
                        builderPool: _sb.index,
                        endBuilderPool: _db.index,
                        end: ArmEnd.Arm,
                        arms: [
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                            {
                                length: 3,
                                builderPool: _sb.index,
                                endBuilderPool: _sb.index,
                                end: ArmEnd.Item,
                                itemType: ArmItemType.DungeonKey,
                            },
                        ],
                    },
                ],
            },
        }
    }
}
