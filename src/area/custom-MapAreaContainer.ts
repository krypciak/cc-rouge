import { assert } from '../util/misc'

const tilesize = 8
type GuiHookMapRoomList = ig.GuiHook & { gui: { floor: sc.AreaLoadable.Floor, room: sc.AreaRoomBounds, unlocked: boolean } }

export function overrideMapAreaContainer() {
    sc.MapAreaContainer.inject({
        findMap(mx: number, my: number, gamepad: boolean, wait: number): boolean | undefined {
            if (sc.menu.mapMapFocus) { return }
            const area = sc.map.getCurrentArea()
            if (area && area.type == 'roomList') {
                let pos: Vec2 = Vec2.createC(0, 0)
                if (gamepad) {
                    pos = this.area.hook.pos
                } else {
                    pos = Vec2.createC(
                        mx - sc.menu.mapCamera.x - this.area.hook.pos.x + 1,
                        my - sc.menu.mapCamera.y - this.area.hook.pos.y + 1
                    )
                }
                if (this.area.hook.children.length == 0) { return }

                const mapGuis: GuiHookMapRoomList[] = this.area.hook.children[sc.map.getCurrentFloorIndex()].children as GuiHookMapRoomList[]
                for (const hook of mapGuis) {
                    if (! hook.gui.room || ! hook.gui.unlocked) { continue }

                    if (gamepad) {
                        this.mapNameGui.setPos(
                            sc.menu.mapCursor.x + 5,
                            sc.menu.mapCursor.y - this.mapNameGui.hook.size.y - 4,
                        )
                    } else {
                        this.mapNameGui.setPos(
                            mx - sc.menu.mapCamera.x,
                            my - sc.menu.mapCamera.y - this.mapNameGui.hook.size.y - 1,
                        )
                    }
                    const map: sc.AreaLoadable.MapRoomList = hook.gui.floor.maps[hook.gui.room.index!] as sc.AreaLoadable.MapRoomList
                    for (const r of map.rects) {
                        if (! r.arearect) {
                            r.arearect = {
                                x: (r.x + map.min.x) * tilesize,
                                y: (r.y + map.min.y) * tilesize,
                                width: r.width * tilesize,
                                height: r.height * tilesize,
                            }
                        }
                        const rect = r.arearect
                        if (
                            pos.x >= rect.x &&
                            pos.x <= rect.x + rect.width &&
                            pos.y >= rect.y &&
                            pos.y <= rect.y + rect.height
                        ) {
                            if (this.hoverRoom != hook.gui.room) {
                                this.hoverRoom = hook.gui.room
                                this.mapNameGui.setText(hook.gui.room.text, wait)
                            }
                            return true
                        }
                    }
                }

                this.hoverRoom = null
                this.mapNameGui.setText("")
                return false
            } else {
                this.parent(mx, my, gamepad, wait)
            }
            return true
        }
    })

    sc.MapFloor.inject({
        init(floor: sc.AreaLoadable.Floor, callback: any) {
            this.type = floor.type = floor.type ?? 'grid'
            if (floor.type == 'roomList') {
                if (floor.tiles.length == 0) {
                    floor.tiles = [[]]
                }
                let i = 0
                for (const room of floor.rooms!) {
                    room.index = i
                    i++
                }
            }
            this.parent(floor, callback)
            if (floor.type == 'roomList') {
                assert(floor.size)
                this.setSize(floor.size.x * tilesize, floor.size.y * tilesize)
            }
        }
    })

    sc.AreaLoadable.inject({
        _createRooms() {
            if (this.data!.type == 'roomList') {
                for (const floor of this.data!.floors) {
                    const bounds: sc.AreaRoomBounds[] = []
                    if (floor.type != 'roomList') { throw new Error('all area maps of type "roomList" must also have that type') }
                    for (const map of (floor.maps as sc.AreaLoadable.MapRoomList[])) {
                        bounds.push(new sc.AreaRoomBounds(map, map.id, map.min.x, map.min.y, [], map.max))
                    }
                    floor.rooms = bounds 
                }
            } else {
                return this.parent()
            }
        }
    })

    sc.AreaRoomBounds.inject({
        init(map: sc.AreaLoadable.Map, id: number, minX: number, minY: number, tiles: number[][], max?: Vec2) {
            if (max) {
                this.name = map.path || 'default_empty'
                this.text = map.name ? ig.LangLabel.getText(map.name) || '???' : '???'
                this.id = id
                this.offset.x = map.offset ? map.offset.x : 0
                this.offset.y = map.offset ? map.offset.y : 0
                this.min.x = minX
                this.min.y = minY
                this.max = max
                // these values dont do anything i think
                this.zMin = map.minZ!
                this.zMax = map.maxZ!
            } else {
                this.parent(map, id, minX, minY, tiles)
            }
        }
    })

    sc.MapRoom.inject({
        init(room, floor, id) {
            this.parent(room, floor, id)
        },
        preRender() {
            if (this.floor.type == 'roomList') {
                if (! this.prerendered && this.unlocked) {
                    const map = this.floor.maps[this.room.index!] as sc.AreaLoadable.MapRoomList
                    assert(map.rects)

                    const emptyTile = new ig.SimpleColor('#5e717f')
                    // const freeRule = { src: { x: 281, y: 411 }, }
                    this.buffer = ig.imageAtlas.getFragment(
                        this.hook.size.x,
                        this.hook.size.y,
                        () => {
                            for (const rect1 of map.rects) {
                                const rect = { x: rect1.x * tilesize, y: rect1.y * tilesize,
                                    width: rect1.width * tilesize, height: rect1.height * tilesize }
                                emptyTile.draw(rect.x, rect.y, rect.width, rect.height)
                            }
                        })
                    this.prerendered = true
                }
            } else {
                this.parent()
            }
        }
    })
}
