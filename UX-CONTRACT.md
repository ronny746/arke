# UX Contract

## Product context

- Audience: Students, parents, teachers, and super administrators of ARKE.
- Primary jobs: Learn, monitor a child, operate a batch, and administer institute workflows.
- Target market(s): India.
- Active locales: English; India date/fee formatting.
- Accessibility target: WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Portal requirements | `/Users/rohitrana/Downloads/ARKE_Portal_Requirements.pdf` | Approved requirements | 2026-09-30 |
| Roles and authorization | `server/config/constants.js`, `server/middlewares/rbac.middleware.js` | Server contract | 2026-09-30 |
| Payment fulfillment | `server/modules/payments/payments.service.js` | Server contract | 2026-09-30 |

## Visual contract

- Project `DESIGN.md`: `DESIGN.md`.
- Token ownership model: existing runtime CSS/Tailwind is canonical.
- Runtime design-system/token source: `src/app/globals.css`, `tailwind.config.js`.
- Supported themes: light and dark where already implemented.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | React Hook Form/manual validated forms | shared form classes | create / edit | browser validation |
| Student sign-in | Mobile number + 6-digit OTP | `LoginModal` and auth OTP routes | Student only; resend is available | mobile number, OTP and expiry handling |
| Parent sign-in date | Native `input[type=date]` for linked-child DOB | `LoginModal` | Parent only; platform calendar is intentional | desktop and mobile picker |
| Scrollbar | `src/app/globals.css` | global stylesheet | geometry exceptions | computed style |
| Toast | `react-hot-toast` | existing provider usage | success / warning / info / error | live-region test |
| CRUD | API service modules | route/controller/service | return / stay | API integration |
| Behavioural leads | `/admin/leads` | `GET /leads/logged-in-without-course` | read-only automatic queue | API integration |
| Mentor session scheduling | `/admin/mentor-sessions` | operations service + notification service | target one course or one batch | API integration + socket room |
| Announcement delivery | `/admin/notifications` | notification service + FCM device registry | all students, all parents, one batch/family, individual | API integration + FCM acceptance test |

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Course purchase | Payment gateway callback | Gateway state | Student portal | Enrollment notification | Retry payment without duplicate enrollment | Portal content | payments service |
| Submit exam | Student submit action | Submit disabled | Exam analysis | Topic flags/remedial count | Retain answers on failure | Analysis heading | exam controller |
| Mark attendance | Teacher attendance action | Save state | Attendance list | In-app absence notice | Correct and resubmit | Attendance table | attendance service |
| Suspend student | Super-admin action | Save state | Student record | End-date confirmation | Correct end date | Record heading | users service |
| Schedule mentor session | Admin submit | Button disabled | Mentor sessions table | Student inbox notifications created | Preserve inputs and show server conflict/validation error | First invalid field | operations service |
| Send announcement | Admin submit | Button disabled | Stay on composer | Persistent inbox, realtime event and FCM push | Preserve message and target; explain validation failure | First invalid field | notifications service |

## Async and resilience

- Mutations are pessimistic.
- Course fulfillment and welcome notifications are idempotent by enrollment/notification lookup.
- Session expiry requires sign-in again.

## Verification

- Static commands: `node --test`, `node --check`, `npm run build`.
- API integration requires a MongoDB-backed environment with payment gateway credentials intentionally stubbed.
