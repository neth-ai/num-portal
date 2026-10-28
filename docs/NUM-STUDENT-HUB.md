# NUM Student Hub preview

The student information page runs on http://localhost:3002 (`devops`) and http://localhost:3001 (`manual`). `SITE_EXPERIENCE=student-hub` enables it for these Compose services. Staging retains its existing experience.

From the repository root:

```bash
docker compose --env-file .local-env/.env up -d --no-deps --build devops manual
```

Source: `apps/sme-app/src/components/StudentHub.tsx` and `StudentHub.module.css`.

Student Hub icons use the installed free Font Awesome SVG packages (`@fortawesome/react-fontawesome`, `@fortawesome/fontawesome-svg-core`, and `@fortawesome/free-solid-svg-icons`). The Next.js layout loads Font Awesome's stylesheet and disables automatic CSS insertion, so icons work in Docker and without a CDN connection.

Features include searchable program cards, category filters, four selectable learning years, student resource links, CSS perspective animation, animation pause and reduced-motion support. The layout adapts to mobile screens. An interactive learning lab adds an animated 3D laptop, lesson board, books and switchable Code, Design and Collaborate illustrations. Both pause controls stop all animations, and reduced-motion preferences disable animation. The lab is an illustrative classroom concept, not a live class feed.

The pipeline section follows the repository's current `dev/* → staging → main` policy and CI jobs: validate, test, build, automatic staging deployment and a manually started production deployment. The thesis section shows the planned S1–S5 comparison of Method A and Method B, evidence capture, validation and analysis. Both diagrams have selectable steps and animated progress; they show process, not measured results.

Program references: https://fit.num.edu.kh/ and https://fde.num.edu.kh/about-fde/. Subject tags and year-by-year learning steps are editorial examples, visibly labelled on the page, not an official curriculum or class timetable. Obtain faculty-approved subjects and lesson dates before presenting an actual timetable.

Health checks retain existing content validation and return the student hub title for this experience. Local content files are still required by the existing deployment health contract.
