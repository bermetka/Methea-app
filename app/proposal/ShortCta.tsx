'use client'

import { trackCheck } from '@/app/actions/funnel'
import styles from './proposal.module.css'

/** Short /proposal: one button straight into a guest brief (/go/brief). Records the click first. */
export default function ShortCta({ id, dark = false }: { id: string; dark?: boolean }) {
  async function go(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    await Promise.race([
      trackCheck('check_cta', { path: 'program', stage: 'who' }).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 800)),
    ])
    window.location.assign('/go/brief')
  }
  return (
    <div id={id} className={styles.shortCta}>
      <a href="/go/brief" onClick={go} className={dark ? styles.btnLime : styles.btn}>Check my topic — free →</a>
      <span className={dark ? styles.formHintDark : styles.formHint}>No sign-up to start · no card needed</span>
    </div>
  )
}
