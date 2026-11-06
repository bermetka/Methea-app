# Pricing: Methea — 2026-11-06

Source: a quick panel of 20 simulated buyers (seed 829568). It shows which prices are worth testing. It does not prove anything. Steps 2 (competitor prices) and 3 (CFO margin) were not run: there is no `founder/competitors.md` and no `founder/numbers.json`, so no margin numbers appear below.

## 1. Price

- The acceptable range from the panel is **$9.73 – $45** (PMC $9.73, OPP $10.03, IPP $20.02, PME $45). The median answers were: too cheap $5, a bargain $15, expensive $35, too expensive $60.
- **$49 is above the range.** Buy rate at $49: 0 of 20.
- Price is not the main reason people pass. Only 3 of 20 gave it as their main reason. The rest were: habit / "I already pay for ChatGPT" (6), trust / the university's AI policy (4), timing / "the deadline isn't close yet" (4), need / "I already know my methods" (3).
- So lowering the price alone will not fix conversion. The free tier covers the part where students get stuck (question, theory, diagram). The paid value (interview guide, analysis) comes weeks later, when they are not on the page.
- Recommendation: test **$29 and $49**. Do not move to $29 until real buyers confirm it.

## 2. Ladder (hypothesis)

| rung | price | what's in it | reason to step up |
| --- | --- | --- | --- |
| Free | $0 | as now | — |
| Proposal | $19–29 | methodology chain + interview guide + export without watermark | the proposal is due and the supervisor wants the chain |
| Full project | $49 | + transcript analysis, 6 months | fieldwork has started and there are 15 transcripts |

This answers the objection "I only need one part" (P002, P008). It conflicts with the locked decision of one $49 SKU (the Paddle entitlement spec). Changing it needs your explicit decision.

## 3. Opening offer

- No "was $X" anchor, because there was never a real higher price.
- An option: a cohort / department code, valid until a fixed date. This answers the strongest "flip" (supervisor or university approval, a recommendation from the cohort) and does not teach people to wait for a discount.

## 4. Test with real buyers

- Two landing-page variants with the {price} placeholder ($29 / $49), with a pre-sale or click-to-pay as the measure.
- Add the 4 Van Westendorp questions to the custdev interviews. The real CSV (`too_cheap, cheap, expensive, too_expensive`) runs through the same `van_westendorp.py`.

## 5. Top price/purchase objections, verbatim (for marketing)

1. "I already pay for ChatGPT and I use it for exactly this kind of thing, theories, frameworks, interview questions." (P003)
2. "I will not pay $49 for an AI tool until I know my university allows it." (P005)
3. "I only pay for stuff when I'm panicking the night before seeing my supervisor." (P014)

Also seen (not about price): there is no mixed-methods / survey support (P008, P011, P017), and it is not clear how transcript data is stored (P009).
