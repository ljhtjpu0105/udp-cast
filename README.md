# udp-cast

一个 UDP 收发与 CoAP 编解码库。通过适配器抽象底层 socket，内置微信小程序（`wx.createUDPSocket`）适配器。

- 发送：单播 / 广播，支持循环发送
- 接收：持续监听 / 单次接收，支持按来源过滤
- CoAP：内置 `parseCoap`（解析）与 `buildCoap`（组包），自动区分 CoAP / 非 CoAP 数据
- 生命周期：显式 `bind` / `close`

## 目录结构

```
udp-cast/
├── index.ts
├── types.ts
├── UdpSocket.ts
├── UdpCastClient.ts
├── coap.ts
├── adapters/
│   └── wechat.ts
└── modes/
    ├── SenderMode.ts
    ├── UnicastMode.ts
    ├── BroadcastMode.ts
    └── ReceiveMode.ts
```

## 快速开始

```ts
import { UdpCastClient, WeChatAdapter } from 'udp-cast'

const client = new UdpCastClient({ adapter: new WeChatAdapter() })

await client.bind()

const off = client.onMessage((msg) => {
  console.log('from', msg.remote.address, msg.remote.port, 'data', msg.data)
})

client.send('hello', { address: '192.168.1.100', port: 6002 })

const msg = await client.receiveOnce(3000, { address: '192.168.1.100' })

off()
client.close()
```

## API 方法列表

### UdpCastClient（主入口）

`new UdpCastClient(options)`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `adapter` | `UdpAdapter` | 是 | — | 平台适配器，如 `new WeChatAdapter()` |
| `bindPort` | `number` | 否 | `0` | `bind()` 未传参时使用的默认端口，`0` 为系统随机分配 |
| `autoBind` | `boolean` | 否 | `false` | 构造后自动调用 `bind()`（内部忽略异常，需自行 `onError`） |
| `logger` | `UdpLogger` | 否 | 控制台日志 | `{ info?, error? }`，传空对象可关闭日志 |

| 成员 | 签名 | 说明 |
|------|------|------|
| `bind` | `(port?: number) => Promise<void>` | 绑定本地端口。已绑定/绑定中直接 resolve；已关闭则 reject；端口省略时用 `bindPort`，再缺省传 `0` |
| `send` | `(data: Payload, target: SendTarget) => void` | 单播发送一次，等价于 `unicast.send` |
| `onMessage` | `(listener, filter?) => Unsubscribe` | 持续监听，返回取消订阅函数 |
| `receiveOnce` | `(timeout?: number, filter?) => Promise<UdpMessage>` | 只收一条，`timeout` 默认 `3000ms`，超时 reject |
| `onError` | `(listener: (e: Error) => void) => Unsubscribe` | 监听底层错误（发送失败、监听回调抛错等） |
| `onClose` | `(listener: () => void) => Unsubscribe` | 监听关闭事件 |
| `close` | `() => void` | 停止所有循环发送 + 关闭 socket + 清空监听器，幂等 |
| `state` | `SocketState` | 只读：`idle` / `binding` / `bound` / `closed` |
| `localPort` | `number \| null` | 实际绑定的本地端口，未绑定为 `null` |
| `unicast` | `UnicastMode` | 单播发送模式 |
| `broadcast` | `BroadcastMode` | 广播发送模式 |
| `receive` | `ReceiveMode` | 接收模式 |

### 发送模式（unicast / broadcast）

两者均继承 `SenderMode`，方法一致。

| 成员 | 签名 | 说明 |
|------|------|------|
| `send` | `(data: Payload, target: SendTarget) => void` | 发送一次。`broadcast` 下 `address` 为空时自动填 `255.255.255.255` |
| `start` | `(dataOrProvider, target, options?) => void` | 循环发送。会先 `stop()` 再启动；首帧立即发出，之后按 `interval` 定时 |
| `stop` | `() => void` | 停止定时器与总超时定时器，幂等 |
| `isRunning` | `boolean` | 是否正在循环发送 |
| `mode` | `SendMode` | `'unicast'` / `'broadcast'` |

`start` 的 `RepeatOptions`：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `interval` | `number` | `1000` | 发送间隔（ms） |
| `count` | `number` | `Infinity` | 发送次数上限，达到后自动 `stop()` |
| `timeout` | `number` | — | 总时长上限（ms），到点自动 `stop()`；`<= 0` 或不传表示不限制 |
| `dataProvider` | `(index: number) => Payload` | — | 数据工厂；优先于第一个参数，便于只传 target 时复用 |

数据取值优先级：`options.dataProvider` > 函数型第一参数 > 固定数据。若 `provider(index)` 抛错，立即 `stop()`。

### 接收模式（receive）

| 成员 | 签名 | 说明 |
|------|------|------|
| `onMessage` | `(listener, filter?) => Unsubscribe` | 持续监听，支持按来源过滤；调用返回值即可取消 |
| `receiveOnce` | `(timeout = 3000, filter?) => Promise<UdpMessage>` | 收到首条匹配消息即 resolve 并自动取消订阅；超时 reject |

`ReceiveFilter`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `address` | `string` | 只接受该来源 IP，不传表示不过滤 |
| `port` | `number` | 只接受该来源端口，不传表示不过滤 |

### UdpSocket（底层，一般不用直接实例化）

| 成员 | 签名 | 说明 |
|------|------|------|
| `bind` | `(port?: number) => Promise<void>` | 绑定端口，成功依赖底层 `onListening` 回调 |
| `send` | `(target: SendTarget, data: Payload) => void` | 无过滤器地发送；target 非法或 socket 已关闭时 throw |
| `onMessage` / `onError` / `onClose` | `(listener) => Unsubscribe` | 注册监听器，返回取消函数 |
| `close` | `() => void` | 置为 `closed`、清空监听器、reject 未完成的 `bind` |
| `state` / `localPort` | `SocketState` / `number \| null` | 状态与本地端口 |

### CoAP

| 方法 | 签名 | 说明 |
|------|------|------|
| `parseCoap` | `(data: ArrayBuffer) => CoapMessage \| null` | 解析并分类，空数据返回 `null` |
| `buildCoap` | `(options?: CoapBuildOptions) => ArrayBuffer` | 构造 CoAP 报文 |

`CoapBuildOptions`：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `number` | `1` | 消息类型（`0` CON / `1` NON / `2` ACK / `3` RST） |
| `method` | `number` | `1` | Code，如 `1` GET / `2` POST / `3` PUT / `4` DELETE |
| `path` | `string` | `''` | Uri-Path，按 `/` 拆分成多个 option（编号 11） |
| `payload` | `string` | `''` | 负载文本，`0xff` 之后原样写入 |

`messageId` 与 `token` 随机生成，token 长度固定 4 字节。

### 适配器

| 导出 | 签名 | 说明 |
|------|------|------|
| `WeChatAdapter` | `new WeChatAdapter(factory?)` | `factory` 默认取 `globalThis.wx.createUDPSocket`，环境不支持时 throw |
| `createSocket` | `() => NativeUdpSocket` | 由 `UdpCastClient` 内部调用 |

自定义平台需实现 `UdpAdapter.createSocket()`，返回的 `NativeUdpSocket` 需提供 `bind` / `send` / `close` / `onListening` / `onMessage` / `onError` / `onClose`。

### 类型速查

| 类型 | 定义 |
|------|------|
| `Payload` | `string \| ArrayBuffer` |
| `SendTarget` | `{ address: string; port: number }` |
| `RemoteInfo` | `{ address: string; port: number; family?: string; size?: number }` |
| `UdpMessage` | `{ data: ArrayBuffer; remote: RemoteInfo }` |
| `DataProvider` | `(index: number) => Payload` |
| `Unsubscribe` | `() => void` |
| `SocketState` | 枚举 `idle` / `binding` / `bound` / `closed` |

## 发送模式

### 单播

```ts
client.unicast.send(data, { address: '192.168.1.100', port: 6002 })
```

### 广播

目标地址缺省时使用 `255.255.255.255`：

```ts
client.broadcast.send(data, { address: '255.255.255.255', port: 6002 })
```

### 循环发送

任意发送模式均支持循环发送，数据内容由 `DataProvider` 从外部注入：

```ts
client.broadcast.start(
  (index) => encodeChunk(index),
  { address: '255.255.255.255', port: 6002 },
  { interval: 25, count: 100, timeout: 5000 },
)

client.broadcast.stop()
client.broadcast.isRunning
```

`start` 的第一参数也可以是固定数据。

## 接收模式

### 持续监听

```ts
const off = client.onMessage(listener, { port: 6002 })
off()
```

### 单次接收

```ts
const msg = await client.receiveOnce(3000, { address: '192.168.1.100' })
```

## CoAP 解析

`parseCoap` 接收一段原始数据，自动分类并解析，返回 `CoapMessage`：

```ts
import { parseCoap } from 'udp-cast'
import type { CoapMessage } from 'udp-cast'

const coap = parseCoap(arrayBuffer)
```

返回结构 `CoapMessage`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `isCoap` | `boolean` | 是否标准 CoAP 报文 |
| `version` | `number` | CoAP 版本 |
| `type` | `number` | 消息类型 |
| `code` | `number` | 响应码 class |
| `detail` | `number` | 响应码 detail |
| `messageId` | `number` | 消息 ID |
| `token` | `string` | token（hex） |
| `options` | `Record<string, string>` | 选项（编号 → hex 值） |
| `payload` | `unknown` | JSON 对象 或 字符串 |

分类规则：

- 首字节 version 字段为 `1`（长度 ≥ 4）：按标准 CoAP 报文解析
- 否则：视为非 CoAP，整个数据先 `JSON.parse`，失败则按 UTF-8 字符串，结果放入 `payload`，`isCoap = false`
- 空数据返回 `null`

配合接收使用：

```ts
const client = new UdpCastClient({ adapter: new WeChatAdapter() })
await client.bind(5683)

const off = client.onMessage((msg) => {
  const coap = parseCoap(msg.data)
  if (!coap) return
  if (coap.isCoap) {
    console.log('CoAP payload', coap.payload)
  } else {
    console.log('raw payload', coap.payload)
  }
})
```

## 平台适配

库内部只依赖 `NativeUdpSocket` 接口，切换平台只需实现 `UdpAdapter`。

### 微信小程序（内置）

```ts
new WeChatAdapter()
new WeChatAdapter(() => wx.createUDPSocket())
```

### 自定义平台（示例：Node dgram）

```ts
class NodeAdapter implements UdpAdapter {
  createSocket(): NativeUdpSocket { }
}
```

## 限制

- 微信小程序 UDP 仅支持 IP 地址（不支持域名），且不能连接本机 IP
- 小程序切后台后约 5s 网络操作会被中断，请在页面 `onUnload`/`onHide` 时调用 `close()`
- 广播在不同基础库版本上支持程度不一，核心功能建议优先使用单播

## License

MIT
