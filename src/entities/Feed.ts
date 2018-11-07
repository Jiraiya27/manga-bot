import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm'
import { RoomFeeds } from './RoomFeeds'
import { RssItem } from 'rss-parser'

@Entity()
export class Feed extends BaseEntity{

  @PrimaryGeneratedColumn()
  id: string

  @Column({ type: 'text' })
  source: string

  @Column({ type: 'text' })
  title: string

  @Column({ type: 'integer', default: 30 })
  frequency: number

  @Column({ type: 'boolean', default: false })
  global: boolean

  @Column({ type: 'timestamptz' })
  lastUpdated: Date

  @Column({ type: 'json', nullable: true })
  lastItem: RssItem

  @OneToMany(type => RoomFeeds, roomFeeds => roomFeeds.feed)
  roomFeeds: RoomFeeds[]

  static findPastUpdate() {
    return this.createQueryBuilder('feed')
      .where("feed.lastUpdated < current_timestamp - interval '1 mins' * feed.frequency")
      .leftJoinAndSelect('feed.roomFeeds', 'roomFeeds')
      .leftJoinAndSelect('roomFeeds.room', 'room')
      .getMany()
  }
}
