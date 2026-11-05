# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Manager access for agenda creators: a 256-bit token stored only as a hash,
  kept in an httpOnly cookie, with a private link (code in the URL fragment)
  to manage from another device and an option to forget access.
- Managers can set the final time from voting results, change it, reopen
  voting, or delete the agenda permanently.
- Agenda status (voting, scheduled, done, expired) with a step indicator.
- Attendance confirmation (ready check): yes, maybe, or no, changeable from
  the same browser.
- Optional party size that caps "yes" answers.
- Participants can remove their own name, votes, and attendance.
- Automatic deletion of expired agendas (`RETENTION_DAYS`, default 30).
- Calendar export (`.ics`) and Google Calendar link for the final time.
- Share panel: copy link, native share sheet, WhatsApp, and Telegram.
- Countdown to the final time and times shown in the viewer's time zone.
- Device time zone preselected on the agenda form.
- Open Graph link previews with a self-hosted image.
- Lobby-themed interface with light/dark themes, self-hosted display font,
  and accessibility improvements.
- Test suite (`node:test`), ESLint, GitHub Actions CI with `npm audit`, and
  Dependabot.
- Environment-based configuration documented in `.env.example`.
- SECURITY.md, CONTRIBUTING.md, and issue/PR templates.

### Security

- Strict Content-Security-Policy and security headers via Helmet.
- CSRF protection for every form (signed double-submit token plus
  Sec-Fetch-Site/Origin checks).
- Rate limiting for agenda creation, voting/attendance, and manager actions.
- Control and bidirectional-override characters stripped from text input.
- Share and calendar links use `PUBLIC_URL` instead of the Host header;
  `TRUST_PROXY` controls proxy trust.
- Secure cookies in production, `__Host-` prefixed CSRF cookie, and
  `no-store` caching for dynamic pages.
- SQLite `secure_delete` enabled; `/health` no longer reports uptime.

### Changed

- The Express app is created by `createApp()` for testability; routes are
  built per app instance.

## [0.1.0]

### Added

- Express server with EJS pages and a `/health` endpoint.
- Agenda creation with 2–10 time options in WIB, WITA, or WIT.
- Voting on time options, identified by a random per-agenda participant
  token stored as a hash.
