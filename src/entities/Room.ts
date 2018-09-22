import { BaseEntity, Entity, Column, PrimaryColumn, OneToMany } from 'typeorm'
import { RoomFeeds } from './RoomFeeds'

@Entity()
export class Room extends BaseEntity{

  @PrimaryColumn()
  id: string

  @Column({
    enum: ['user', 'group', 'room'],
    type: 'text',
  })
  type: string

  @OneToMany(type => RoomFeeds, roomFeeds => roomFeeds.room)
  roomFeeds: RoomFeeds[]
}
