/** The shared support settings (see config/support.ts), plus a preview-only placeholder. */
export {
  support,
  supportIsConfigured,
  hasValidUpi,
  hasInternational,
  upiLink,
  SUPPORT_PAGE_URL,
  type SupportConfig
} from '../../../../config/support'
import type { SupportConfig } from '../../../../config/support'

/** Obvious placeholders for a local, unpublished preview build only. UPI-only, like launch. */
export const SUPPORT_PREVIEW_CONFIG: SupportConfig = {
  upiId: 'your-upi-id@bank',
  upiName: 'Kissa (preview)',
  upiQrImage: null,
  international: null
}
