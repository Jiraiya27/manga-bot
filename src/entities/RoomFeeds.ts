import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm'
import { Room } from './Room'
import { Feed } from './Feed'

@Entity()
export class RoomFeeds extends BaseEntity {
  @PrimaryColumn({ type: 'text' })
  roomId: string
  @ManyToOne(type => Room, room => room.roomFeeds, { primary: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  room: Room

  @PrimaryColumn({ type: 'text' })
  feedId: string
  @ManyToOne(type => Feed, feed => feed.roomFeeds, { primary: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  feed: Feed

  @Column({ type: 'json', default: [] })
  filters: string[]
}
