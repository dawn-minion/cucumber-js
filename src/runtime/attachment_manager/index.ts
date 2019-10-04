import isStream from 'is-stream'
import Promise from 'bluebird'

export interface IAttachmentMedia {
  encoding: string;
  type: string;
}

export interface IAttachment {
  data: string;
  media: IAttachmentMedia;
}

export default class AttachmentManager {
  private onAttachment(IAttachment): void;

  constructor(onAttachment) {
    this.onAttachment = onAttachment
  }

  create(data: Buffer | ReadableStream | string, mediaType: string, callback?: () => void) {
    if (Buffer.isBuffer(data)) {
      if (!mediaType) {
        throw Error('Buffer attachments must specify a media type')
      }
      this.createBufferAttachment(data, mediaType)
    } else if (isStream.readable(data)) {
      if (!mediaType) {
        throw Error('Stream attachments must specify a media type')
      }
      return this.createStreamAttachment(data, mediaType, callback)
    } else if (typeof data === 'string') {
      if (!mediaType) {
        mediaType = 'text/plain'
      }
      this.createStringAttachment(data, { type: mediaType })
    } else {
      throw Error(
        'Invalid attachment data: must be a buffer, readable stream, or string'
      )
    }
  }

  createBufferAttachment(data: Buffer, mediaType: string) {
    this.createStringAttachment(data.toString('base64'), {
      encoding: 'base64',
      type: mediaType,
    })
  }

  createStreamAttachment(data: ReadableStream, mediaType: string, callback?: () => void) {
    const promise = new Promise((resolve, reject) => {
      const buffers = []
      data.on('data', chunk => {
        buffers.push(chunk)
      })
      data.on('end', () => {
        this.createBufferAttachment(Buffer.concat(buffers), mediaType)
        resolve()
      })
      data.on('error', reject)
    })
    if (callback) {
      promise.then(callback, callback)
    } else {
      return promise
    }
  }

  createStringAttachment(data: string, media: IAttachmentMedia) {
    this.onAttachment({ data, media })
  }
}
