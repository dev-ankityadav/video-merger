import User from './User'
import CommandExecutor from './CommandExecutor'

export default class Media {
  public readonly path: string
  public readonly hasAudio: boolean
  public readonly hasVideo: boolean
  public readonly startTime: number
  public user: User | null = null
  public id: number = -1
  public duration: number = -1
  public audioChannels: number = -1
  public initialized: boolean = false
  public addText: boolean = false

  /**
   * @param path
   * @param startTime time in milliseconds
   * @param hasVideo
   * @param hasAudio
   */
  constructor(path: string, startTime: number, hasVideo: boolean, hasAudio: boolean, addText: boolean = false) {
    this.path = path
    if (!(hasAudio || hasVideo)) throw new Error('media must contain audio or video')
    this.hasAudio = hasAudio
    this.hasVideo = hasVideo
    this.startTime = startTime
    this.addText = addText
  }

  init(logsEnable: boolean): PromiseLike<any> {
    return new Promise((resolve, reject) => {
      Promise.all([this.getEntry('format=duration', logsEnable), this.hasAudio ? this.getEntry('stream=channels', logsEnable) : '-1'])
        .then(([duration, channels]) => {
          this.duration = Math.round(parseFloat(duration) * 1000)
          this.audioChannels = parseInt(channels, 10)
          this.initialized = true
          resolve('')
        })
        .catch((err: any) => {
          console.error('error loading video file at ', this.path, err)
          reject(err)
        })
    })
  }

  /**
   * @return time in milliseconds
   */
  async getEntry(entry: string, log: boolean): Promise<string> {
    const command = `ffprobe -v error -show_entries ${entry} -of default=noprint_wrappers=1:nokey=1 "${this.path}"`
    return await CommandExecutor.execute(command, log);
  }

  setId(id: number): void {
    this.id = id
  }
}