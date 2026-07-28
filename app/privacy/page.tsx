import LegalLayout, { prose } from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Privacy Policy — Methea',
  description: 'How Methea collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="27 July 2026">
      <p style={prose.p}>
        Methea (&quot;we&quot;, &quot;us&quot;) helps Master&apos;s and PhD students structure their
        research — framework selection, methodology, interview guides, and qualitative analysis.
        This policy explains what personal data we handle, why, and your rights over it.
      </p>
      <p style={prose.p}>
        If you have questions, contact us at <a href="mailto:privacy@methea.app">privacy@methea.app</a>.
      </p>

      <section style={prose.section}>
        <h2 style={prose.h2}>1. Who we are</h2>
        <p style={prose.p}>
          Methea is operated by Bermet Koshoeva, a sole proprietor (ИП / individual entrepreneur)
          registered in the Kyrgyz Republic. This policy — and our handling of your personal data —
          is governed by the laws of the Kyrgyz Republic, without limiting any data protection
          rights you have under the law of your own country (see section 7).
        </p>
        <p style={prose.p}>
          For the purposes of the EU/UK GDPR and similar laws, we act as the{' '}
          <strong style={prose.strong}>data controller</strong> for the account data you give us,
          and as a <strong style={prose.strong}>processor</strong> for the research content you
          upload (including any third-party personal data contained in it — see section 6).
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>2. What we collect</h2>
        <p style={prose.p}>
          <strong style={prose.strong}>Account data.</strong> Your email address, and your name if
          you sign in with Google. Handled via our authentication provider (Supabase Auth).
        </p>
        <p style={prose.p}>
          <strong style={prose.strong}>Research inputs.</strong> The material you enter or upload
          to build your research: your topic and research question, degree level and discipline,
          any reading list you paste, and any assignment brief / Terms of Reference (TOR) files you
          upload. We extract and store the <strong style={prose.strong}>text</strong> of uploaded
          files; we do not retain the original file.
        </p>
        <p style={prose.p}>
          <strong style={prose.strong}>Interview transcripts.</strong> If you use the analysis
          features, the transcript text you upload is stored and processed. Transcripts may contain
          the <strong style={prose.strong}>verbatim words and personal data of your interview
          participants</strong>. See section 6 for your responsibilities here.
        </p>
        <p style={prose.p}>
          <strong style={prose.strong}>Usage data.</strong> Basic technical data needed to run and
          secure the service (e.g. authentication sessions).
        </p>
        <p style={prose.p}>
          <strong style={prose.strong}>Payment data.</strong> We do not collect or store payment
          card data directly. Purchases are handled by <strong style={prose.strong}>Paddle</strong>,
          our merchant of record — see section 4.
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>3. How we use your data</h2>
        <p style={prose.p}>
          We use your data solely to provide the Methea service: to generate framework suggestions,
          methodology guidance, interview guides, and to code and synthesise your qualitative data
          against your chosen framework. We do not sell your data, and we do not use it for
          advertising.
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>4. AI processing, sub-processors, and payments</h2>
        <p style={prose.p}>
          To provide the service, your research text (brief, framework inputs, and transcript
          excerpts) is sent to third-party providers that process it on our behalf:
        </p>
        <table style={prose.table}>
          <thead>
            <tr>
              <th style={prose.th}>Provider</th>
              <th style={prose.th}>Purpose</th>
              <th style={prose.th}>Data sent</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={prose.td}><strong style={prose.strong}>Anthropic</strong> (Claude API)</td>
              <td style={prose.td}>Generates framework/methodology suggestions and codes transcripts</td>
              <td style={prose.td}>Brief text, framework inputs, transcript excerpts (truncated)</td>
            </tr>
            <tr>
              <td style={prose.td}><strong style={prose.strong}>Supabase</strong></td>
              <td style={prose.td}>Database and authentication hosting</td>
              <td style={prose.td}>Account data, research content</td>
            </tr>
            <tr>
              <td style={prose.td}><strong style={prose.strong}>Vercel</strong></td>
              <td style={prose.td}>Application hosting</td>
              <td style={prose.td}>Technical/session data</td>
            </tr>
            <tr>
              <td style={prose.td}><strong style={prose.strong}>OpenAlex / CrossRef</strong></td>
              <td style={prose.td}>Citation verification</td>
              <td style={prose.td}>Theory/author names only — no personal data</td>
            </tr>
          </tbody>
        </table>
        <p style={prose.p}>
          Text sent to Anthropic&apos;s API is <strong style={prose.strong}>not used to train
          Anthropic&apos;s models</strong>. Transcript excerpts are truncated before being sent
          (currently to ~12,000 characters for coding). We will keep this list of sub-processors
          current.
        </p>
        <p style={prose.p}>
          <strong style={prose.strong}>Payments.</strong> Purchases are handled by{' '}
          <strong style={prose.strong}>Paddle.com Market Limited</strong>, acting as our merchant of
          record. Paddle bills you directly, issues invoices/receipts, handles VAT and sales tax,
          and processes refunds. Paddle receives your billing details (name, email, payment method)
          directly and processes them under its own privacy policy — Methea does not see or store
          your card details.
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>5. Data retention and deletion</h2>
        <p style={prose.p}>
          We retain your research content for as long as your account and project exist, including
          its version history (which lets you review changes over time).
        </p>
        <p style={prose.p}>
          You can request deletion of your account or a specific project at any time by emailing{' '}
          <a href="mailto:privacy@methea.app">privacy@methea.app</a>, and we will delete the
          associated data, including transcripts and their version history.{' '}
          <em>(Self-service in-app deletion is on our roadmap; until then, deletion is handled on
          request.)</em>
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>6. Interview participants — your responsibility</h2>
        <p style={prose.p}>
          When you upload interview transcripts, you are responsible for having the appropriate
          legal basis to do so — for example, participant consent and/or ethics/IRB approval from
          your institution. Methea prompts you to confirm ethics status before generating an
          interview guide, but the responsibility for lawful collection and processing of
          participant data rests with you as the researcher. Where possible, we recommend
          pseudonymising participants before upload.
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>7. Your rights</h2>
        <p style={prose.p}>
          Depending on your location (including under EU/UK GDPR), you may have the right to
          access, correct, delete, export, or restrict processing of your personal data, and to
          object to processing. To exercise any of these, email{' '}
          <a href="mailto:privacy@methea.app">privacy@methea.app</a>. You also have the right to
          complain to your local data protection authority.
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>8. Security</h2>
        <p style={prose.p}>
          Access to your data is protected by row-level security so that you can only reach your
          own projects, and data is encrypted in transit. No system is perfectly secure, but we
          work to protect your information and to fix issues promptly.
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>9. Changes to this policy</h2>
        <p style={prose.p}>
          We may update this policy as the product evolves (for example, when we add transcription
          or new features). We will update the &quot;last updated&quot; date and, for material
          changes, notify you.
        </p>
      </section>

      <section style={prose.section}>
        <h2 style={prose.h2}>10. Contact</h2>
        <p style={prose.p}>
          Privacy questions or requests: <a href="mailto:privacy@methea.app">privacy@methea.app</a>
        </p>
      </section>
    </LegalLayout>
  )
}
