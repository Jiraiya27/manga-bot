import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm'
import { RoomFeeds } from './RoomFeeds'

type RssItemm = {
  title: string,
  link: string,
  pubDate: string,
  content: string,
  guid: string,
  isoDate: Date, 
}

@Entity()
export class Feed extends BaseEntity{

  @PrimaryGeneratedColumn()
  id: string

  @Column({ type: 'text' })
  src: string

  @Column({ type: 'text' })
  title: string

  @Column({ type: 'integer', default: 30 })
  frequency: number

  @Column({ type: 'boolean', default: false })
  global: boolean

  @Column({ type: 'timestamptz' })
  lastUpdate: Date

  @Column({ type: 'json', nullable: true })
  lastItem: RssItemm

  @OneToMany(type => RoomFeeds, roomFeeds => roomFeeds.feed)
  roomFeeds: RoomFeeds[]
}
