import { NextQueueEntryGenerator, QueueEntry } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    TprArrange3d,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { DirU, Rect, Dir } from '../util/geometry'
import { shuffleArray } from '../util/util'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {
            SimpleBranch: SimpleBranch
        }
        export interface SimpleBranch {
            roomSize: Vec2
            tunnelSize: Vec2
            branches:
                | [MapPicker.ConfigNode]
                | [MapPicker.ConfigNode, MapPicker.ConfigNode]
                | [MapPicker.ConfigNode, MapPicker.ConfigNode, MapPicker.ConfigNode]
            randomizeDirTryOrder?: boolean
        }
    }
}
registerMapPickerNodeConfig('SimpleBranch', (data, buildtimeData) => {
    return simpleMapBranchTunnelArrange({ ...data, ...buildtimeData, branchCount: data.branches.length })
})
export function simpleMapBranchTunnelArrange({
    mapPicker,
    exitTpr,
    roomSize,
    tunnelSize,
    branchCount,
    randomizeDirTryOrder,
    nodeId,
}: {
    mapPicker: MapPicker
    exitTpr: TprArrange
    roomSize: Vec2
    tunnelSize: Vec2
    branchCount: 1 | 2 | 3
    randomizeDirTryOrder?: boolean
    nodeId?: number
}): NextQueueEntryGenerator<MapArrangeData> {
    return (id, _, accesor) => {
        const tpr: TprArrange = {
            dir: DirU.flip(exitTpr.dir),
            x: exitTpr.x,
            y: exitTpr.y,
            destId: id - 1,
        }
        const map: MapArrange = { type: 'Simple', rects: [], restTprs: [], id, entranceTprs: [tpr], nodeId }

        let tunnelEntrance: RoomArrange
        {
            const rect = Rect.centeredRect(tunnelSize, tpr)
            tunnelEntrance = { ...rect }
            map.rects.push(tunnelEntrance)
        }
        let room: RoomArrange
        {
            const rect = Rect.centeredRect(roomSize, {
                ...Rect.middle(Rect.side(tunnelEntrance, exitTpr.dir)),
                dir: tpr.dir,
            })
            room = { ...rect }
            map.rects.push(room)
        }

        if (!doesMapArrangeFit(accesor, map, id)) return null

        const dirR1 = DirU.rotate(tpr.dir, 1)
        const dirR2 = DirU.rotate(tpr.dir, 2)
        const dirR3 = DirU.rotate(tpr.dir, 3)
        // prettier-ignore
        let exitChoices: Dir[][] =
            branchCount == 1 ? ([...DirU.allExpect[tpr.dir].map(a => [a])])
          : branchCount == 2 ? ([[dirR1, dirR2], [dirR1, dirR3], [dirR2, dirR3]])
          : branchCount == 3 ? ([[dirR1, dirR2, dirR3]])
          : (undefined as never)

        if (randomizeDirTryOrder) {
            exitChoices = shuffleArray(exitChoices.map(shuffleArray))
        }

        const nextQueueEntryGenerator: NextQueueEntryGenerator<MapArrangeData> = (_, branch, accesor) => {
            const dirs = exitChoices[branch]
            const createNextBranch = (prevId: number): QueueEntry<MapArrangeData> | null => {
                const mapOld = accesor.get(id)
                const map = { rects: [] as Rect[], restTprs: [] as TprArrange3d[] }

                const currentBranch = mapOld.restTprs!.length
                if (currentBranch == dirs.length) {
                    return {
                        data: { branchDone: true },
                        id,
                        finishedEntry: true,
                        newId: prevId,

                        branch: 0,
                        branchCount: 1,
                        getNextQueueEntryGenerator: () => mapPicker(id, accesor, prevId, currentBranch),
                    }
                }
                const dir = dirs[currentBranch]

                let tunnelExit: RoomArrange
                {
                    const rect = Rect.centeredRect(tunnelSize, {
                        ...Rect.middle(Rect.side(room, dir)),
                        dir: DirU.flip(dir),
                    })
                    tunnelExit = { ...rect }
                    map.rects.push(tunnelExit)
                }
                if (!doesMapArrangeFit(accesor, map, id)) return null

                const newId = id == prevId ? prevId + 1 : prevId
                {
                    const exitTpr: TprArrange = {
                        ...Rect.middle(Rect.side(tunnelExit, dir)),
                        dir,
                        destId: newId,
                    }
                    map.restTprs.push(exitTpr)
                }
                return {
                    data: map,
                    id,
                    finishedEntry: dirs.length - 1 == currentBranch,
                    newId,

                    branch: 0,
                    branchCount: 1,
                    getNextQueueEntryGenerator: () => mapPicker(id, accesor, newId, currentBranch),
                }
            }

            return {
                data: { createNextBranch },
                id,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: createNextBranch,
            }
        }

        return {
            data: map,
            id,
            branch: 0,
            branchCount: exitChoices.length,

            nextQueueEntryGenerator,
        }
    }
}
