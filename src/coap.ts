export interface CoapMessage {
  isCoap: boolean
  version: number
  type: number
  code: number
  detail: number
  messageId: number
  token: string
  options: Record<string, string>
  payload: unknown
}

export interface CoapBuildOptions {
  path?: string
  method?: number
  type?: number
  payload?: string
}

function bytesToUtf8(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    if (b < 0x80) {
      str += String.fromCharCode(b)
    } else if (b < 0xe0) {
      str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f))
      i += 1
    } else if (b < 0xf0) {
      str += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f))
      i += 2
    } else {
      const cp =
        ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f)
      str += String.fromCodePoint(cp)
      i += 3
    }
  }
  return str
}

function utf8Bytes(str: string): number[] {
  const out: number[] = []
  for (const ch of str) {
    const cp = ch.codePointAt(0) as number
    if (cp < 0x80) {
      out.push(cp)
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f))
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    } else {
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    }
  }
  return out
}

function pushOption(out: number[], delta: number, value: number[]): void {
  let d = delta
  let dExt: number[] = []
  if (delta >= 269) {
    const v = delta - 269
    d = 14
    dExt = [(v >> 8) & 0xff, v & 0xff]
  } else if (delta >= 13) {
    d = 13
    dExt = [delta - 13]
  }
  let l = value.length
  let lExt: number[] = []
  if (value.length >= 269) {
    const v = value.length - 269
    l = 14
    lExt = [(v >> 8) & 0xff, v & 0xff]
  } else if (value.length >= 13) {
    l = 13
    lExt = [value.length - 13]
  }
  out.push((d << 4) | l)
  for (const b of dExt) out.push(b)
  for (const b of lExt) out.push(b)
  for (const b of value) out.push(b)
}

function toHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function parseText(bytes: Uint8Array): unknown {
  const text = bytesToUtf8(bytes)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function parseCoap(data: ArrayBuffer): CoapMessage | null {
  const bytes = new Uint8Array(data)
  if (bytes.length === 0) return null

  const isCoap = bytes.length >= 4 && ((bytes[0] >> 6) & 0x03) === 1

  if (!isCoap) {
    return {
      isCoap: false,
      version: 0,
      type: 0,
      code: 0,
      detail: 0,
      messageId: 0,
      token: '',
      options: {},
      payload: parseText(bytes),
    }
  }

  const version = (bytes[0] >> 6) & 0x03
  const type = (bytes[0] >> 4) & 0x03
  const tkl = bytes[0] & 0x0f
  const code = (bytes[1] >> 5) & 0x07
  const detail = bytes[1] & 0x1f
  const messageId = (bytes[2] << 8) + bytes[3]

  const token = toHex(Array.from(bytes.slice(4, 4 + tkl)))

  const options: Record<string, string> = {}
  let offset = 4 + tkl
  let prevDelta = 0
  while (offset < bytes.length) {
    const head = bytes[offset]
    if (head === 0xff) {
      offset += 1
      break
    }
    let delta = head >> 4
    let len = head & 0x0f
    offset += 1
    if (delta === 13) {
      delta = 13 + bytes[offset]
      offset += 1
    } else if (delta === 14) {
      delta = 14 + 255 + (bytes[offset] << 8) + bytes[offset + 1]
      offset += 2
    } else if (delta === 15) {
      break
    }
    if (len === 13) {
      len = 13 + bytes[offset]
      offset += 1
    } else if (len === 14) {
      len = 14 + 255 + (bytes[offset] << 8) + bytes[offset + 1]
      offset += 2
    } else if (len === 15) {
      break
    }
    const optionNumber = prevDelta + delta
    options[String(optionNumber)] = toHex(Array.from(bytes.slice(offset, offset + len)))
    offset += len
    prevDelta = optionNumber
  }

  let payload: unknown = ''
  if (offset < bytes.length) {
    payload = parseText(bytes.slice(offset))
  }

  return { isCoap: true, version, type, code, detail, messageId, token, options, payload }
}

export function buildCoap(options: CoapBuildOptions = {}): ArrayBuffer {
  const type = options.type ?? 1
  const method = options.method ?? 1
  const path = options.path ?? ''
  const payload = options.payload ?? ''
  const messageId = 1 + Math.floor(Math.random() * 65536)
  const token = 1 + Math.floor(Math.random() * 0x7fffffff)

  const out: number[] = []
  out.push(0x40 | ((type & 0x03) << 4) | 0x04)
  out.push(method & 0xff)
  out.push((messageId >> 8) & 0xff, messageId & 0xff)
  out.push(token & 0xff, (token >> 8) & 0xff, (token >> 16) & 0xff, (token >> 24) & 0xff)

  if (path) {
    let delta = 11
    for (const segment of path.split('/')) {
      pushOption(out, delta, utf8Bytes(segment))
      delta = 0
    }
  }

  out.push(0xff)
  for (const b of utf8Bytes(payload)) out.push(b)

  return new Uint8Array(out).buffer
}
