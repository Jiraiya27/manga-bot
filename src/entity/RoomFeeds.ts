import { BaseEntity, Entity, Column, ManyToOne } from 'typeorm'
import { Room } from './Room'
import { Feed } from './Feed'


@Entity()
export class RoomFeeds extends BaseEntity{
  @ManyToOne(type => Room, room => room.roomFeeds, { primary: true })
  room: Room

  @ManyToOne(type => Feed, feed => feed.roomFeeds, { primary: true })
  feed: Feed

  @Column({ type: 'text', array: true })
  filters: string[]
}
