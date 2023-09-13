import { AreaPoint, AreaRect, Dir, MapPoint, MapRect, PosDir, Rect, doRectsOverlap, doesRectArrayOverlapRectArray } from '@util/pos'
import { loadArea } from '@util/map'
import { Stack, allLangs, assert, assertBool } from '@util/misc'
import DngGen from '@root/plugin'
import { Room, } from '@room/room'
import { MapBuilder } from '@room/map-builder'
import { DungeonPaths } from '@dungeon/dungeon-paths'
import { AreaViewFloorTypes } from '@area/custom-MapAreaContainer'

declare const dnggen: DngGen

export class AreaInfo {
    name: string
    constructor(
        public paths: DungeonPaths,
        public displayName: string,
        public displayDesc: string,
        public type: 'PATH' | 'TOWN' | 'DUNGEON',
        public pos: Vec2) {
        this.name = paths.nameAndId
    }
}

export interface ABStackEntry {
    builder?: MapBuilder
    exit: AreaPoint
    exitDir: Dir
    level: number
    rects: AreaRect[]
    rooms: Room[]
}

export class AreaBuilder {
    static roomToAreaRect(room: Room, offset: AreaPoint, overlapRect?: AreaRect): AreaRect {
        const rect: MapRect = room
        if (! overlapRect) {
            return new AreaRect(
                rect.x / AreaRect.div + offset.x,
                rect.y / AreaRect.div + offset.y,
                rect.width / AreaRect.div,
                rect.height / AreaRect.div)
        } else {
            // assert(room.door)
            const mul = 4
            const newRect: AreaRect = new MapRect(
                rect.x,
                rect.y,
                Math.ceil(rect.width/mul)*mul,
                Math.ceil(rect.height/mul)*mul,
            ).to(AreaRect)
            Vec2.add(newRect, offset)

            for (let i = 0; i < 3; i++) {
                if (doRectsOverlap(newRect, overlapRect)) {
                    // Point.moveInDirection(newRect, room.door.dir)
                } else {
                    return newRect
                }
            }
            throw new Error('what')
        }
    }

    static tryGetAreaRects(builder: MapBuilder, lastExit: AreaPoint, stackEntries: ABStackEntry[]):
        { exit: AreaPoint, rects: AreaRect[], rooms: Room[] } | undefined {

        assert(builder.entarenceRoom);
        assert(builder.exitRoom); assert(builder.exitRoom.primaryExit)
        
        let entPosDir: PosDir<MapPoint> | null = builder.entarenceOnWall
        const exitPosDir: PosDir<MapPoint> | null = builder.exitOnWall

        if (entPosDir == null) {
            entPosDir = { dir: Dir.SOUTH, pos: new MapPoint(0, 0) }
        }
        if (exitPosDir == null) {
            throw new Error('dead end not supported')
        }

        const exit: AreaPoint = exitPosDir.pos.to(AreaPoint)
        const ent: AreaPoint = entPosDir.pos.to(AreaPoint)

        const offset: AreaPoint = new AreaPoint(lastExit.x - ent.x, lastExit.y - ent.y)
        
        exit.x += offset.x
        exit.y += offset.y

        const rects: AreaRect[] = []
        
        builder.rooms.forEach(r => {
            rects.push(AreaBuilder.roomToAreaRect(r, offset))
        })

        if (dnggen.debug.collisionlessMapArrange) {
            for (let i = stackEntries.length - 1; i >= 0; i--) {
                const e = stackEntries[i]
                if (doesRectArrayOverlapRectArray(e.rects, rects)) {
                    return
                }
            }
        }
        
        return {
            rects,
            exit,
            rooms: builder.rooms,
        }
    }

    static async openAreaViewerGui(areaName: string, map: string, floor: number = 0) {
        sc.map.currentArea = sc.map.currentPlayerArea = await loadArea(areaName)
        sc.map.currentPlayerFloor = floor
        sc.map.currentMap = map
        sc.menu.setDirectMode(true, sc.MENU_SUBMENU.MAP)
        sc.model.enterMenu(true)
        sc.model.prevSubState = sc.GAME_MODEL_SUBSTATE.RUNNING
    }

    dbEntry?: sc.MapModel.Area
    builtArea?: sc.AreaLoadable.Data

    static trimBuilderStack(arr: ABStackEntry[], additionalSpace: number = 2): { offset: AreaPoint; size: AreaPoint } {
        const obj = Rect.getMinMaxPosFromRectArr(arr.flatMap(e => e.rects))
        const minPos: AreaPoint = obj.min as AreaPoint
        const maxPos: AreaPoint = obj.max as AreaPoint

        Vec2.subC(minPos, additionalSpace)
        const newSize: AreaPoint = maxPos.copy()
        Vec2.sub(newSize, minPos)
        Vec2.addC(newSize, additionalSpace)

        for (const entry of arr) {
            for (const rect of entry.rects) {
                Vec2.sub(rect, minPos)
            }
            Vec2.sub(entry.exit, minPos)
        }
        return { offset: minPos, size: newSize }
    }

    constructor(
        public areaInfo: AreaInfo, 
        public stack: Stack<ABStackEntry>,
        public size: AreaPoint,
    ) {
        this.size = new AreaPoint(Math.ceil(size.x), Math.ceil(size.y))
    }

    async build() {
        const chestCount = 0

        const builtArea: sc.AreaLoadable.Data = {
            DOCTYPE: 'AREAS_MAP',
            name: allLangs(this.areaInfo.name),
            width: this.size.x,
            height: this.size.y,
            chests: chestCount,
            defaultFloor: 0,
            floors: [
                await this.generateFloor(0, 'G', this.size, this.stack.array),
            ],
            type: AreaViewFloorTypes.RoomList,
        }
        this.builtArea = builtArea
    }

    async generateFloor(level: number, name: string, size: AreaPoint, entries: ABStackEntry[]): Promise<sc.AreaLoadable.FloorCustom> {
        entries = entries.filter(e => e.level == level)
        const connections: sc.AreaLoadable.ConnectionRoomList[] = []
        const mapConnectionSize = 3
        const landmarks: sc.AreaLoadable.Landmark[] = []
        // const stamps: Stamp[] = []

        const maps: sc.AreaLoadable.MapRoomList[] = []
        const mapType: 'DUNGEON' | 'NO_DUNGEON' = this.areaInfo.type == 'DUNGEON' ? 'DUNGEON' : 'NO_DUNGEON'


        /*
        function addMapConnection(pos: AreaPoint, dir: Dir, map1: number, map2: number) {
                const connection: sc.AreaLoadable.ConnectionRoomList = {
                    tx: pos.x,
                    ty: pos.y,
                    dir,
                    size: mapConnectionSize,
                    map1,
                    map2,
                }
                connections.push(connection)
        }
        */

        let mapIndex = 0
        function addMap(builder: MapBuilder, rects: AreaRect[], rooms: Room[]) {
            const path = builder.path!
            const displayName = builder.displayName!
            assertBool(rects.length == rooms.length)

            const obj = rects.map((r, i) => [r, rooms[i]] as [AreaRect, Room])
                .sort((a, b) => a[1].placeOrder - b[1].placeOrder)

            rects = obj.map(e => e[0])
            rooms = obj.map(e => e[1])

            const { min, max } = Rect.getMinMaxPosFromRectArr(rects)
            const trimmedRecs: sc.AreaLoadable.MapRoomListRect[] = rects.map(
                (r, i) => ({
                    x: (Math.floor((r.x - min.x) * 8)/8),
                    y: Math.floor((r.y - min.y) * 8)/8,
                    width: Math.floor(r.width * 8)/8,
                    height: Math.floor(r.height * 8)/8,
                    roomType: rooms[i].type,
                    placeOrder: rooms[i].placeOrder,
                    /* if the room has no walls make it have all walls (so it renders properly) */
                    wallSides: rooms[i].wallSides.every(v => !v) ? [true, true, true, true] : rooms[i].wallSides,
                })
            )
            maps.push({
                path: path.split('/').join('.'),
                name: allLangs(displayName),
                dungeon: mapType,
                offset: { x: 0, y: 0 },
                rects: trimmedRecs,
                id: mapIndex + 1,
                min: min,
                max: max,
            })

            /*
            if (dnggen.debug.areaMapConnections) {
                const entTpr = builder.entarenceRoom.primaryEntarence.getTpr()
                if (DirUtil.dir3dIsDir(entTpr.dir)) {
                    const dir = entTpr.dir as unknown as Dir
                    const pos = entTpr.pos.to(AreaPoint)

                    const parentRoom =
                        builder.entarenceRoom.primaryEntarence instanceof RoomIOTunnelClosed ?
                            builder.entarenceRoom.primaryEntarence.tunnel : builder.entarenceRoom
                    const areaRect = rects[rooms.indexOf(parentRoom)]
                    pos.x += Math.floor(min.x*8)/8
                    pos.y += Math.floor(min.y*8)/8
                    areaRect.setPosToSide(pos, dir)
                    // const posCopy = pos.copy()
                    // parentRoom.to(AreaRect).setPosToSide(posCopy, dir)
                    // if (pos.x != posCopy.x || pos.y != posCopy.y) {
                    //     debugger
                    // }
                    // pos = posCopy
                    // assertBool(posCopy == pos)
                    // const rect: AreaRect = rects[rooms.indexOf(parentRoom)]
                    switch (dir) {
                        case Dir.NORTH: pos.y -= 2/8; break
                        case Dir.EAST: pos.x -= 2/8; break
                        case Dir.SOUTH: pos.y -= 2/8; break
                        case Dir.WEST: pos.x -= 2/8; break
                    }
                    addMapConnection(pos, dir, mapIndex + 1, mapIndex, areaRect)
                }
            }
            */
        }
        
        for (const entry of entries) {
            const builder = entry.builder!
            builder.pathParent = this.areaInfo.name
            builder.path = builder.pathParent + '/' + (mapIndex.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false}))
            await builder.decideDisplayName(mapIndex)
            assert(builder.displayName)
            addMap(builder, entry.rects, entry.rooms)
            mapIndex++
        }

        return {
            level,
            name: allLangs(name),
            icons: [],
            tiles: [],
            type: AreaViewFloorTypes.RoomList,
            size,
            maps,
            connections,
            landmarks,
        }
    }

    createDbEntry() {
        this.dbEntry = {
            path: '',
            boosterItem: '1000000',
            landmarks: {},
            name: allLangs(this.areaInfo.displayName),
            description: allLangs(this.areaInfo.displayDesc),
            areaType: this.areaInfo.type,
            order: 1001,
            track: true,
            chests: 0,
            position: this.areaInfo.pos,
        }
    }

    addToDb() {
        if (! this.dbEntry) {
            this.createDbEntry()
            assert(this.dbEntry)
        }
        
        ig.database.data.areas[this.areaInfo.name] = this.dbEntry
    }

    saveToFile() {
        this.areaInfo.paths.saveArea(this)
    }
    
    /*
    addStamps(mapBuilder: DungeonMapBuilder, offset: EntityPoint, exitPoint: AreaPoint) {
        const area: string = mapBuilder.areaInfo.name
        const puzzle = mapBuilder.puzzle
        const battle = mapBuilder.battle

        assert(puzzle.room.room);        assert(puzzle.room.room.door); assert(battle.tunnel.room)
        assert(battle.tunnel.room.door); assert(puzzle.start);          assert(puzzle.end)

        const level = 0
        function applyOffset(pos: Vec2): Vec2 {
            return { x: Math.floor(pos.x + offset.x), y: Math.floor(pos.y + offset.y) }
        }

        // puzzle exit door
        this.stamps.push(Stamp.new(area, applyOffset(puzzle.room.room.door.pos), level, puzzle.room.room.door.dir))
        // battle entrance door
        this.stamps.push(Stamp.new(area, applyOffset(battle.tunnel.room.door.pos), level, DirUtil.flip(battle.tunnel.room.door.dir)))
        
        // puzzle start
        this.stamps.push(Stamp.new(area, applyOffset(puzzle.start.pos), level, 'GREEN'))

        // puzzle end
        this.stamps.push(Stamp.new(area, applyOffset(puzzle.end.pos), level, 'ENEMY'))


        const lastExitPos: EntityPoint = exitPoint.copy().to(EntityPoint)
        this.stamps.push(Stamp.new(area, lastExitPos, level, 'XXX'))
    }
    */
}
