import { networkInterfaces, type NetworkInterfaceInfo } from 'os'

/** Strips the IPv4-in-IPv6 prefix Node gives sockets that listen on both. */
export function plainAddress(address: string | undefined): string {
  if (!address) return ''
  return address.startsWith('::ffff:') ? address.slice(7) : address
}

/**
 * Addresses a phone on the same home network can have: private IPv4 ranges, link-local and
 * loopback. Anything else (a public address, which would mean a forwarded port) is refused.
 */
export function isLocalNetworkAddress(raw: string | undefined): boolean {
  const address = plainAddress(raw).toLowerCase()
  if (!address) return false
  const v4 = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if ([a, b, Number(v4[3]), Number(v4[4])].some((n) => n > 255)) return false
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    )
  }
  if (address === '::1') return true
  // fe80::/10 link-local and fc00::/7 unique-local.
  return /^fe[89ab][0-9a-f]:/.test(address) || /^f[cd][0-9a-f]{2}:/.test(address)
}

/** Adapters a phone is never on: virtual machines, WSL, VPN tunnels. */
const VIRTUAL =
  /(vethernet|virtualbox|vmware|hyper-v|wsl|loopback|docker|tailscale|zerotier|hamachi|vpn|tap-|tun)/i

export interface OwnNetwork {
  address: string
  netmask: string
}

const toInt = (a: string): number | null => {
  const m = a.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some((n) => n > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

/**
 * This PC's own Wi-Fi or wired networks, most likely first: real adapters before virtual ones,
 * home ranges before others. Some routers hand out addresses outside the usual private ranges
 * (172.10.x.x, for one), so any adapter that is not loopback or link-local counts: what keeps
 * strangers out is that a phone must be on the same network as one of these adapters.
 */
export function lanNetworks(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces()
): OwnNetwork[] {
  const found: { net: OwnNetwork; score: number }[] = []
  for (const [name, list] of Object.entries(interfaces)) {
    for (const info of list ?? []) {
      if (info.family !== 'IPv4' || info.internal) continue
      if (info.address.startsWith('169.254.') || info.address.startsWith('127.')) continue
      if (toInt(info.address) === null) continue
      // Without a mask, assume the usual home /24.
      const netmask = toInt(info.netmask) === null ? '255.255.255.0' : info.netmask
      let score = 0
      if (VIRTUAL.test(name)) score += 10
      if (!isLocalNetworkAddress(info.address)) score += 2
      if (!info.address.startsWith('192.168.')) score += 1
      found.push({ net: { address: info.address, netmask }, score })
    }
  }
  return found.sort((x, y) => x.score - y.score).map((f) => f.net)
}

export function lanAddresses(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces()
): string[] {
  return lanNetworks(interfaces).map((n) => n.address)
}

/** True when the address is on the same network as one of this PC's own adapters. */
export function isOnOwnNetwork(raw: string | undefined, networks: OwnNetwork[]): boolean {
  const ip = toInt(plainAddress(raw))
  if (ip === null) return false
  return networks.some((n) => {
    const own = toInt(n.address)
    const mask = toInt(n.netmask)
    // A mask wider than /8 would let half the internet in; such a network is not a home one.
    if (own === null || mask === null || mask < 0xff000000) return false
    return (ip & mask) >>> 0 === (own & mask) >>> 0
  })
}

/** Phones the remote answers: home-range addresses, or ones on this PC's own network. */
export function isAllowedClient(raw: string | undefined, networks: OwnNetwork[]): boolean {
  return isLocalNetworkAddress(raw) || isOnOwnNetwork(raw, networks)
}

/**
 * The Host header must name this server by one of its own addresses. A web page that points a
 * name it controls at this PC (DNS rebinding) sends its own name, and is refused.
 */
export function isOwnHost(host: string | undefined, port: number, ownAddresses: string[]): boolean {
  if (!host) return false
  const allowed = new Set([...ownAddresses, '127.0.0.1', 'localhost'].map((a) => `${a}:${port}`))
  return allowed.has(host.toLowerCase())
}
