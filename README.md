# Iceland Itinerary Studio

A static itinerary maker designed for GitHub Pages. It stores trips in the browser and supports:

- Locations, dates, times, durations, notes, and attachments
- Timeline, calendar, and infographic trip-board views
- Paired US/Iceland timezone displays
- JSON import/export, `.ics` calendar export, print, and shareable URL snapshots

## Publish On GitHub Pages

1. Create a public GitHub repository.
2. Upload everything in this folder to the repository root, keeping `index.html` at the top level.
3. Go to **Settings** -> **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your main branch and `/(root)`, then click **Save**.
6. Open the Pages URL GitHub gives you after the deployment finishes.

Because this is static HTML/CSS/JS, there is no build step. The included `.nojekyll` file keeps GitHub Pages from running a Jekyll build over the app files.
