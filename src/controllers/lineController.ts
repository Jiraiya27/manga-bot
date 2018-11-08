import { Request, Response } from "express";
import { WebhookEvent } from "@line/bot-sdk";

import {
  handleMessage,
  handleFollow,
  handleUnfollow,
  handleJoin,
  handleLeave,
  handlePostback,
} from './lineEventsController'

export const webhook = async (req: Request, res: Response) => {
  await Promise.all(req.body.events.map(handleEvent))
  return res.status(200).json({
    message: 'OK',
  })
}

const handleEvent = async (event: WebhookEvent) => {
  switch (event.type) {
    case 'message':
      return handleMessage(event)
    case 'follow':
      return handleFollow(event)
    case 'unfollow':
      return handleUnfollow(event)
    case 'join':
      return handleJoin(event)
    case 'leave':
      return handleLeave(event)
    case 'postback':
      return handlePostback(event)
    case 'beacon':
    default:
      return Promise.resolve()
  }
}
