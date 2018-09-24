import { BaseEntity, Entity, Column, ManyToOne } from 'typeorm'
import { Room } from './Room'
import { Feed } from './Feed'


@Entity()
export class RoomFeeds extends BaseEntity{
  @Column({ type: 'text' })
  roomId: string
  @ManyToOne(type => Room, room => room.roomFeeds, { primary: true, onDelete: 'CASCADE' })
  room: Room

  @Column({ type: 'text' })
  feedId: string
  @ManyToOne(type => Feed, feed => feed.roomFeeds, { primary: true, onDelete: 'CASCADE' })
  feed: Feed

  @Column({ type: 'json', default: [] })
  filters: string[]
}
