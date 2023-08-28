import { Dir, DirUtil, EntityPoint, EntityRect, MapPoint, MapRect } from '../util/pos'
import { Room, RoomIO, RoomIODoorLike, RoomPlaceOrder, RoomType, Tpr, getPosOnRectSide } from './room'

const tilesize: number = 16

export class RoomIOTunnel implements RoomIO {
    protected constructor(public tunnel: TunnelRoom) {}

    getTpr(): Tpr { throw new Error('invalid call on RoomIOTunnel') }
}
export class RoomIOTunnelOpen extends RoomIOTunnel {
    constructor(parentRoom: Room, dir: Dir, size: MapPoint, exitDir: Dir, setPos: EntityPoint, preffedPos: boolean) {
        super(new TunnelRoom(parentRoom, dir, size, exitDir, setPos, preffedPos))
    }
    getTpr(): Tpr { throw new Error('invalid call on RoomIOTunnelOpen: these dont have tprs') }
}
export class RoomIOTunnelClosed extends RoomIOTunnel {
    constructor(parentRoom: Room, dir: Dir, size: MapPoint, setPos: EntityPoint, preffedPos: boolean) {
        super(new TunnelRoom(parentRoom, dir, size, null, setPos, preffedPos))
    }
    getTpr(): Tpr {
        return this.tunnel.primaryEntarence.getTpr()
    }
}

export class TunnelRoom extends Room {
    primaryExit?: RoomIODoorLike

    constructor(
        public parentRoom: Room,
        public dir: Dir,
        public size: MapPoint,
        public exitDir: Dir | null,
        setPos: EntityPoint,
        preffedPos: boolean,
    ) {
        const pos: EntityPoint = preffedPos ? getPosOnRectSide(EntityPoint, dir, parentRoom.floorRect.to(EntityRect), setPos) : setPos
        const rect: EntityRect = EntityRect.fromTwoPoints(pos, size.to(EntityPoint))
        if (! DirUtil.isVertical(dir)) {
            [rect.width, rect.height] = [rect.height, rect.width]
        }
        switch (dir) {
            case Dir.NORTH:
                rect.x += -rect.width/2
                rect.y += -rect.height + tilesize; break
            case Dir.EAST:
                rect.x += -tilesize
                rect.y += -rect.height/2; break
            case Dir.SOUTH:
                rect.x += -rect.width/2
                rect.y += -tilesize; break
            case Dir.WEST:
                rect.x += -rect.width + tilesize
                rect.y += -rect.height/2; break
        }
        const wallSides: boolean[] = [true, true, true, true]
        wallSides[DirUtil.flip(dir)] = false
        if (exitDir !== null) {
            wallSides[DirUtil.flip(exitDir)] = false
        }
        super('tunnel-' + dir + '-' + parentRoom.name, rect, wallSides, 0, false, RoomPlaceOrder.Tunnel, RoomType.Tunnel)

        if (exitDir == null) {
            this.primaryExit = RoomIODoorLike.fromRoom('Door', this, this.name + '-exitdoor', DirUtil.flip(dir))
            this.ios.push(this.primaryExit)
        }
    }

    getRoomPosThatConnectsToTheMiddle(roomSize: MapPoint): MapPoint {
        if (this.exitDir === null) { throw new Error('cannot call getRoomPosThatConnectsToTheMiddle() when tunnel is closed') }

        const exitDir = DirUtil.flip(this.exitDir)
        const exitWallRect: MapRect = this.floorRect.getSide(exitDir, 0) as MapRect
        /* get the tunnel middle point */
        exitWallRect.x += exitWallRect.width/2
        exitWallRect.y += exitWallRect.height/2
        /* calculate the room pos */
        if (DirUtil.isVertical(exitDir)) {
            exitWallRect.x -= roomSize.x/2
        } else {
            exitWallRect.y -= roomSize.y/2
        }
        return MapPoint.fromVec(exitWallRect)
    }
}
