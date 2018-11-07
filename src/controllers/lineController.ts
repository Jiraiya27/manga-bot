import { Request, Response } from "express";
import { WebhookEvent } from "@line/bot-sdk";

import {
  handleMessage,
  handleFollow,
  handleUnfollow,
  handleJoin,
  handleLeave,
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
    default: // postback and beacon
      return Promise.resolve()
  }
}
