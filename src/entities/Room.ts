import { BaseEntity, Entity, Column, PrimaryColumn, OneToMany } from 'typeorm'
import { RoomFeeds } from './RoomFeeds'

@Entity()
export class Room extends BaseEntity{

  @PrimaryColumn()
  id: string

  @Column({ type: 'text' })
  type: 'user' | 'group' | 'room'

  @Column({ type: 'text' })
  lastPostback: string

  @OneToMany(type => RoomFeeds, roomFeeds => roomFeeds.room)
  roomFeeds: RoomFeeds[]
}
