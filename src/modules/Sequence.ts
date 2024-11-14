import Media from './Media'
import SequenceStep from './SequenceStep'
import CommandExecutor from './CommandExecutor'
import User from './User'

export default class Sequence {
  public mediaList: Media[]
  public sequenceSteps: SequenceStep[] = []
  public outputVideo: Media
  public layout: VideoLayout
  public encodingOptions: EncodingOptions

  constructor(users: User[] = [], outputVideo: Media, layout: VideoLayout, encOpt?: EncodingOptions) {
    this.mediaList = []
    users.forEach(user => {
      this.mediaList.push(...user.media)
    })

    const defaultEncodingOptions: EncodingOptions = {
      size: { w: 1280, h: 720 },
      crf: 22
    }

    if (encOpt && encOpt.crf && encOpt.bitrate) throw new Error('cannot use bitrate and crf simultaneously')

    const encoding: EncodingOptions = {
      size: encOpt ? encOpt.size : defaultEncodingOptions.size,
      logLevel: encOpt?.logLevel
    }

    if (!encOpt?.crf && !encOpt?.bitrate) {
      encoding.crf = defaultEncodingOptions.crf
    } else {
      encoding.crf = encOpt?.crf
      encoding.bitrate = encOpt?.bitrate
    }

    this.encodingOptions = encoding

    this.outputVideo = outputVideo
    this.layout = layout
  }

  addVideo(video: Media): void {
    this.mediaList.push(video)
  }

  async encode(): Promise<any> {
    console.log('start encoding')
    const command = await this.generateCommand()
    console.log('\n---- Command ---- \n', command)
    return await CommandExecutor.execute(command, true)
  }

  private async createSequenceSteps(): Promise<any> {
    // check videos
    try {
      await this.mediaList.reduce(async (p: Promise<void>, med: Media) => p.then(() => med.initialized ? Promise.resolve() : med.init()), Promise.resolve())
    } catch (err) {
      console.log('error initializing video files', err)
      throw err
    }

    // Order videos
    this.mediaList.sort((a, b) => a.startTime > b.startTime ? 1 : (a.startTime === b.startTime ? 0 : -1)).forEach((vid, index) => vid.setId(index))

    const queue: MediaPoint[] = [];

    this.mediaList.forEach(vid_1 => {
      queue.push({
        start_point: true,
        time: vid_1.startTime,
        media_id: vid_1.id
      })
      queue.push({
        start_point: false,
        time: vid_1.startTime + vid_1.duration,
        media_id: vid_1.id
      })
    })

    queue.sort((a_1: MediaPoint, b_1: MediaPoint) => a_1.time < b_1.time ? 1 : (a_1.time === b_1.time ? 0 : -1))

    console.log(`\n---- sort queue -----\n`, queue)

    // building sequences
    let prevTime: number = -1
    const currentVideos: Media[] = []
    this.sequenceSteps = []

    while (queue.length > 0) {
      // @ts-ignore
      const point: MediaPoint = queue.pop()

      if ((queue.length === 0 || point.time !== prevTime) && prevTime !== -1 && currentVideos.length >= 0) {
        const step: SequenceStep = new SequenceStep(`Seq${this.sequenceSteps.length}`, [...currentVideos], prevTime, point.time, this.encodingOptions.size, this.layout)
        this.sequenceSteps.push(step)
      }

      if (point.start_point) {
        currentVideos.push(this.mediaList[point.media_id])
      } else {
        const index_1: number = currentVideos.findIndex(vid_2 => vid_2.id === point.media_id)
        currentVideos.splice(index_1, 1)
      }

      prevTime = point.time
    }

    console.log('\n---- Videos ----')
    this.mediaList.forEach(vid_3 => console.log('id', vid_3.id, 'start', vid_3.startTime, 'len', vid_3.duration, 'achan', vid_3.audioChannels, vid_3.path))
    console.log('output:', this.outputVideo.path)

    console.log('\n---- Sequences ----')
    this.sequenceSteps.forEach(step_1 => {
      console.log(step_1.id, 'v:', '[' + step_1.mediaList.map(vid_4 => vid_4.id.toString()).join(',') + ']', 'start', step_1.startTime, 'end', step_1.startTime + step_1.duration, 'len', step_1.duration)
    })
  }

  async generateCommand(addText: boolean = false): Promise<string> {
    await this.createSequenceSteps();

    // Construct filter complex string
    const filters = this.sequenceSteps.map(step => step.generateFilter()).join('');
    const concatSection = `${this.sequenceSteps.map(step => `[${step.id}_out_v][${step.id}_out_a]`).join('')}concat=n=${this.sequenceSteps.length}:v=1:a=1[vid][aud];`
    const textSection = `[vid]drawtext=text='Meeting':fontfile='arial.ttf':x=(w-text_w)-10:y=(h-text_h)-10:fontcolor=white:fontsize=24[vid_with_text]`;

    let filterComplex: string = '';
    if (addText) {
      filterComplex = `${filters}${concatSection}${textSection}`;
    } else {
      filterComplex = `${filters}${concatSection}`;
    }

    // Configure logging options
    const logging = this.encodingOptions.logLevel ? `-v ${this.encodingOptions.logLevel}` : `-v quiet -stats`;

    // Configure quality options
    const quality = this.encodingOptions.crf ? `-crf ${this.encodingOptions.crf}` : `-b:v ${this.encodingOptions.bitrate}`;

    // Construct FFmpeg command
    const commandParts: string[] = [
      `ffmpeg ${logging}`,
      this.mediaList.map(video => `-i "${video.path}"`).join(' '),
      `-filter_complex "${filterComplex}"`,
      `-c:v libx264 ${quality} -preset fast`,
    ];
    if (addText) {
      commandParts.push(`-map [vid_with_text] -map [aud] -y "${this.outputVideo.path}"`)
    } else {
      commandParts.push(`-map [vid] -map [aud] -y "${this.outputVideo.path}"`)
    }

    // Return the assembled command as a single string
    return commandParts.join(' ');
  }
}