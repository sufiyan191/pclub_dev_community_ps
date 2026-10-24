# pclub_dev_community_ps

- Create client using Next.js (npx create-next-app@latest client — select Tailwind CSS and App Router)

- Create server using `npm init -y` and install core packages: `express`, `cors`, `dotenv`, `pg`(I will prefer writing raw SQL queries with `pg`.)

## Spatial UI:
# UI States

| State | Left Dock Area | Center Stage Panel (Flat, Main Focus) | Right Wing Panel (3D Tilted, `rotateY(-12deg)`) |
|---|---|---|---|
| **State 1: Server Selected** | Primary Dock + Expanded Server Logos Bar | **Groups & Posts View:** lists all Groups (e.g., `#react-help`, `#cpp-dsa`, `#general`) and their Question/Post cards inside the selected Server | **Server Pulse / Directory:** online members in that server, trending tags, recent activity |
| **State 2: Group / Post Clicked** | Primary Dock + Server Logos Bar (unchanged) | **Groups & Posts View** stays in place so you can keep browsing | **Group Chat & Thread Panel:** appears on the tilted right panel, showing people chatting or answering inside that Group or Post thread |
| **State 3: Right Panel Clicked (Focus Swap)** | Primary Dock + Server Logos Bar + **Collapsed Groups Monogram Bar** (the old center panel shrinks into a compact vertical bar) | **Group Chat & Thread Panel** glides to center stage with a wide view for writing Markdown/code blocks, upvoting/downvoting, and marking an Accepted Answer | **Optional:** thread details, pinned code snippets, or a User Profile card for the person you click on |

## Transitions

| Transition | What moves |
|---|---|
| State 1 → State 2 | Right panel content swaps from Server Pulse to Group Chat & Thread; center is untouched |
| State 2 → State 3 | Right panel glides to center (loses its tilt and becomes flat); the old center panel collapses into the left monogram bar; the right wing becomes a contextual detail panel |