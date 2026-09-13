# Children's data under the DPDP Act: where StudyLedger stands

Research notes, not legal advice. Written 6 September 2026. The purpose is to
put a lawyer in the picture in ten minutes rather than from scratch.

## Why this matters more here than for most products

StudyLedger is built for school and exam-prep students. The Act's threshold is
18, so **most users are legally children**, and the child provisions are not an
edge case to handle later. They describe the median user.

## The two obligations, and why they are different

**Section 9(1)** requires verifiable parental consent before processing a
child's personal data. This is a *procedure*. It is solvable with engineering
and time.

**Section 9(3)** is the hard one:

> "A Data Fiduciary shall not undertake tracking or behavioural monitoring of
> children or targeted advertising directed at children."

This is a *prohibition*, not a consent requirement. Parental consent does not
authorise it. If it applies to what StudyLedger does, no consent flow cures it.

## The unresolved question

Neither "tracking" nor "behavioural monitoring" is defined in the Act. So:

**Argument that 9(3) does not catch us.** The phrase sits directly beside
"targeted advertising directed at children", which suggests the target is
commercial surveillance: profiling a child to influence or monetise them. Every
data point in StudyLedger is entered by the student themselves, about
themselves, is shown only back to them, and exists to answer the question they
opened the app to ask. There is no advertising, no third-party analytics, and
no sale or sharing of data.

**Argument that it does.** The words are broad and unqualified. The Ledger
Score is, in plain language, a behavioural profile: it observes study patterns
over time and predicts exam readiness. Features like Circadian (bucketing
accuracy by hour of day) and Peer Heatmap (comparing a student against a
cohort) are harder to characterise as anything other than behavioural analysis.

An honest reading is that the risk is real and not remote.

## The exemption route, and a genuine contradiction in the sources

**Section 9(4)** says the provisions of sub-sections (1) *and* (3) shall not
apply to such classes of Data Fiduciaries, or for such purposes, as may be
prescribed. On its plain text, 9(3) **is** capable of being exempted.

Several commentaries nonetheless assert that the 9(3) prohibition is absolute
with no exemptions. That contradicts 9(4) as written. This tension is
precisely the sort of thing to put to a lawyer rather than resolve by reading
more blog posts.

The Fourth Schedule to the DPDP Rules 2025 carries the exemptions:

- **Part A, classes of fiduciary**: includes educational institutions,
  healthcare providers, creches and child transport. Entry 3 reads, verbatim:

  > **Class:** A Data Fiduciary who is an educational institution.
  > **Conditions:** Processing is restricted to tracking and behavioural
  > monitoring — (a) for the educational activities of such institution; or
  > (b) in the interests of safety of children enrolled with such institution.

  The Schedule defines the term itself, and more broadly than expected:
  **"an institution of learning that imparts education, including vocational
  education."** No requirement of recognition, affiliation or establishment
  under law. So the live question is not whether we are a *recognised* school;
  it is whether we are an "institution of learning", whether students are
  "enrolled with" us, and whether the analytics serve "the educational
  activities of such institution". A direct-to-consumer signup is weak on
  "enrolled". A school-channel or co-branded deployment is a different
  question, and an open one.

  **The harder point, which cuts against us.** An exemption is only needed for
  conduct that would otherwise be prohibited. MeitY wrote entry 3 using the
  exact words "tracking and behavioural monitoring" for "educational
  activities" — which suggests the drafter assumed that tracking a child's
  learning *is* within s.9(3), or entry 3 would be surplusage. This is the
  strongest textual argument against the reading we would prefer, and the
  opinion should meet it directly.
- **Part B, purposes**: narrow and purpose-bound (safety, real-time location,
  age verification, welfare delivery). Commentary is consistent that these do
  not cover analytics, profiling or monetisation.

**Section 9(5)** is a second and more interesting route. Verbatim:

> "The Central Government may, if satisfied that a Data Fiduciary has ensured
> that its processing of personal data of children is done in a manner that is
> verifiably safe, notify for such processing by such Data Fiduciary the age
> above which that Data Fiduciary shall be exempt from the applicability of all
> or any of the obligations under sub-sections (1) and (3) in respect of
> processing by that Data Fiduciary as the notification may specify."

Two things worth noting from the text itself. It is **fiduciary-specific**, not
class-based: it speaks of "a Data Fiduciary" and "such Data Fiduciary"
throughout, so nothing on the face of it requires an industry-wide notification.
And there is **no minimum age floor** in the sub-section — no "not below 13" or
similar. (Thirteen is the GDPR Article 8 figure; it is not in this Act, and at
least one AI-generated analysis has asserted otherwise.) No notification under
s.9(5) exists as of September 2026, so nothing can be built on it yet. A product
with no ads, no trackers and no data sharing is a better candidate than most.
Worth asking about; it is a route, not a formality.

## Where we already stand, factually

These are verified properties of the current build, not aspirations:

- No advertising of any kind, and none planned.
- No third-party analytics or tracking scripts. Confirmed by inspecting the
  deployed pages; the PostHog keys that lingered in the Vercel environment were
  never referenced by any code and were deleted on 6 September 2026.
- No sale or sharing of personal data. The only third party reached is
  Anthropic, and only the text a user submits to an AI tool.
- Every student can export everything and delete their account unaided.
- Peer Heatmap already enforces a minimum cohort of three distinct students in
  SQL, so it reports aggregates and not individuals.

The parts most exposed to a broad reading of 9(3) are the Ledger Score itself,
Circadian, Mistake DNA and Peer Heatmap. That is the core of the product, which
is why this is a product question and not a compliance checkbox.

## What has been built

Groundwork only, deliberately (migration 0009):

- `profiles.date_of_birth`, so minor status is known rather than guessed from
  grade.
- `profiles.guardian_email` and a `parental_consents` table recording the
  verification **method** per consent, so adopting DigiLocker later does not
  invalidate earlier records.
- Nothing blocks a signup and nothing is emailed. The privacy policy states
  plainly that this is groundwork and does not claim compliance.

Rule 10 is less restrictive than first assumed, having now been read rather
than summarised. It requires "appropriate technical and organisational
measures" and due diligence that the person identifying as the parent is an
identifiable adult, by reference to **(a)** reliable identity and age details
already held by us, or **(b)** identity and age details voluntarily provided by
the individual or through a virtual token issued by an authorised entity. The
illustrations say a parent *"may voluntarily"* use a Digital Locker service
provider. DigiLocker is therefore one permitted route, expressly optional, and
not a precondition. Recording the verification **method** per consent, which
`parental_consents` already does, is the right shape for a rule that names
several.

## Questions for a lawyer

1. Does a student-facing study tracker, where the child enters their own data
   and only they see it, constitute "tracking or behavioural monitoring" under
   9(3)? This is the question that decides whether the product works as
   designed.
2. If it does, does anything in the Fourth Schedule reach a third-party edtech
   product, or is Part A confined to schools?
3. Is the Section 9(5) "verifiably safe" notification realistically available
   to a small operator, and what would it require?
4. Does Peer Heatmap's cohort comparison need separate treatment from the rest,
   given it compares a child against other children?
5. What discharges "verifiable" parental consent in practice before DigiLocker
   integration is feasible for a solo operator?

## Deadline

**13 May 2027.** Settled from Rule 1 rather than from commentary: Rules 3, 5 to
16, 22 and 23 come into force eighteen months after publication in the Official
Gazette, and publication was 13 November 2025 (G.S.R. 846(E)). Rules 10 and 12,
which carry the children's obligations and the Fourth Schedule exemptions, are
both in that group.

There is time, but question 1 should be answered before pricing or any
significant new analytics feature is built on top of the current design.
