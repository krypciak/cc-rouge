import { Rect, Dir, DirU, Vec2Dir } from '../util/geometry'
import { Vec2 } from '../util/vec2'

export interface RoomArrange extends Rect {}

export function getCenteredRect(size: Vec2, tpr: Vec2Dir): Rect {
    const pos: Vec2 = Vec2.copy(tpr)
    if (tpr.dir == Dir.SOUTH || tpr.dir == Dir.EAST) {
        Vec2.moveInDirection(pos, DirU.flip(tpr.dir), size.y)
    }
    const move = size.x / 2
    Vec2.moveInDirection(pos, DirU.isVertical(tpr.dir) ? Dir.WEST : Dir.NORTH, move)
    return Rect.fromTwoVecSize(pos, Vec2.flipSides(size, !DirU.isVertical(tpr.dir)))
}
