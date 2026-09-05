# Ready-to-send enquiry to a data protection lawyer

Copy the email below, attach or paste `docs/dpdp-children.md`, send. It is
written to be answerable in one sitting, because a vague "is my app legal"
enquiry gets a vague and expensive answer.

---

**Subject:** DPDP s.9(3) opinion needed: does a student-facing study tracker
count as behavioural monitoring of children?

Hello,

I run StudyLedger (studyledger.in), a study-tracking web app for Indian school
and exam-prep students. I am the sole operator and the product is pre-revenue
and pre-launch. I need a scoped opinion on one issue under the Digital Personal
Data Protection Act, 2023, not a full compliance programme at this stage.

**What the product does.** A student signs up and logs their own study data:
past-paper attempts and scores, mistakes by topic, syllabus topics covered,
study sessions and habits, and upcoming deadlines. The app computes a single
"Ledger Score" out of 1000 from four weighted pillars, and tells the student
which topic to work on next. Some views analyse patterns in that data, for
example which hours of day the student answers most accurately, and which
mistake topics recur. There is one cohort feature that shows how often a topic
is struggled with across other users, aggregated and suppressed below three
distinct students.

**Relevant facts.** Because the audience is school students, the majority of
users are under 18. There is no advertising anywhere in the product and none
planned. There are no third-party analytics or tracking scripts. No personal
data is sold or shared, other than the text a user submits to an AI feature,
which is sent to Anthropic to generate that response. Every user can export all
their data and delete their account without contacting me. All the data
processed is entered by the student about themselves, and is shown back only to
that student.

**My concern.** Section 9(3) states that a Data Fiduciary "shall not undertake
tracking or behavioural monitoring of children or targeted advertising directed
at children." As I read it, that is a prohibition rather than a consent
requirement, so verifiable parental consent under 9(1) would not authorise it.
Neither "tracking" nor "behavioural monitoring" appears to be defined in the
Act.

**Questions.**

1. Does analysing a child's own self-entered study data, to produce a score and
   recommendations shown only to that child, amount to "tracking or behavioural
   monitoring" under s.9(3)? This determines whether the product works as
   designed.
2. If it does, does any entry in the Fourth Schedule to the DPDP Rules 2025
   reach a third-party edtech product, or is the "educational institution"
   class in Part A confined to schools and similar institutions?
3. Section 9(4) states that sub-sections (1) *and* (3) may be disapplied by
   prescribed rules, yet several commentaries describe the s.9(3) prohibition as
   absolute. Which is correct?
4. Is the s.9(5) route, where the Central Government may notify a relaxed age
   threshold for a fiduciary whose processing of children's data is "verifiably
   safe", realistically available to a small operator, and what would it
   require?
5. Does the aggregated cohort comparison feature need separate treatment from
   the rest, given it compares one child's difficulty with a topic against
   other children?
6. Ahead of any DigiLocker-based verification being practical for a solo
   operator, what would discharge the "verifiable" element of parental consent
   under Rule 10?

I have attached a short technical note setting out the architecture, what is
already built, and what is deliberately not built yet.

Please could you confirm whether this is work you take on, an estimate of fees
for a written opinion on the above, and your expected turnaround.

Thank you,
Aryamman Ojha
hello@studyledger.in
studyledger.in

---

## Where to send it

Look for a **data protection / privacy practice**, not a general corporate
lawyer, and preferably one that lists DPDP work for startups. Publicly listed
starting points include Ahlawat & Associates, LegaLogic and Escalade Legal.
Send to two or three and compare scope and fee before instructing anyone, since
this is a bounded opinion rather than an ongoing engagement.

If cost is a barrier, say so explicitly in the first email and ask for a fixed
fee for a written opinion limited to question 1 alone. Question 1 is the one
that changes what gets built; the rest can wait.

## Sense of scale

Published estimates put substantive DPDP compliance for a startup under ten
thousand users at under ₹50,000 a year, rising into lakhs at larger user
counts. A single scoped opinion should sit well below that. Treat these as
orientation only, not quotes.

## On the deadline

Sources differ between 13 and 14 May 2027 for when substantive obligations
become enforceable. The difference does not matter for planning; treat it as
mid-May 2027 and do not rely on the last week either way.
